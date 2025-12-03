/**
 * VisionPoseModule.swift
 * Expo Module interface for VisionPose detector
 *
 * Bridges Swift Vision Framework to React Native via Expo Modules Core
 * Provides EventEmitter for real-time pose data streaming
 *
 * Part of VisionForm - AI-Powered Workout Form Analyzer
 */

import ExpoModulesCore
import Foundation
import AVFoundation
import CoreMedia

public class VisionPoseModule: Module {

    // MARK: - Properties

    /// The core Vision Framework detector
    private var detector: VisionPoseDetector?

    /// Serial queue for module operations
    private let moduleQueue = DispatchQueue(label: "com.visionform.module", qos: .userInitiated)

    /// Tracks if module is initialized
    private var isInitialized = false

    // MARK: - Module Definition

    public func definition() -> ModuleDefinition {

        // Module name exposed to JavaScript as NativeModules.VisionPose
        Name("VisionPose")

        // Events this module can emit to JavaScript
        Events("onPoseDetected", "onError", "onStatusChange")

        // MARK: - Lifecycle Functions

        /// Initialize the Vision Framework detector
        Function("initialize") { () -> [String: Any] in
            return self.initializeDetector()
        }

        /// Start pose detection
        /// - Parameters:
        ///   - fps: Target frames per second (e.g., 30)
        ///   - minConfidence: Minimum confidence threshold (0.0 - 1.0, e.g., 0.5)
        Function("startDetection") { (fps: Int, minConfidence: Double) -> [String: Any] in
            return self.startDetection(fps: fps, minConfidence: Float(minConfidence))
        }

        /// Stop pose detection
        Function("stopDetection") { () -> [String: Any] in
            return self.stopDetection()
        }

        /// Pause pose detection
        Function("pauseDetection") { () -> [String: Any] in
            guard let detector = self.detector else {
                return ["success": false, "error": "Detector not initialized"]
            }
            detector.pause()
            self.sendEvent("onStatusChange", ["isRunning": false, "isPaused": true])
            return ["success": true, "message": "Detection paused"]
        }

        /// Resume pose detection
        Function("resumeDetection") { () -> [String: Any] in
            guard let detector = self.detector else {
                return ["success": false, "error": "Detector not initialized"]
            }
            detector.resume()
            self.sendEvent("onStatusChange", ["isRunning": true, "isPaused": false])
            return ["success": true, "message": "Detection resumed"]
        }

        // MARK: - Configuration Functions

        /// Update target FPS dynamically
        /// - Parameter fps: New target frames per second
        Function("setTargetFPS") { (fps: Int) -> [String: Any] in
            guard let detector = self.detector else {
                return ["success": false, "error": "Detector not initialized"]
            }
            detector.setTargetFPS(fps)
            return ["success": true, "message": "Target FPS updated to \(fps)"]
        }

        /// Update minimum confidence threshold
        /// - Parameter confidence: New minimum confidence (0.0 - 1.0)
        Function("setMinConfidence") { (confidence: Double) -> [String: Any] in
            guard let detector = self.detector else {
                return ["success": false, "error": "Detector not initialized"]
            }
            detector.setMinConfidence(Float(confidence))
            return ["success": true, "message": "Min confidence updated to \(confidence)"]
        }

        // MARK: - Status Functions

        /// Get current detection status
        Function("getStatus") { () -> [String: Any] in
            guard let detector = self.detector else {
                return [
                    "isInitialized": false,
                    "isRunning": false
                ]
            }
            var status = detector.getStatus()
            status["isInitialized"] = self.isInitialized
            return status
        }

        // MARK: - Frame Processing Functions

        /// Process a single frame from external source
        /// This is a hook for future integration with react-native-vision-camera
        /// - Parameter frameData: Dictionary containing frame information
        Function("processFrame") { (frameData: [String: Any]) -> [String: Any] in
            // Placeholder for frame processor integration
            // Will be implemented when integrating with react-native-vision-camera
            return [
                "success": false,
                "message": "Direct frame processing not yet implemented. Use camera integration."
            ]
        }

        // MARK: - Module Lifecycle

        /// Called when module loads
        OnCreate {
            print("[VisionPoseModule] Module created")
        }

        /// Called when module is about to be destroyed
        OnDestroy {
            print("[VisionPoseModule] Module destroying, cleaning up...")
            self.cleanup()
        }
    }

    // MARK: - Implementation

    /// Initialize the Vision Framework detector
    private func initializeDetector() -> [String: Any] {
        return moduleQueue.sync {
            if isInitialized {
                return [
                    "success": true,
                    "message": "Already initialized",
                    "wasAlreadyInitialized": true
                ]
            }

            // Create detector instance
            detector = VisionPoseDetector()

            // Set up callbacks
            detector?.onPoseDetected = { [weak self] pose in
                self?.handlePoseDetected(pose)
            }

            detector?.onError = { [weak self] error in
                self?.handleError(error)
            }

            isInitialized = true

            print("[VisionPoseModule] Detector initialized successfully")

            return [
                "success": true,
                "message": "VisionPoseDetector initialized",
                "version": "1.0.0",
                "supportedRevision": "VNDetectHumanBodyPoseRequestRevision1"
            ]
        }
    }

    /// Start detection
    private func startDetection(fps: Int, minConfidence: Float) -> [String: Any] {
        return moduleQueue.sync {
            guard isInitialized, let detector = detector else {
                return [
                    "success": false,
                    "error": "VisionPose not initialized. Call initialize() first."
                ]
            }

            // Validate parameters
            guard fps > 0 && fps <= 60 else {
                return [
                    "success": false,
                    "error": "Invalid FPS. Must be between 1 and 60."
                ]
            }

            guard minConfidence >= 0.0 && minConfidence <= 1.0 else {
                return [
                    "success": false,
                    "error": "Invalid minConfidence. Must be between 0.0 and 1.0."
                ]
            }

            // Start detector
            detector.start(fps: fps, minConfidence: minConfidence)

            // Emit status change event
            sendEvent("onStatusChange", [
                "isRunning": true,
                "fps": fps,
                "minConfidence": minConfidence
            ])

            print("[VisionPoseModule] Detection started at \(fps) FPS, min confidence: \(minConfidence)")

            return [
                "success": true,
                "message": "Detection started",
                "fps": fps,
                "minConfidence": minConfidence
            ]
        }
    }

    /// Stop detection
    private func stopDetection() -> [String: Any] {
        guard let detector = detector else {
            return [
                "success": false,
                "error": "Detector not initialized"
            ]
        }

        detector.stop()

        // Emit status change event
        sendEvent("onStatusChange", [
            "isRunning": false
        ])

        print("[VisionPoseModule] Detection stopped")

        return [
            "success": true,
            "message": "Detection stopped"
        ]
    }

    // MARK: - Event Handlers

    /// Handle pose detected from Vision Framework
    /// Converts to dictionary and emits to JavaScript
    private func handlePoseDetected(_ pose: VisionPose) {
        let poseDict = pose.toDictionary()
        sendEvent("onPoseDetected", poseDict)
    }

    /// Handle error from Vision Framework
    private func handleError(_ error: String) {
        print("[VisionPoseModule] Error: \(error)")
        sendEvent("onError", [
            "error": error,
            "timestamp": Date().timeIntervalSince1970
        ])
    }

    // MARK: - Cleanup

    /// Clean up resources
    private func cleanup() {
        moduleQueue.sync {
            detector?.stop()
            detector = nil
            isInitialized = false
            print("[VisionPoseModule] Cleaned up detector resources")
        }
    }
}

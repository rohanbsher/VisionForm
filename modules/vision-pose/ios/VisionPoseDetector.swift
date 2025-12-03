/**
 * VisionPoseDetector.swift
 * Core Vision Framework integration for real-time pose detection
 *
 * Features:
 * - 3-queue threading architecture (session, video, vision)
 * - Adaptive 30 FPS throttling
 * - 19 keypoint detection with confidence filtering
 * - Memory-efficient frame processing
 *
 * Part of VisionForm - AI-Powered Workout Form Analyzer
 */

import Foundation
import Vision
import AVFoundation
import CoreMedia

/// Core pose detection class using Apple Vision Framework
class VisionPoseDetector: NSObject {

    // MARK: - Threading Queues

    /// Serial queue for session management (start/stop/configure)
    private let sessionQueue = DispatchQueue(label: "com.visionform.pose.session", qos: .userInitiated)

    /// Serial queue for video frame processing
    private let videoQueue = DispatchQueue(label: "com.visionform.pose.video", qos: .userInitiated)

    /// Concurrent queue for Vision Framework requests
    private let visionQueue = DispatchQueue(label: "com.visionform.pose.vision", qos: .userInitiated, attributes: .concurrent)

    // MARK: - Camera Session Properties

    /// AVCaptureSession for camera input
    private var captureSession: AVCaptureSession?

    /// Video data output for frame processing
    private var videoDataOutput: AVCaptureVideoDataOutput?

    // MARK: - Vision Framework Properties

    /// Vision 2D pose detection request
    private var poseRequest: VNDetectHumanBodyPoseRequest?

    /// Vision 3D pose detection request (iOS 17+)
    @available(iOS 17.0, *)
    private var poseRequest3D: VNDetectHumanBodyPose3DRequest? {
        get { _poseRequest3D as? VNDetectHumanBodyPose3DRequest }
        set { _poseRequest3D = newValue }
    }
    private var _poseRequest3D: Any?

    /// Whether to use 3D pose detection (iOS 17+)
    private var use3DPose: Bool = false

    /// Current detection configuration
    private var config: DetectionConfig = .default

    /// Current detection state
    private var state: DetectionState = .idle

    // MARK: - Frame Throttling Properties

    /// Timestamp of last processed frame
    private var lastProcessedTime: TimeInterval = 0

    /// Target interval between frames (1/FPS)
    private var targetFrameInterval: TimeInterval = 1.0 / 30.0

    /// Frame counter for debugging
    private var processedFrameCount: Int = 0

    // MARK: - Callbacks

    /// Called when a pose is detected
    var onPoseDetected: ((VisionPose) -> Void)?

    /// Called when an error occurs
    var onError: ((String) -> Void)?

    // MARK: - Initialization

    override init() {
        super.init()
        setupVisionRequest()
    }

    /// Initialize Vision Framework pose detection request
    /// Uses 3D pose detection on iOS 17+, falls back to 2D on older versions
    private func setupVisionRequest() {
        if #available(iOS 17.0, *) {
            // Use 3D pose detection on iOS 17+
            poseRequest3D = VNDetectHumanBodyPose3DRequest()
            use3DPose = true
            print("[VisionPoseDetector] Using 3D pose detection (iOS 17+)")
        } else {
            // Fall back to 2D for older iOS
            poseRequest = VNDetectHumanBodyPoseRequest()
            poseRequest?.revision = VNDetectHumanBodyPoseRequestRevision1
            use3DPose = false
            print("[VisionPoseDetector] Using 2D pose detection (iOS 14-16)")
        }
    }

    // MARK: - Frame Processing

    /// Process a camera frame for pose detection
    /// - Parameter sampleBuffer: CMSampleBuffer from camera
    func processFrame(_ sampleBuffer: CMSampleBuffer) {
        // Check if detection is active
        guard state.isActive else {
            return
        }

        // Adaptive FPS throttling
        let currentTime = CACurrentMediaTime()
        let elapsed = currentTime - lastProcessedTime

        guard elapsed >= targetFrameInterval else {
            return // Skip frame to maintain target FPS
        }

        lastProcessedTime = currentTime

        // Extract pixel buffer from sample
        guard let pixelBuffer = CMSampleBufferGetImageBuffer(sampleBuffer) else {
            onError?("Failed to extract pixel buffer from camera frame")
            return
        }

        // Process on vision queue
        processPixelBuffer(pixelBuffer)
    }

    /// Process a pixel buffer for pose detection
    /// - Parameter pixelBuffer: CVPixelBuffer containing the image
    private func processPixelBuffer(_ pixelBuffer: CVPixelBuffer) {
        // Create Vision request handler
        let handler = VNImageRequestHandler(
            cvPixelBuffer: pixelBuffer,
            orientation: .up,
            options: [:]
        )

        // Perform detection on vision queue
        visionQueue.async { [weak self] in
            guard let self = self else { return }

            do {
                // Use 3D pose detection on iOS 17+, otherwise 2D
                if #available(iOS 17.0, *), self.use3DPose, let request3D = self.poseRequest3D {
                    try handler.perform([request3D])
                    self.handle3DDetectionResults(request3D.results)
                } else if let request = self.poseRequest {
                    try handler.perform([request])
                    self.handleDetectionResults(request.results)
                }

                // Increment frame counter
                self.processedFrameCount += 1

            } catch {
                self.onError?("Vision request failed: \(error.localizedDescription)")
            }
        }
    }

    // MARK: - Result Processing

    /// Handle Vision Framework detection results
    /// - Parameter results: Array of detection results
    private func handleDetectionResults(_ results: [Any]?) {
        guard let observations = results as? [VNHumanBodyPoseObservation],
              let observation = observations.first else {
            // No body detected - this is normal, not an error
            return
        }

        // Filter by overall confidence
        guard observation.confidence >= config.minConfidence else {
            if config.enableDebugLogging {
                print("[VisionPoseDetector] Skipping low confidence pose: \(observation.confidence)")
            }
            return
        }

        // Convert all 19 keypoints
        var keypoints: [VisionKeypoint] = []

        for jointName in KeypointName.all {
            do {
                let joint = try observation.recognizedPoint(jointName)

                // Filter low confidence keypoints
                guard joint.confidence >= config.minConfidence else {
                    continue
                }

                // Create keypoint with Vision Framework data
                let keypoint = VisionKeypoint(
                    name: KeypointName.from(joint: jointName),
                    point: joint
                )

                keypoints.append(keypoint)

            } catch {
                // Joint not detected - skip silently
                continue
            }
        }

        // Only emit pose if we have enough keypoints
        guard keypoints.count >= 5 else {
            if config.enableDebugLogging {
                print("[VisionPoseDetector] Insufficient keypoints: \(keypoints.count)")
            }
            return
        }

        // Create pose result
        let pose = VisionPose(
            keypoints: keypoints,
            timestamp: CACurrentMediaTime(),
            overallConfidence: Double(observation.confidence)
        )

        // Callback on main thread for React Native bridge
        DispatchQueue.main.async {
            self.onPoseDetected?(pose)
        }

        if config.enableDebugLogging && processedFrameCount % 30 == 0 {
            print("[VisionPoseDetector] Pose detected: \(keypoints.count) keypoints, confidence: \(observation.confidence)")
        }
    }

    /// Handle 3D pose detection results (iOS 17+)
    /// - Parameter results: Array of 3D pose observations
    @available(iOS 17.0, *)
    private func handle3DDetectionResults(_ results: [Any]?) {
        guard let observations = results as? [VNHumanBodyPose3DObservation],
              let observation = observations.first else {
            // No body detected - this is normal, not an error
            return
        }

        // Filter by overall confidence
        guard observation.bodyHeight > 0 else {
            if config.enableDebugLogging {
                print("[VisionPoseDetector] 3D: Skipping invalid pose")
            }
            return
        }

        // Convert all 3D keypoints
        var keypoints: [VisionKeypoint] = []

        for jointName in KeypointName.all3D {
            do {
                let joint = try observation.recognizedPoint(jointName)

                // 3D positions are stored as simd_float4x4 transformation matrices
                // The translation (position) is in the 4th column (columns.3)
                let position = joint.position
                let x = Double(position.columns.3.x)
                let y = Double(position.columns.3.y)
                let z = Double(position.columns.3.z)

                // Create keypoint with 3D coordinates
                let keypoint = VisionKeypoint(
                    name: KeypointName.from3D(joint: jointName),
                    x: x,
                    y: y,
                    z: z,  // Include z-coordinate for 3D!
                    confidence: 1.0  // 3D poses don't have per-joint confidence
                )

                keypoints.append(keypoint)

            } catch {
                // Joint not detected - skip silently
                continue
            }
        }

        // Only emit pose if we have enough keypoints
        guard keypoints.count >= 5 else {
            if config.enableDebugLogging {
                print("[VisionPoseDetector] 3D: Insufficient keypoints: \(keypoints.count)")
            }
            return
        }

        // Create 3D pose result
        let pose = VisionPose(
            keypoints: keypoints,
            timestamp: CACurrentMediaTime(),
            overallConfidence: 1.0,  // 3D poses are generally high confidence
            is3D: true  // Mark as 3D pose
        )

        // Callback on main thread for React Native bridge
        DispatchQueue.main.async {
            self.onPoseDetected?(pose)
        }

        if config.enableDebugLogging && processedFrameCount % 30 == 0 {
            print("[VisionPoseDetector] 3D Pose detected: \(keypoints.count) keypoints")
        }
    }

    // MARK: - Lifecycle Management

    /// Start pose detection
    /// - Parameters:
    ///   - fps: Target frames per second (default: 30)
    ///   - minConfidence: Minimum confidence threshold (default: 0.5)
    func start(fps: Int = 30, minConfidence: Float = 0.5) {
        sessionQueue.async { [weak self] in
            guard let self = self else { return }

            // Update configuration
            self.config = DetectionConfig(
                targetFPS: fps,
                minConfidence: minConfidence,
                enableDebugLogging: true // ENABLED for debugging
            )

            self.targetFrameInterval = 1.0 / Double(fps)
            self.state = .running
            self.lastProcessedTime = 0 // Reset timestamp
            self.processedFrameCount = 0 // Reset counter

            print("[VisionPoseDetector] Started detection at \(fps) FPS, min confidence: \(minConfidence)")

            // Setup and start camera session
            self.setupCameraSession()
        }
    }

    /// Stop pose detection
    func stop() {
        sessionQueue.async { [weak self] in
            guard let self = self else { return }

            self.state = .idle
            self.lastProcessedTime = 0

            print("[VisionPoseDetector] Stopped detection. Processed \(self.processedFrameCount) frames.")

            // Stop camera session
            self.stopCameraSession()
        }
    }

    /// Pause pose detection (preserves state)
    func pause() {
        sessionQueue.async { [weak self] in
            guard let self = self else { return }
            self.state = .paused
            print("[VisionPoseDetector] Paused detection")
        }
    }

    /// Resume pose detection
    func resume() {
        sessionQueue.async { [weak self] in
            guard let self = self else { return }
            guard self.state == .paused else { return }

            self.state = .running
            self.lastProcessedTime = CACurrentMediaTime() // Reset to avoid backlog
            print("[VisionPoseDetector] Resumed detection")
        }
    }

    // MARK: - Configuration Updates

    /// Update target FPS dynamically
    /// - Parameter fps: New target frames per second
    func setTargetFPS(_ fps: Int) {
        sessionQueue.async { [weak self] in
            guard let self = self else { return }
            self.config = DetectionConfig(
                targetFPS: fps,
                minConfidence: self.config.minConfidence,
                enableDebugLogging: self.config.enableDebugLogging
            )
            self.targetFrameInterval = 1.0 / Double(fps)
            print("[VisionPoseDetector] Updated target FPS to \(fps)")
        }
    }

    /// Update minimum confidence threshold
    /// - Parameter confidence: New minimum confidence (0.0 - 1.0)
    func setMinConfidence(_ confidence: Float) {
        sessionQueue.async { [weak self] in
            guard let self = self else { return }
            self.config = DetectionConfig(
                targetFPS: self.config.targetFPS,
                minConfidence: confidence,
                enableDebugLogging: self.config.enableDebugLogging
            )
            print("[VisionPoseDetector] Updated min confidence to \(confidence)")
        }
    }

    // MARK: - Status Reporting

    /// Get current detection status
    /// - Returns: Dictionary with status information
    func getStatus() -> [String: Any] {
        return sessionQueue.sync {
            return [
                "isRunning": state.isActive,
                "targetFPS": config.targetFPS,
                "minConfidence": config.minConfidence,
                "processedFrames": processedFrameCount,
                "state": String(describing: state)
            ]
        }
    }

    // MARK: - Camera Session Management

    /// Setup and configure AVCaptureSession for camera input
    private func setupCameraSession() {
        sessionQueue.async { [weak self] in
            guard let self = self else { return }

            // Create capture session
            let session = AVCaptureSession()
            session.beginConfiguration()

            // Set session preset for pose detection (720p is optimal)
            if session.canSetSessionPreset(.hd1280x720) {
                session.sessionPreset = .hd1280x720
            } else {
                session.sessionPreset = .medium
            }

            // Get front camera device
            guard let videoDevice = AVCaptureDevice.default(
                .builtInWideAngleCamera,
                for: .video,
                position: .front
            ) else {
                self.onError?("Failed to access front camera")
                return
            }

            // Create camera input
            guard let videoDeviceInput = try? AVCaptureDeviceInput(device: videoDevice),
                  session.canAddInput(videoDeviceInput) else {
                self.onError?("Failed to create camera input")
                return
            }
            session.addInput(videoDeviceInput)

            // Create video data output
            let dataOutput = AVCaptureVideoDataOutput()
            dataOutput.videoSettings = [
                kCVPixelBufferPixelFormatTypeKey as String: kCVPixelFormatType_32BGRA
            ]
            dataOutput.alwaysDiscardsLateVideoFrames = true
            dataOutput.setSampleBufferDelegate(self, queue: self.videoQueue)

            guard session.canAddOutput(dataOutput) else {
                self.onError?("Failed to add video output")
                return
            }
            session.addOutput(dataOutput)

            // Configure video orientation
            if let connection = dataOutput.connection(with: .video) {
                if connection.isVideoOrientationSupported {
                    connection.videoOrientation = .portrait
                }
                // Mirror for front camera
                if connection.isVideoMirroringSupported {
                    connection.isVideoMirrored = true
                }
            }

            session.commitConfiguration()

            // Store references
            self.captureSession = session
            self.videoDataOutput = dataOutput

            // Start the session
            session.startRunning()

            print("[VisionPoseDetector] Camera session started at 720p")
        }
    }

    /// Stop and cleanup camera session
    private func stopCameraSession() {
        sessionQueue.async { [weak self] in
            guard let self = self else { return }

            self.captureSession?.stopRunning()
            self.captureSession = nil
            self.videoDataOutput = nil

            print("[VisionPoseDetector] Camera session stopped")
        }
    }

    // MARK: - Memory Management

    deinit {
        stop()
        stopCameraSession()
        poseRequest = nil
        onPoseDetected = nil
        onError = nil
        print("[VisionPoseDetector] Deinitialized")
    }
}

// MARK: - AVCaptureVideoDataOutputSampleBufferDelegate

extension VisionPoseDetector: AVCaptureVideoDataOutputSampleBufferDelegate {
    /// Called when a new video frame is available
    func captureOutput(
        _ output: AVCaptureOutput,
        didOutput sampleBuffer: CMSampleBuffer,
        from connection: AVCaptureConnection
    ) {
        // Forward frame to pose detection pipeline
        processFrame(sampleBuffer)
    }

    /// Called when a video frame is dropped
    func captureOutput(
        _ output: AVCaptureOutput,
        didDrop sampleBuffer: CMSampleBuffer,
        from connection: AVCaptureConnection
    ) {
        // Frames may be dropped if processing can't keep up
        // This is normal and expected for 30 FPS target
    }
}


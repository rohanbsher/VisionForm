/**
 * VisionPoseTypes.swift
 * Data structures for Vision Framework pose detection
 *
 * Part of VisionForm - AI-Powered Workout Form Analyzer
 */

import Foundation
import Vision
import CoreGraphics

// MARK: - Keypoint

/// Represents a single detected body keypoint
struct VisionKeypoint: Codable {
    let name: String
    let x: Double
    let y: Double
    let z: Double?      // NEW: Optional z-coordinate for 3D poses (iOS 17+)
    let confidence: Double

    /// Initialize from Vision Framework 2D recognized point
    init(name: String, point: VNRecognizedPoint) {
        self.name = name
        self.x = Double(point.location.x)
        self.y = Double(point.location.y)
        self.z = nil    // No z-coordinate for 2D poses
        self.confidence = Double(point.confidence)
    }

    /// Initialize with explicit values (2D)
    init(name: String, x: Double, y: Double, confidence: Double) {
        self.name = name
        self.x = x
        self.y = y
        self.z = nil
        self.confidence = confidence
    }

    /// Initialize with explicit values including z (3D)
    init(name: String, x: Double, y: Double, z: Double?, confidence: Double) {
        self.name = name
        self.x = x
        self.y = y
        self.z = z
        self.confidence = confidence
    }
}

// MARK: - Pose

/// Complete pose detection result with all keypoints
struct VisionPose: Codable {
    let keypoints: [VisionKeypoint]
    let timestamp: Double
    let overallConfidence: Double
    let is3D: Bool      // NEW: Flag indicating 3D pose data available (iOS 17+)

    /// Initialize 2D pose (default, backwards compatible)
    init(keypoints: [VisionKeypoint], timestamp: Double, overallConfidence: Double) {
        self.keypoints = keypoints
        self.timestamp = timestamp
        self.overallConfidence = overallConfidence
        self.is3D = false
    }

    /// Initialize with explicit 3D flag
    init(keypoints: [VisionKeypoint], timestamp: Double, overallConfidence: Double, is3D: Bool) {
        self.keypoints = keypoints
        self.timestamp = timestamp
        self.overallConfidence = overallConfidence
        self.is3D = is3D
    }

    /// Convert to dictionary for JavaScript bridge
    func toDictionary() -> [String: Any] {
        return [
            "keypoints": keypoints.map { kp in
                var dict: [String: Any] = [
                    "name": kp.name,
                    "x": kp.x,
                    "y": kp.y,
                    "confidence": kp.confidence
                ]
                // Include z-coordinate if available (3D poses)
                if let z = kp.z {
                    dict["z"] = z
                }
                return dict
            },
            "timestamp": timestamp,
            "overallConfidence": overallConfidence,
            "is3D": is3D
        ]
    }
}

// MARK: - Detection Configuration

/// Configuration for pose detection
struct DetectionConfig {
    let targetFPS: Int
    let minConfidence: Float
    let enableDebugLogging: Bool

    static let `default` = DetectionConfig(
        targetFPS: 30,
        minConfidence: 0.5,
        enableDebugLogging: false
    )
}

// MARK: - Detection State

/// Current state of the pose detector
enum DetectionState: Equatable {
    case idle
    case running
    case paused
    case error(String)

    var isActive: Bool {
        return self == .running
    }
}

// MARK: - Keypoint Mapping

/// Maps Vision Framework joint names to VisionForm keypoint names
enum KeypointName {
    /// Convert 2D joint name to string
    static func from(joint: VNHumanBodyPoseObservation.JointName) -> String {
        switch joint {
        case .nose: return "nose"
        case .leftEye: return "left_eye"
        case .rightEye: return "right_eye"
        case .leftEar: return "left_ear"
        case .rightEar: return "right_ear"
        case .neck: return "neck"
        case .leftShoulder: return "left_shoulder"
        case .rightShoulder: return "right_shoulder"
        case .leftElbow: return "left_elbow"
        case .rightElbow: return "right_elbow"
        case .leftWrist: return "left_wrist"
        case .rightWrist: return "right_wrist"
        case .root: return "root"
        case .leftHip: return "left_hip"
        case .rightHip: return "right_hip"
        case .leftKnee: return "left_knee"
        case .rightKnee: return "right_knee"
        case .leftAnkle: return "left_ankle"
        case .rightAnkle: return "right_ankle"
        default: return "unknown"
        }
    }

    /// Convert 3D joint name to string (iOS 17+)
    /// Note: 3D pose has fewer joints than 2D (no eyes, ears)
    @available(iOS 17.0, *)
    static func from3D(joint: VNHumanBodyPose3DObservation.JointName) -> String {
        switch joint {
        case .topHead: return "nose"  // Map to nose as closest approximation
        case .centerHead: return "neck"  // Center of head maps to neck area
        case .centerShoulder: return "neck"  // 3D uses centerShoulder instead of neck
        case .leftShoulder: return "left_shoulder"
        case .rightShoulder: return "right_shoulder"
        case .leftElbow: return "left_elbow"
        case .rightElbow: return "right_elbow"
        case .leftWrist: return "left_wrist"
        case .rightWrist: return "right_wrist"
        case .spine: return "root"  // Spine maps to root/pelvis area
        case .root: return "root"
        case .leftHip: return "left_hip"
        case .rightHip: return "right_hip"
        case .leftKnee: return "left_knee"
        case .rightKnee: return "right_knee"
        case .leftAnkle: return "left_ankle"
        case .rightAnkle: return "right_ankle"
        default: return "unknown"
        }
    }

    /// All 19 joint names in consistent order (2D)
    static let all: [VNHumanBodyPoseObservation.JointName] = [
        .nose, .leftEye, .rightEye, .leftEar, .rightEar,
        .neck, .leftShoulder, .rightShoulder,
        .leftElbow, .rightElbow,
        .leftWrist, .rightWrist,
        .root,
        .leftHip, .rightHip,
        .leftKnee, .rightKnee,
        .leftAnkle, .rightAnkle
    ]

    /// All 3D joint names in consistent order (iOS 17+)
    /// Note: 3D pose has 17 joints (no eyes, ears like 2D)
    @available(iOS 17.0, *)
    static var all3D: [VNHumanBodyPose3DObservation.JointName] {
        return [
            .topHead, .centerHead,  // Head points
            .centerShoulder, .leftShoulder, .rightShoulder,  // Shoulders
            .leftElbow, .rightElbow,  // Elbows
            .leftWrist, .rightWrist,  // Wrists
            .spine, .root,  // Torso
            .leftHip, .rightHip,  // Hips
            .leftKnee, .rightKnee,  // Knees
            .leftAnkle, .rightAnkle  // Ankles
        ]
    }
}

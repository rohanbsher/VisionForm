/**
 * Angle Calculation Utilities
 * Geometric functions for pose analysis and form validation
 */

import { Keypoint, ExerciseAngles } from '../types';

// PoseNet keypoint indices (17 keypoints total)
export const POSE_KEYPOINTS = {
  NOSE: 0,
  LEFT_EYE: 1,
  RIGHT_EYE: 2,
  LEFT_EAR: 3,
  RIGHT_EAR: 4,
  LEFT_SHOULDER: 5,
  RIGHT_SHOULDER: 6,
  LEFT_ELBOW: 7,
  RIGHT_ELBOW: 8,
  LEFT_WRIST: 9,
  RIGHT_WRIST: 10,
  LEFT_HIP: 11,
  RIGHT_HIP: 12,
  LEFT_KNEE: 13,
  RIGHT_KNEE: 14,
  LEFT_ANKLE: 15,
  RIGHT_ANKLE: 16,
} as const;

/**
 * Automatically detect which side of the body is more visible
 * Based on confidence scores of key body landmarks
 *
 * @param keypoints Array of detected keypoints
 * @returns 'left' or 'right' based on which side has higher total confidence
 */
export function detectVisibleSide(keypoints: Keypoint[]): 'left' | 'right' {
  // Key landmarks to check for side visibility
  const leftIndices = [
    POSE_KEYPOINTS.LEFT_SHOULDER,
    POSE_KEYPOINTS.LEFT_HIP,
    POSE_KEYPOINTS.LEFT_KNEE,
    POSE_KEYPOINTS.LEFT_ELBOW,
  ];

  const rightIndices = [
    POSE_KEYPOINTS.RIGHT_SHOULDER,
    POSE_KEYPOINTS.RIGHT_HIP,
    POSE_KEYPOINTS.RIGHT_KNEE,
    POSE_KEYPOINTS.RIGHT_ELBOW,
  ];

  // Sum confidence scores for each side
  const leftConfidence = leftIndices.reduce((sum, idx) => {
    const kp = keypoints[idx];
    return sum + (kp?.score ?? 0);
  }, 0);

  const rightConfidence = rightIndices.reduce((sum, idx) => {
    const kp = keypoints[idx];
    return sum + (kp?.score ?? 0);
  }, 0);

  // Return the side with higher total confidence
  // Default to left if equal (as left is typically closer to camera in front-facing view)
  return rightConfidence > leftConfidence ? 'right' : 'left';
}

/**
 * Calculate angle between three points (a-b-c)
 * Returns angle at point b in degrees
 *
 * @param a First point
 * @param b Center point (vertex of angle)
 * @param c Third point
 * @returns Angle in degrees (0-180)
 *
 * @example
 * // Calculate knee angle
 * const kneeAngle = calculateAngle(hip, knee, ankle);
 */
export function calculateAngle(
  a: Keypoint,
  b: Keypoint,
  c: Keypoint
): number {
  // Calculate vectors
  const radians = Math.atan2(c.y - b.y, c.x - b.x) -
                  Math.atan2(a.y - b.y, a.x - b.x);

  // Convert to degrees and normalize to 0-180
  let angle = Math.abs(radians * 180.0 / Math.PI);

  if (angle > 180.0) {
    angle = 360 - angle;
  }

  return Math.round(angle);
}

/**
 * Calculate angle between three 3D points (a-b-c)
 * Uses dot product for true 3D angle calculation
 * Falls back to 2D calculation if z-coordinates are missing
 *
 * @param a First point
 * @param b Center point (vertex of angle)
 * @param c Third point
 * @returns Angle in degrees (0-180)
 */
export function calculateAngle3D(
  a: Keypoint,
  b: Keypoint,
  c: Keypoint
): number {
  // Fall back to 2D if any z-coordinate is missing
  if (a.z === undefined || b.z === undefined || c.z === undefined) {
    return calculateAngle(a, b, c);
  }

  // 3D vector calculation
  const ba = { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z };
  const bc = { x: c.x - b.x, y: c.y - b.y, z: c.z - b.z };

  // Dot product
  const dot = ba.x * bc.x + ba.y * bc.y + ba.z * bc.z;

  // Magnitudes
  const magBA = Math.sqrt(ba.x ** 2 + ba.y ** 2 + ba.z ** 2);
  const magBC = Math.sqrt(bc.x ** 2 + bc.y ** 2 + bc.z ** 2);

  // Avoid division by zero
  if (magBA === 0 || magBC === 0) return 0;

  // Clamp to valid range for acos (-1 to 1)
  const cosAngle = Math.max(-1, Math.min(1, dot / (magBA * magBC)));

  return Math.round(Math.acos(cosAngle) * 180 / Math.PI);
}

/**
 * Check if keypoints have 3D data available
 * @param keypoints Array of keypoints to check
 * @returns True if any keypoint has z-coordinate
 */
export function has3DData(keypoints: Keypoint[]): boolean {
  return keypoints.some(kp => kp.z !== undefined);
}

/**
 * Calculate angle from vertical (for back angle)
 * Useful for measuring posture relative to standing straight
 *
 * @param top Top point (e.g., shoulder)
 * @param bottom Bottom point (e.g., hip)
 * @returns Angle from vertical in degrees (0 = straight, 90 = horizontal)
 */
export function calculateAngleFromVertical(
  top: Keypoint,
  bottom: Keypoint
): number {
  const deltaX = bottom.x - top.x;
  const deltaY = bottom.y - top.y;

  const radians = Math.atan2(deltaX, deltaY);
  const angle = Math.abs(radians * 180.0 / Math.PI);

  return Math.round(angle);
}

/**
 * Extract exercise-relevant angles from pose keypoints
 * Calculates all major joint angles used for form analysis
 *
 * @param keypoints Array of detected keypoints
 * @param side Which side to analyze ('left', 'right', or 'auto' for automatic detection)
 * @returns Object containing all calculated angles
 */
export function getExerciseAngles(
  keypoints: Keypoint[],
  side: 'left' | 'right' | 'auto' = 'auto'
): ExerciseAngles {
  // Automatically detect which side is more visible if set to 'auto'
  const effectiveSide = side === 'auto' ? detectVisibleSide(keypoints) : side;

  // Choose keypoint indices based on detected/specified side
  const shoulderIdx = effectiveSide === 'left' ? POSE_KEYPOINTS.LEFT_SHOULDER : POSE_KEYPOINTS.RIGHT_SHOULDER;
  const elbowIdx = effectiveSide === 'left' ? POSE_KEYPOINTS.LEFT_ELBOW : POSE_KEYPOINTS.RIGHT_ELBOW;
  const wristIdx = effectiveSide === 'left' ? POSE_KEYPOINTS.LEFT_WRIST : POSE_KEYPOINTS.RIGHT_WRIST;
  const hipIdx = effectiveSide === 'left' ? POSE_KEYPOINTS.LEFT_HIP : POSE_KEYPOINTS.RIGHT_HIP;
  const kneeIdx = effectiveSide === 'left' ? POSE_KEYPOINTS.LEFT_KNEE : POSE_KEYPOINTS.RIGHT_KNEE;
  const ankleIdx = effectiveSide === 'left' ? POSE_KEYPOINTS.LEFT_ANKLE : POSE_KEYPOINTS.RIGHT_ANKLE;

  const shoulder = keypoints[shoulderIdx];
  const elbow = keypoints[elbowIdx];
  const wrist = keypoints[wristIdx];
  const hip = keypoints[hipIdx];
  const knee = keypoints[kneeIdx];
  const ankle = keypoints[ankleIdx];

  // Check if 3D data is available (iOS 17+)
  // Use 3D angle calculation when available for more accurate angles
  const use3D = has3DData(keypoints);
  const angleFunc = use3D ? calculateAngle3D : calculateAngle;

  // Calculate all angles using appropriate function (2D or 3D)
  const angles: ExerciseAngles = {
    // Hip angle: shoulder-hip-knee (measures hip flexion)
    hip: angleFunc(shoulder, hip, knee),

    // Knee angle: hip-knee-ankle (measures knee flexion)
    knee: angleFunc(hip, knee, ankle),

    // Ankle/Shin angle: angle of lower leg from vertical
    // Note: This uses 2D calculation as it's relative to vertical
    ankle: calculateAngleFromVertical(knee, ankle),

    // Back angle: shoulder-hip relative to vertical
    // Note: This uses 2D calculation as it's relative to vertical
    back: calculateAngleFromVertical(shoulder, hip),

    // Elbow angle: shoulder-elbow-wrist (for pushups)
    elbow: angleFunc(shoulder, elbow, wrist),

    // Shoulder angle: back-shoulder-arm (for planks)
    shoulder: angleFunc(hip, shoulder, elbow),
  };

  return angles;
}

/**
 * Get the side that was used for angle calculation
 * Useful for debugging and UI feedback
 *
 * @param keypoints Array of detected keypoints
 * @param requestedSide The side that was requested ('left', 'right', or 'auto')
 * @returns The actual side used for calculation
 */
export function getEffectiveSide(
  keypoints: Keypoint[],
  requestedSide: 'left' | 'right' | 'auto' = 'auto'
): 'left' | 'right' {
  return requestedSide === 'auto' ? detectVisibleSide(keypoints) : requestedSide;
}

/**
 * Check if keypoint has sufficient confidence
 * Used to filter out unreliable detections
 *
 * @param keypoint Keypoint to check
 * @param threshold Minimum confidence (default: 0.5)
 * @returns True if keypoint is reliable
 */
export function isKeypointReliable(
  keypoint: Keypoint,
  threshold: number = 0.5
): boolean {
  return (keypoint.score ?? 0) >= threshold;
}

/**
 * Get average position of two keypoints
 * Useful for calculating center points (e.g., between hips)
 *
 * @param a First keypoint
 * @param b Second keypoint
 * @returns Midpoint keypoint
 */
export function getMidpoint(a: Keypoint, b: Keypoint): Keypoint {
  return {
    x: (a.x + b.x) / 2,
    y: (a.y + b.y) / 2,
    score: Math.min(a.score ?? 1, b.score ?? 1),
  };
}

/**
 * Calculate distance between two keypoints
 * Useful for measuring body segment lengths
 *
 * @param a First keypoint
 * @param b Second keypoint
 * @returns Distance in coordinate units
 */
export function calculateDistance(a: Keypoint, b: Keypoint): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Normalize keypoint coordinates to screen dimensions
 * Converts normalized (0-1) or camera coordinates to screen pixels
 *
 * @param keypoint Keypoint with normalized coordinates
 * @param cameraWidth Original camera width
 * @param cameraHeight Original camera height
 * @param screenWidth Target screen width
 * @param screenHeight Target screen height
 * @returns Keypoint with screen coordinates
 */
export function normalizeKeypointToScreen(
  keypoint: Keypoint,
  cameraWidth: number,
  cameraHeight: number,
  screenWidth: number,
  screenHeight: number
): Keypoint {
  return {
    x: (keypoint.x / cameraWidth) * screenWidth,
    y: (keypoint.y / cameraHeight) * screenHeight,
    z: keypoint.z,
    score: keypoint.score,
    part: keypoint.part,
  };
}

/**
 * Check if all critical keypoints for an exercise are detected
 * Ensures pose has minimum required keypoints with sufficient confidence
 *
 * @param keypoints Array of detected keypoints
 * @param requiredIndices Indices of required keypoints
 * @param threshold Minimum confidence threshold
 * @returns True if all required keypoints are reliable
 */
export function hasRequiredKeypoints(
  keypoints: Keypoint[],
  requiredIndices: number[],
  threshold: number = 0.5
): boolean {
  return requiredIndices.every(idx => {
    const kp = keypoints[idx];
    return kp && isKeypointReliable(kp, threshold);
  });
}

/**
 * Get required keypoint indices for squat exercise
 * @returns Array of keypoint indices needed for squats
 */
export function getSquatRequiredKeypoints(): number[] {
  return [
    POSE_KEYPOINTS.LEFT_SHOULDER,
    POSE_KEYPOINTS.LEFT_HIP,
    POSE_KEYPOINTS.LEFT_KNEE,
    POSE_KEYPOINTS.LEFT_ANKLE,
  ];
}

/**
 * Get required keypoint indices for pushup exercise
 * @returns Array of keypoint indices needed for pushups
 */
export function getPushupRequiredKeypoints(): number[] {
  return [
    POSE_KEYPOINTS.LEFT_SHOULDER,
    POSE_KEYPOINTS.LEFT_ELBOW,
    POSE_KEYPOINTS.LEFT_WRIST,
    POSE_KEYPOINTS.LEFT_HIP,
  ];
}

/**
 * Get required keypoint indices for plank exercise
 * @returns Array of keypoint indices needed for planks
 */
export function getPlankRequiredKeypoints(): number[] {
  return [
    POSE_KEYPOINTS.LEFT_SHOULDER,
    POSE_KEYPOINTS.LEFT_HIP,
    POSE_KEYPOINTS.LEFT_ANKLE,
  ];
}

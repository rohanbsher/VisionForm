/**
 * Vision Framework Adapter
 * Converts Vision Framework pose data (19 keypoints) to PoseNet format (17 keypoints)
 * Maintains backwards compatibility with existing angle calculation code
 *
 * Part of VisionForm - AI-Powered Workout Form Analyzer
 */

import { Pose, Keypoint, VisionKeypointName, VISION_TO_POSENET_INDEX, KEYPOINT_COUNT } from '../types';
import { VisionPose, VisionKeypoint } from '../../modules/vision-pose/src';

/**
 * Convert Vision Framework pose to extended PoseNet-compatible format
 * Maps 19 Vision keypoints to 19-keypoint array (extended from 17)
 * Preserves neck and root keypoints for more accurate pose analysis
 *
 * @param visionPose Pose from Vision Framework with named keypoints
 * @returns Pose compatible with existing PoseNet-based code
 */
export function convertVisionToPoseNetFormat(visionPose: VisionPose): Pose {
  // Initialize 19-keypoint array (extended from PoseNet's 17 to preserve neck/root)
  const posenetKeypoints: Keypoint[] = new Array(KEYPOINT_COUNT).fill(null).map(() => ({
    x: 0,
    y: 0,
    score: 0,
    part: 'unknown',
  }));

  // Map Vision keypoints to PoseNet indices
  visionPose.keypoints.forEach((visionKp: VisionKeypoint) => {
    const keypointName = visionKp.name as VisionKeypointName;
    const posenetIndex = VISION_TO_POSENET_INDEX[keypointName];

    if (posenetIndex !== undefined) {
      posenetKeypoints[posenetIndex] = {
        x: visionKp.x,
        y: visionKp.y,
        score: visionKp.confidence,
        confidence: visionKp.confidence,
        part: visionKp.name,
        name: keypointName,
      };
    }
  });

  return {
    keypoints: posenetKeypoints,
    score: visionPose.overallConfidence,
  };
}

/**
 * Normalize Vision Framework coordinates
 * Vision uses normalized coordinates (0-1) with origin at bottom-left
 * We may need to flip Y-axis depending on camera orientation
 *
 * @param visionPose Raw pose from Vision Framework
 * @param flipY Whether to flip Y coordinates (default: false)
 * @returns Normalized pose
 */
export function normalizeVisionCoordinates(
  visionPose: VisionPose,
  flipY: boolean = false
): VisionPose {
  return {
    ...visionPose,
    keypoints: visionPose.keypoints.map((kp) => ({
      ...kp,
      y: flipY ? 1 - kp.y : kp.y,
    })),
  };
}

/**
 * Check if Vision pose has minimum required keypoints for exercise analysis
 * Ensures we have enough reliable keypoints before processing
 *
 * @param visionPose Pose from Vision Framework
 * @param minKeypoints Minimum number of keypoints required (default: 10)
 * @param minConfidence Minimum confidence threshold (default: 0.5)
 * @returns True if pose is usable for analysis
 */
export function isVisionPoseValid(
  visionPose: VisionPose,
  minKeypoints: number = 10,
  minConfidence: number = 0.5
): boolean {
  // Check overall confidence
  if (visionPose.overallConfidence < minConfidence) {
    return false;
  }

  // Count high-confidence keypoints
  const validKeypoints = visionPose.keypoints.filter(
    (kp) => kp.confidence >= minConfidence
  );

  return validKeypoints.length >= minKeypoints;
}

/**
 * Get missing critical keypoints for squat analysis
 * Helps debug pose detection issues
 *
 * @param visionPose Pose from Vision Framework
 * @returns Array of missing critical keypoint names
 */
export function getMissingSquatKeypoints(visionPose: VisionPose): string[] {
  const criticalKeypoints: VisionKeypointName[] = [
    'left_shoulder',
    'right_shoulder',
    'left_hip',
    'right_hip',
    'left_knee',
    'right_knee',
    'left_ankle',
    'right_ankle',
  ];

  const detectedNames = new Set(visionPose.keypoints.map((kp) => kp.name));

  return criticalKeypoints.filter((name) => !detectedNames.has(name));
}

/**
 * Smooth pose data using exponential moving average
 * Reduces jitter in real-time pose detection
 *
 * @param currentPose Current detected pose
 * @param previousPose Previous pose (if any)
 * @param alpha Smoothing factor (0-1, lower = smoother but laggier)
 * @returns Smoothed pose
 */
export function smoothVisionPose(
  currentPose: VisionPose,
  previousPose: VisionPose | null,
  alpha: number = 0.5
): VisionPose {
  if (!previousPose) {
    return currentPose;
  }

  // Create map for quick lookup
  const prevKeypointMap = new Map(
    previousPose.keypoints.map((kp) => [kp.name, kp])
  );

  // Smooth each keypoint
  const smoothedKeypoints = currentPose.keypoints.map((currentKp) => {
    const prevKp = prevKeypointMap.get(currentKp.name);

    if (!prevKp) {
      return currentKp; // No previous data, use current
    }

    // Exponential moving average
    return {
      ...currentKp,
      x: alpha * currentKp.x + (1 - alpha) * prevKp.x,
      y: alpha * currentKp.y + (1 - alpha) * prevKp.y,
      confidence: alpha * currentKp.confidence + (1 - alpha) * prevKp.confidence,
    };
  });

  return {
    ...currentPose,
    keypoints: smoothedKeypoints,
    overallConfidence:
      alpha * currentPose.overallConfidence +
      (1 - alpha) * previousPose.overallConfidence,
  };
}

/**
 * Convert Vision coordinates to screen pixels
 * Vision uses normalized (0-1), we need screen coordinates for rendering
 *
 * @param visionPose Pose with normalized coordinates
 * @param screenWidth Screen width in pixels
 * @param screenHeight Screen height in pixels
 * @returns Pose with screen pixel coordinates
 */
export function visionToScreenCoordinates(
  visionPose: VisionPose,
  screenWidth: number,
  screenHeight: number
): VisionPose {
  return {
    ...visionPose,
    keypoints: visionPose.keypoints.map((kp) => ({
      ...kp,
      x: kp.x * screenWidth,
      y: kp.y * screenHeight,
    })),
  };
}

/**
 * Debug helper: Log Vision pose detection results
 * Useful for troubleshooting coordinate systems and mapping
 *
 * @param visionPose Pose from Vision Framework
 * @param label Optional label for logging
 */
export function logVisionPose(visionPose: VisionPose, label: string = 'VisionPose'): void {
  console.log(`[${label}] Confidence: ${visionPose.overallConfidence.toFixed(2)}`);
  console.log(`[${label}] Keypoints: ${visionPose.keypoints.length}`);

  visionPose.keypoints.forEach((kp) => {
    console.log(
      `  ${kp.name.padEnd(15)} x:${kp.x.toFixed(3)} y:${kp.y.toFixed(3)} conf:${kp.confidence.toFixed(2)}`
    );
  });
}

/**
 * Compare Vision and PoseNet keypoint counts
 * Validation helper during migration
 *
 * @param visionPose Vision Framework pose
 * @returns Comparison stats
 */
export function getKeypointComparison(visionPose: VisionPose): {
  visionCount: number;
  posenetCount: number;
  mappedCount: number;
  unmappedKeypoints: string[];
} {
  const visionCount = visionPose.keypoints.length;
  const posenetIndices = new Set(Object.values(VISION_TO_POSENET_INDEX));
  const posenetCount = posenetIndices.size;

  const mappedKeypoints = visionPose.keypoints.filter((kp) => {
    const name = kp.name as VisionKeypointName;
    return VISION_TO_POSENET_INDEX[name] !== undefined;
  });

  const unmappedKeypoints = visionPose.keypoints
    .filter((kp) => {
      const name = kp.name as VisionKeypointName;
      return VISION_TO_POSENET_INDEX[name] === undefined;
    })
    .map((kp) => kp.name);

  return {
    visionCount,
    posenetCount,
    mappedCount: mappedKeypoints.length,
    unmappedKeypoints,
  };
}

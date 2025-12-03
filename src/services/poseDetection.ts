/**
 * Pose Detection Service (DEPRECATED)
 *
 * This module was used for TensorFlow.js PoseNet detection.
 * It has been replaced by Apple Vision Framework (modules/vision-pose).
 *
 * This file is kept as a stub to prevent import errors during migration.
 * It will be removed entirely once all references are cleaned up.
 *
 * @deprecated Use VisionPose module instead
 * @module services/poseDetection
 */

/**
 * @deprecated TensorFlow.js has been replaced by Vision Framework
 */
export async function initializeTensorFlow(): Promise<void> {
  console.warn('[poseDetection] DEPRECATED: Use VisionPose.initialize() instead');
  throw new Error('TensorFlow.js support has been removed. Use Vision Framework instead.');
}

/**
 * @deprecated TensorFlow.js has been replaced by Vision Framework
 */
export async function loadPoseNetModel(): Promise<void> {
  console.warn('[poseDetection] DEPRECATED: Use VisionPose.initialize() instead');
  throw new Error('TensorFlow.js support has been removed. Use Vision Framework instead.');
}

/**
 * @deprecated TensorFlow.js has been replaced by Vision Framework
 */
export async function initialize(): Promise<void> {
  console.warn('[poseDetection] DEPRECATED: Use VisionPose.initialize() instead');
  throw new Error('TensorFlow.js support has been removed. Use Vision Framework instead.');
}

/**
 * @deprecated TensorFlow.js has been replaced by Vision Framework
 */
export function isModelLoaded(): boolean {
  console.warn('[poseDetection] DEPRECATED: Use VisionPose.getStatus() instead');
  return false;
}

/**
 * @deprecated TensorFlow.js has been replaced by Vision Framework
 */
export async function cleanup(): Promise<void> {
  console.warn('[poseDetection] DEPRECATED: Use VisionPose.cleanup() instead');
}

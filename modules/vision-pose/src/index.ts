/**
 * VisionPose Module
 * TypeScript wrapper for Apple Vision Framework pose detection
 *
 * Part of VisionForm - AI-Powered Workout Form Analyzer
 */

import { requireNativeModule, EventEmitter, type EventSubscription } from 'expo-modules-core';

// MARK: - Types

export interface VisionKeypoint {
  name: string;
  x: number;
  y: number;
  z?: number;           // Optional z-coordinate for 3D poses (iOS 17+)
  confidence: number;
}

export interface VisionPose {
  keypoints: VisionKeypoint[];
  timestamp: number;
  overallConfidence: number;
  is3D?: boolean;       // Flag indicating 3D pose data available (iOS 17+)
}

export interface DetectionStatus {
  isInitialized: boolean;
  isRunning: boolean;
  targetFPS?: number;
  minConfidence?: number;
  processedFrames?: number;
  state?: string;
}

export interface ModuleResponse {
  success: boolean;
  message?: string;
  error?: string;
  [key: string]: any;
}

// Event types for the emitter
interface VisionPoseEvents {
  onPoseDetected: VisionPose;
  onError: { error: string; timestamp: number };
  onStatusChange: Partial<DetectionStatus>;
}

// MARK: - Native Module

const VisionPoseNative = requireNativeModule('VisionPose');

if (!VisionPoseNative) {
  throw new Error(
    'VisionPose native module not found. ' +
    'Did you forget to run pod install or rebuild the app?'
  );
}

// MARK: - Event Emitter
// Using type assertion for the legacy EventEmitter API
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const visionPoseEmitter: any = new EventEmitter(VisionPoseNative);

// MARK: - API Functions

/**
 * Initialize the Vision Framework detector
 * Must be called before starting detection
 */
export async function initialize(): Promise<ModuleResponse> {
  try {
    const result = await VisionPoseNative.initialize();

    if (result.success) {
      console.log('[VisionPose] Initialized:', result.message);
    }

    return result;
  } catch (error) {
    console.error('[VisionPose] Initialization error:', error);
    throw error;
  }
}

/**
 * Start pose detection
 * @param fps - Target frames per second (default: 30)
 * @param minConfidence - Minimum confidence threshold 0-1 (default: 0.3)
 *        Lowered from 0.5 to capture more poses; temporal smoothing handles added noise
 */
export async function startDetection(
  fps: number = 30,
  minConfidence: number = 0.3
): Promise<ModuleResponse> {
  try {
    const result = await VisionPoseNative.startDetection(fps, minConfidence);
    console.log('[VisionPose] Detection started:', result.message);
    return result;
  } catch (error) {
    console.error('[VisionPose] Start detection error:', error);
    throw error;
  }
}

/**
 * Stop pose detection
 */
export async function stopDetection(): Promise<ModuleResponse> {
  try {
    const result = await VisionPoseNative.stopDetection();
    console.log('[VisionPose] Detection stopped');
    return result;
  } catch (error) {
    console.error('[VisionPose] Stop detection error:', error);
    throw error;
  }
}

/**
 * Pause pose detection (maintains state)
 */
export async function pauseDetection(): Promise<ModuleResponse> {
  try {
    return await VisionPoseNative.pauseDetection();
  } catch (error) {
    console.error('[VisionPose] Pause detection error:', error);
    throw error;
  }
}

/**
 * Resume pose detection
 */
export async function resumeDetection(): Promise<ModuleResponse> {
  try {
    return await VisionPoseNative.resumeDetection();
  } catch (error) {
    console.error('[VisionPose] Resume detection error:', error);
    throw error;
  }
}

/**
 * Update target FPS dynamically
 * @param fps - New target frames per second (1-60)
 */
export async function setTargetFPS(fps: number): Promise<ModuleResponse> {
  if (fps < 1 || fps > 60) {
    throw new Error('FPS must be between 1 and 60');
  }

  try {
    return await VisionPoseNative.setTargetFPS(fps);
  } catch (error) {
    console.error('[VisionPose] Set FPS error:', error);
    throw error;
  }
}

/**
 * Update minimum confidence threshold
 * @param confidence - New minimum confidence (0.0 - 1.0)
 */
export async function setMinConfidence(confidence: number): Promise<ModuleResponse> {
  if (confidence < 0 || confidence > 1) {
    throw new Error('Confidence must be between 0.0 and 1.0');
  }

  try {
    return await VisionPoseNative.setMinConfidence(confidence);
  } catch (error) {
    console.error('[VisionPose] Set confidence error:', error);
    throw error;
  }
}

/**
 * Get current detection status
 */
export async function getStatus(): Promise<DetectionStatus> {
  try {
    return await VisionPoseNative.getStatus();
  } catch (error) {
    console.error('[VisionPose] Get status error:', error);
    return {
      isInitialized: false,
      isRunning: false
    };
  }
}

// MARK: - Event Listeners

/**
 * Add listener for pose detection events
 * @param callback - Function called when a pose is detected
 * @returns Unsubscribe function
 */
export function addPoseListener(
  callback: (pose: VisionPose) => void
): EventSubscription {
  return visionPoseEmitter.addListener('onPoseDetected', callback);
}

/**
 * Add listener for error events
 * @param callback - Function called when an error occurs
 * @returns Unsubscribe function
 */
export function addErrorListener(
  callback: (event: { error: string; timestamp: number }) => void
): EventSubscription {
  return visionPoseEmitter.addListener('onError', callback);
}

/**
 * Add listener for status change events
 * @param callback - Function called when detection status changes
 * @returns Unsubscribe function
 */
export function addStatusListener(
  callback: (status: Partial<DetectionStatus>) => void
): EventSubscription {
  return visionPoseEmitter.addListener('onStatusChange', callback);
}

/**
 * Remove all event listeners
 */
export function removeAllListeners(): void {
  visionPoseEmitter.removeAllListeners('onPoseDetected');
  visionPoseEmitter.removeAllListeners('onError');
  visionPoseEmitter.removeAllListeners('onStatusChange');
}

// MARK: - Cleanup

/**
 * Cleanup all resources and stop detection
 */
export async function cleanup(): Promise<void> {
  try {
    await stopDetection();
    removeAllListeners();
    console.log('[VisionPose] Cleanup complete');
  } catch (error) {
    console.error('[VisionPose] Cleanup error:', error);
  }
}

// MARK: - Default Export

export default {
  initialize,
  startDetection,
  stopDetection,
  pauseDetection,
  resumeDetection,
  setTargetFPS,
  setMinConfidence,
  getStatus,
  addPoseListener,
  addErrorListener,
  addStatusListener,
  removeAllListeners,
  cleanup
};

/**
 * Camera Screen
 *
 * Main workout screen that handles:
 * - Camera feed and frame processing (via react-native-vision-camera)
 * - Real-time pose detection (via Apple Vision Framework)
 * - Skeleton overlay rendering
 * - Rep counting and form analysis
 * - Workout session management
 *
 * @module screens/CameraScreen
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Dimensions,
  Linking
} from 'react-native';
import {
  Camera,
  useCameraDevice,
  useCameraPermission,
  useFrameProcessor,
  VisionCameraProxy
} from 'react-native-vision-camera';
import { useRunOnJS } from 'react-native-worklets-core';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../types';
import type { Pose, ExerciseType, RepCounterState, FormFeedback } from '../types';
import { SkeletonOverlay } from '../components/SkeletonOverlay';
import { RepCounter, createRepCounterForExercise } from '../utils/repCounter';
import { analyzeForm, getPrimaryFeedback, calculateFormScore } from '../services/formAnalysis';
import { getExerciseAngles } from '../utils/angles';
import { EXERCISES } from '../data/exercises';
import {
  convertVisionToPoseNetFormat,
  isVisionPoseValid,
  normalizeVisionCoordinates,
  visionToScreenCoordinates,
  smoothVisionPose
} from '../utils/visionAdapter';
import type { VisionPose as VisionPoseType } from '../../modules/vision-pose/src';

// Initialize the frame processor plugin
// Lowered confidence threshold from 0.5 to 0.3 - smoothing handles the added noise
const detectPosePlugin = VisionCameraProxy.initFrameProcessorPlugin('detectPose', {
  minConfidence: 0.3,
  fps: 30
});

type Props = NativeStackScreenProps<RootStackParamList, 'Camera'>;

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Vision Framework configuration
// Lower threshold captures more poses, smoothing reduces jitter from low-confidence detections
const MIN_DETECTION_CONFIDENCE = 0.3;
const TARGET_FPS = 30;

/**
 * Camera Screen Component
 */
export const CameraScreen: React.FC<Props> = ({ route, navigation }) => {
  const { exerciseType } = route.params;
  const exercise = EXERCISES[exerciseType];

  // react-native-vision-camera hooks
  const { hasPermission, requestPermission } = useCameraPermission();
  const device = useCameraDevice('front');

  // Camera state
  const [isCameraActive, setIsCameraActive] = useState(true);

  // Pose and detection state
  const [currentPose, setCurrentPose] = useState<Pose | null>(null);
  const [formFeedback, setFormFeedback] = useState<FormFeedback | null>(null);

  // Workout state (using refs for high-frequency updates)
  const repCounterRef = useRef<RepCounter>(createRepCounterForExercise(exerciseType));
  const [repCount, setRepCount] = useState(0);
  const [formScore, setFormScore] = useState(0);
  const [isWorkoutActive, setIsWorkoutActive] = useState(false);
  const [sessionStartTime, setSessionStartTime] = useState<number | null>(null);

  // Refs for workout state in frame processor callback
  const isWorkoutActiveRef = useRef(false);

  // Camera ref
  const cameraRef = useRef<Camera>(null);

  // Ref for pose smoothing (stores previous pose for exponential moving average)
  const previousPoseRef = useRef<VisionPoseType | null>(null);

  // Keep refs in sync with state
  useEffect(() => {
    isWorkoutActiveRef.current = isWorkoutActive;
  }, [isWorkoutActive]);

  /**
   * Request camera permission on mount
   */
  useEffect(() => {
    if (!hasPermission) {
      requestPermission();
    }
  }, [hasPermission, requestPermission]);

  /**
   * Cleanup on unmount
   */
  useEffect(() => {
    return () => {
      setIsCameraActive(false);
      repCounterRef.current.reset();
    };
  }, []);

  /**
   * Handle pose detected from frame processor
   * This is called from the worklet via runOnJS
   */
  const onPoseDetected = useCallback((visionPose: VisionPoseType | null) => {
    if (!visionPose) return;

    // Validate pose quality
    if (!isVisionPoseValid(visionPose, 5, MIN_DETECTION_CONFIDENCE)) {
      return;
    }

    // Apply temporal smoothing to reduce jitter
    // Uses exponential moving average: 70% new pose, 30% previous pose
    const SMOOTHING_FACTOR = 0.7;
    const smoothedPose = smoothVisionPose(
      visionPose,
      previousPoseRef.current,
      SMOOTHING_FACTOR
    );
    previousPoseRef.current = smoothedPose;

    // Transform coordinates: Vision (0-1, bottom-left) → Screen (pixels, top-left)
    // 1. Flip Y-axis (bottom-left → top-left origin)
    const normalizedPose = normalizeVisionCoordinates(smoothedPose, true);

    // 2. Scale to screen pixel coordinates
    const screenPose = visionToScreenCoordinates(
      normalizedPose,
      SCREEN_WIDTH,
      SCREEN_HEIGHT
    );

    // 3. Convert to PoseNet format for backwards compatibility
    const pose = convertVisionToPoseNetFormat(screenPose);

    // Handle detected pose
    handlePoseDetected(pose);
  }, []);

  // Create runOnJS wrapper for the callback
  const runOnJSPoseDetected = useRunOnJS(onPoseDetected, [onPoseDetected]);

  /**
   * Frame processor for pose detection
   * Runs on every camera frame using the native detectPose plugin
   */
  const frameProcessor = useFrameProcessor((frame) => {
    'worklet';

    if (!detectPosePlugin) {
      return;
    }

    // Call the native pose detection plugin
    const result = detectPosePlugin.call(frame) as unknown as VisionPoseType | null;

    // Send result to JS thread
    if (result && !('error' in result)) {
      runOnJSPoseDetected(result);
    }
  }, [runOnJSPoseDetected]);

  /**
   * Handle detected pose
   */
  const handlePoseDetected = (pose: Pose) => {
    if (!pose.score || pose.score < MIN_DETECTION_CONFIDENCE) {
      return;
    }

    // Update current pose for skeleton rendering
    setCurrentPose(pose);

    // Only analyze form if workout is active
    if (!isWorkoutActive) {
      return;
    }

    try {
      // Calculate angles from keypoints
      const angles = getExerciseAngles(pose.keypoints);

      // Update rep counter with angles
      const counterState = repCounterRef.current.update(angles);

      // Update rep count if changed
      if (counterState.count !== repCount) {
        setRepCount(counterState.count);
      }

      // Analyze form and get feedback array
      const feedbackArray = analyzeForm(angles, exercise);
      const primaryFeedback = getPrimaryFeedback(feedbackArray);
      setFormFeedback(primaryFeedback);

      // Calculate and update form score
      const score = calculateFormScore(angles, exercise);
      setFormScore(score);

    } catch (error) {
      console.error('[CameraScreen] Pose handling error:', error);
    }
  };

  /**
   * Start workout session
   */
  const handleStartWorkout = () => {
    repCounterRef.current.reset();
    previousPoseRef.current = null; // Reset smoothing for fresh tracking
    setRepCount(0);
    setFormFeedback(null);
    setIsWorkoutActive(true);
    setSessionStartTime(Date.now());
    console.log('[CameraScreen] Workout started');
  };

  /**
   * Stop workout session and navigate to results
   */
  const handleStopWorkout = () => {
    setIsWorkoutActive(false);

    const duration = sessionStartTime
      ? Math.floor((Date.now() - sessionStartTime) / 1000)
      : 0;

    // Navigate to results screen with workout data
    navigation.navigate('Results', {
      exerciseType,
      repCount,
      duration,
      averageFormScore: formScore
    });
  };

  /**
   * Get skeleton color based on form quality
   */
  const getSkeletonColor = (): string => {
    if (!formFeedback) return '#00FF00'; // Green default

    if (formFeedback.type === 'error') return '#FF0000';    // Red
    if (formFeedback.type === 'warning') return '#FFA500';  // Amber
    return '#00FF00';                                        // Green
  };

  /**
   * Render camera permission screen
   */
  if (hasPermission === null) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Requesting camera permission...</Text>
      </View>
    );
  }

  if (!hasPermission) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>Camera permission denied</Text>
        <Text style={styles.errorSubtext}>
          Please enable camera access in Settings to use VisionForm
        </Text>
        <TouchableOpacity
          style={styles.button}
          onPress={() => Linking.openSettings()}
        >
          <Text style={styles.buttonText}>Open Settings</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.button, { marginTop: 10, backgroundColor: '#666' }]}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.buttonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!device) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>No Camera Found</Text>
        <Text style={styles.errorSubtext}>
          Could not find a front camera on this device
        </Text>
        <TouchableOpacity
          style={styles.button}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.buttonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  /**
   * Main camera screen render
   */
  return (
    <View style={styles.container}>
      {/* Camera View - react-native-vision-camera with frame processor */}
      <Camera
        ref={cameraRef}
        style={StyleSheet.absoluteFill}
        device={device}
        isActive={isCameraActive}
        frameProcessor={frameProcessor}
        pixelFormat="yuv"
      />

      {/* Overlay container on top of camera */}
      <View style={styles.overlay}>
        {/* Skeleton Overlay */}
        {currentPose && (
          <SkeletonOverlay
            pose={currentPose}
            width={SCREEN_WIDTH}
            height={SCREEN_HEIGHT}
            color={getSkeletonColor()}
          />
        )}

        {/* Top Bar - Exercise Name */}
        <View style={styles.topBar}>
          <Text style={styles.exerciseName}>{exercise.name}</Text>
          <TouchableOpacity
            style={styles.closeButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.closeButtonText}>✕</Text>
          </TouchableOpacity>
        </View>

        {/* Stats Overlay */}
        <View style={styles.statsContainer}>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>REPS</Text>
            <Text style={styles.statValue}>{repCount}</Text>
          </View>

          {isWorkoutActive && (
            <View style={styles.statBox}>
              <Text style={styles.statLabel}>FORM</Text>
              <Text style={[
                styles.statValue,
                { color: getSkeletonColor() }
              ]}>
                {formScore}%
              </Text>
            </View>
          )}
        </View>

        {/* Detection Quality Indicator */}
        <View style={styles.confidenceContainer}>
          <Text style={styles.confidenceLabel}>DETECTION</Text>
          <View style={styles.confidenceBarBackground}>
            <View
              style={[
                styles.confidenceBar,
                {
                  width: `${Math.round((currentPose?.score ?? 0) * 100)}%`,
                  backgroundColor:
                    (currentPose?.score ?? 0) >= 0.7 ? '#00FF00' :
                    (currentPose?.score ?? 0) >= 0.4 ? '#FFA500' : '#FF0000'
                }
              ]}
            />
          </View>
          {(currentPose?.score ?? 0) < 0.4 && currentPose && (
            <Text style={styles.confidenceWarning}>Move closer or improve lighting</Text>
          )}
          {!currentPose && (
            <Text style={styles.confidenceWarning}>No body detected</Text>
          )}
        </View>

        {/* Form Feedback Messages */}
        {isWorkoutActive && formFeedback && (
          <View style={styles.feedbackContainer}>
            <View
              style={[
                styles.feedbackMessage,
                {
                  backgroundColor:
                    formFeedback.type === 'error' ? 'rgba(255, 0, 0, 0.8)' :
                    formFeedback.type === 'warning' ? 'rgba(255, 165, 0, 0.8)' :
                    'rgba(0, 255, 0, 0.8)'
                }
              ]}
            >
              <Text style={styles.feedbackText}>{formFeedback.message}</Text>
            </View>
          </View>
        )}

        {/* Control Buttons */}
        <View style={styles.controlsContainer}>
          {!isWorkoutActive ? (
            <TouchableOpacity
              style={[styles.controlButton, styles.startButton]}
              onPress={handleStartWorkout}
            >
              <Text style={styles.controlButtonText}>START WORKOUT</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[styles.controlButton, styles.stopButton]}
              onPress={handleStopWorkout}
            >
              <Text style={styles.controlButtonText}>FINISH</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Instructions Overlay (before workout starts) */}
        {!isWorkoutActive && (
          <View style={styles.instructionsContainer}>
            <Text style={styles.instructionsTitle}>Setup Instructions:</Text>
            <Text style={styles.instructionsText}>
              • Position yourself so your full body is visible
            </Text>
            <Text style={styles.instructionsText}>
              • Stand 6-8 feet from the camera
            </Text>
            <Text style={styles.instructionsText}>
              • Ensure good lighting
            </Text>
            <Text style={styles.instructionsText}>
              • {exercise.muscleGroups[0]} focus
            </Text>
          </View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000'
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
    padding: 20
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'transparent'
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 50,
    paddingHorizontal: 20,
    paddingBottom: 10
  },
  exerciseName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFF',
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 3
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center'
  },
  closeButtonText: {
    fontSize: 24,
    color: '#FFF',
    fontWeight: 'bold'
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 20,
    marginTop: 20
  },
  statBox: {
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 10,
    minWidth: 120,
    alignItems: 'center'
  },
  statLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#AAA',
    marginBottom: 5
  },
  statValue: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#FFF'
  },
  confidenceContainer: {
    alignItems: 'center',
    marginTop: 15,
    paddingHorizontal: 20
  },
  confidenceLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: '#AAA',
    marginBottom: 4
  },
  confidenceBarBackground: {
    width: 120,
    height: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 4,
    overflow: 'hidden'
  },
  confidenceBar: {
    height: '100%',
    borderRadius: 4
  },
  confidenceWarning: {
    fontSize: 10,
    color: '#FFA500',
    marginTop: 4,
    textAlign: 'center'
  },
  feedbackContainer: {
    position: 'absolute',
    top: '40%',
    left: 20,
    right: 20,
    alignItems: 'center'
  },
  feedbackMessage: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    marginVertical: 5,
    maxWidth: '90%'
  },
  feedbackText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFF',
    textAlign: 'center'
  },
  controlsContainer: {
    position: 'absolute',
    bottom: 50,
    left: 0,
    right: 0,
    alignItems: 'center'
  },
  controlButton: {
    paddingVertical: 18,
    paddingHorizontal: 60,
    borderRadius: 30,
    minWidth: 200,
    alignItems: 'center'
  },
  startButton: {
    backgroundColor: '#00FF00'
  },
  stopButton: {
    backgroundColor: '#FF0000'
  },
  controlButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000'
  },
  instructionsContainer: {
    position: 'absolute',
    bottom: 150,
    left: 20,
    right: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    padding: 20,
    borderRadius: 10
  },
  instructionsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFF',
    marginBottom: 10
  },
  instructionsText: {
    fontSize: 14,
    color: '#FFF',
    marginVertical: 3
  },
  loadingText: {
    fontSize: 18,
    color: '#FFF',
    marginTop: 20
  },
  loadingSubtext: {
    fontSize: 14,
    color: '#AAA',
    marginTop: 10
  },
  errorText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FF0000',
    marginBottom: 10
  },
  errorSubtext: {
    fontSize: 14,
    color: '#AAA',
    textAlign: 'center',
    marginBottom: 30
  },
  button: {
    backgroundColor: '#007AFF',
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 8
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFF'
  }
});

/**
 * VisionForm TypeScript Type Definitions
 * Comprehensive types for pose detection, exercises, and form analysis
 */

// ============================================
// POSE DETECTION TYPES
// ============================================

/**
 * Single keypoint from pose detection
 * Represents a body landmark (e.g., shoulder, knee, ankle)
 */
export interface Keypoint {
  /** X coordinate (0-1 normalized or pixel value) */
  x: number;
  /** Y coordinate (0-1 normalized or pixel value) */
  y: number;
  /** Optional Z coordinate for depth */
  z?: number;
  /** Confidence score (0-1) indicating detection reliability */
  score?: number;
  /** Confidence (Vision Framework term, alias for score) */
  confidence?: number;
  /** Name of the body part */
  part?: string;
  /** Keypoint name (Vision Framework format) */
  name?: VisionKeypointName;
}

/**
 * Complete pose detected from a single frame
 * Contains all body keypoints and overall confidence
 */
export interface Pose {
  /** Array of detected keypoints (17 for PoseNet, 19 for Vision) */
  keypoints: Keypoint[];
  /** Overall pose confidence score (0-1) */
  score?: number;
}

// ============================================
// VISION FRAMEWORK TYPES
// ============================================

/**
 * Vision Framework keypoint names (19 keypoints)
 * Mapped from VNHumanBodyPoseObservation.JointName
 */
export type VisionKeypointName =
  | 'nose'
  | 'left_eye'
  | 'right_eye'
  | 'left_ear'
  | 'right_ear'
  | 'neck'
  | 'left_shoulder'
  | 'right_shoulder'
  | 'left_elbow'
  | 'right_elbow'
  | 'left_wrist'
  | 'right_wrist'
  | 'root'
  | 'left_hip'
  | 'right_hip'
  | 'left_knee'
  | 'right_knee'
  | 'left_ankle'
  | 'right_ankle';

/**
 * Mapping from Vision Framework keypoints to extended keypoint indices
 * Extended from 17 (PoseNet) to 19 to preserve neck and root keypoints
 * Used for backwards compatibility with existing angle calculations
 */
export const VISION_TO_POSENET_INDEX: Record<VisionKeypointName, number> = {
  'nose': 0,
  'left_eye': 1,
  'right_eye': 2,
  'left_ear': 3,
  'right_ear': 4,
  'left_shoulder': 5,
  'right_shoulder': 6,
  'left_elbow': 7,
  'right_elbow': 8,
  'left_wrist': 9,
  'right_wrist': 10,
  'left_hip': 11,
  'right_hip': 12,
  'left_knee': 13,
  'right_knee': 14,
  'left_ankle': 15,
  'right_ankle': 16,
  // Extended keypoints (preserved from Vision Framework)
  'neck': 17,   // Dedicated slot for neck (between shoulders and head)
  'root': 18,   // Dedicated slot for pelvis center (center of hips)
};

/** Total number of keypoints (extended from 17 PoseNet to 19 Vision) */
export const KEYPOINT_COUNT = 19;

// ============================================
// EXERCISE ANALYSIS TYPES
// ============================================

/**
 * Calculated angles for exercise analysis
 * Key joint angles used to validate form
 */
export interface ExerciseAngles {
  /** Hip angle (shoulder-hip-knee) in degrees */
  hip: number;
  /** Knee angle (hip-knee-ankle) in degrees */
  knee: number;
  /** Ankle angle (knee-ankle-toe) in degrees */
  ankle: number;
  /** Back angle (shoulder-hip-vertical) in degrees */
  back?: number;
  /** Elbow angle for pushups (shoulder-elbow-wrist) */
  elbow?: number;
  /** Shoulder angle for planks (back-shoulder-arm) */
  shoulder?: number;
}

/**
 * Real-time form feedback message
 * Displayed to user during exercise
 */
export interface FormFeedback {
  /** Feedback severity */
  type: 'good' | 'warning' | 'error';
  /** Human-readable coaching message */
  message: string;
  /** Optional specific angle that triggered feedback */
  angle?: keyof ExerciseAngles;
  /** Actual angle value */
  value?: number;
}

// ============================================
// EXERCISE DEFINITION TYPES
// ============================================

/**
 * Target angle range for form validation
 */
export interface AngleTarget {
  /** Minimum acceptable angle in degrees */
  min: number;
  /** Maximum acceptable angle in degrees */
  max: number;
  /** Ideal/perfect angle in degrees */
  ideal: number;
  /** Degrees of deviation before score drops to 0 (default: 20) */
  tolerance?: number;
  /** Importance weight for form scoring 0.0-1.0 (default: 1.0) */
  weight?: number;
}

/**
 * Exercise configuration and validation rules
 */
export interface Exercise {
  /** Unique exercise identifier */
  id: string;
  /** Display name */
  name: string;
  /** Short description */
  description: string;
  /** Difficulty level */
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  /** Icon name (optional, for UI display) */
  icon?: string;
  /** Target muscles (alias for muscleGroups, for backwards compatibility) */
  targetMuscles?: string[];
  /** Target angles for form validation */
  targetAngles: {
    [K in keyof ExerciseAngles]?: AngleTarget;
  };
  /** Step-by-step instructions */
  instructions: string[];
  /** Muscle groups targeted */
  muscleGroups: string[];
  /** Rep detection thresholds */
  repDetection: {
    /** Knee angle when in "down" position */
    downThreshold: number;
    /** Knee angle when in "up" position */
    upThreshold: number;
    /** Minimum time in bottom position (ms) */
    minBottomTime?: number;
  };
  /** Common mistakes to detect */
  commonMistakes?: Array<{
    id: string;
    description: string;
    check: (angles: ExerciseAngles) => boolean;
  }>;
}

// ============================================
// REP COUNTING TYPES
// ============================================

/**
 * Rep phase state machine
 */
export type RepPhase = 'ready' | 'going_down' | 'bottom' | 'going_up';

/**
 * Rep counter state
 */
export interface RepCounterState {
  /** Current rep count */
  count: number;
  /** Current phase in rep cycle */
  phase: RepPhase;
  /** Timestamp when entered current phase */
  phaseStartTime: number;
  /** Whether last rep was completed successfully */
  lastRepSuccessful: boolean;
}

// ============================================
// SESSION TYPES
// ============================================

/**
 * Completed workout session
 * Saved to AsyncStorage for history tracking
 */
export interface WorkoutSession {
  /** Unique session ID */
  id: string;
  /** Exercise performed */
  exerciseId: string;
  /** Exercise name */
  exerciseName: string;
  /** Session start timestamp */
  startTime: Date;
  /** Session end timestamp */
  endTime: Date;
  /** Total reps completed */
  totalReps: number;
  /** Average form score (0-100) */
  averageFormScore: number;
  /** Per-rep form scores */
  repScores: number[];
  /** Session duration in seconds */
  duration: number;
  /** Notable achievements */
  achievements?: string[];
}

/**
 * User statistics across all sessions
 */
export interface UserStats {
  /** Total reps across all time */
  totalReps: number;
  /** Total workout sessions */
  totalSessions: number;
  /** Current streak (consecutive days) */
  currentStreak: number;
  /** Longest streak ever */
  longestStreak: number;
  /** Last workout date */
  lastWorkoutDate?: Date;
  /** Favorite exercise */
  favoriteExercise?: string;
  /** Personal records */
  personalRecords: {
    [exerciseId: string]: {
      maxReps: number;
      bestFormScore: number;
      date: Date;
    };
  };
}

// ============================================
// UI STATE TYPES
// ============================================

/**
 * Camera screen state
 */
export interface CameraScreenState {
  /** Camera is initialized and ready */
  cameraReady: boolean;
  /** TensorFlow models loaded */
  tfReady: boolean;
  /** Currently detected pose */
  currentPose: Pose | null;
  /** Currently calculated angles */
  currentAngles: ExerciseAngles | null;
  /** Current form feedback messages */
  formFeedback: FormFeedback[];
  /** Rep counter state */
  repCounter: RepCounterState;
  /** Session start time */
  sessionStartTime: Date | null;
  /** Whether session is active */
  sessionActive: boolean;
}

/**
 * Navigation screen names
 */
export type ScreenName = 'Home' | 'Camera' | 'Results';

/**
 * Navigation params for each screen
 */
export type NavigationParams = {
  Home: undefined;
  Camera: {
    exerciseId: string;
    exerciseName: string;
  };
  Results: {
    session: WorkoutSession;
  };
};

// ============================================
// TENSORFLOW TYPES
// ============================================

/**
 * TensorFlow initialization status
 */
export interface TFStatus {
  initialized: boolean;
  backend: string;
  modelLoaded: boolean;
  error?: string;
}

/**
 * Pose detection configuration
 */
export interface PoseDetectionConfig {
  /** Model architecture (default: MobileNetV1) */
  architecture: 'MobileNetV1' | 'ResNet50';
  /** Output stride (8, 16, or 32) - lower is more accurate but slower */
  outputStride: 8 | 16 | 32;
  /** Input resolution for the model */
  inputResolution: { width: number; height: number };
  /** Model multiplier (0.5, 0.75, 1.0) - smaller is faster */
  multiplier: number;
  /** Quantization bytes (2 or 4) */
  quantBytes: number;
}

// ============================================
// EXERCISE TYPES
// ============================================

/**
 * Supported exercise types
 */
export type ExerciseType = 'squat' | 'pushup' | 'plank';

// ============================================
// NAVIGATION TYPES
// ============================================

/**
 * Root navigation stack parameter list
 * Defines all screens and their required parameters
 */
export type RootStackParamList = {
  /** Home screen - Exercise selection */
  Home: undefined;
  /** Camera screen - Active workout session */
  Camera: {
    exerciseType: ExerciseType;
  };
  /** Results screen - Post-workout summary */
  Results: {
    exerciseType: ExerciseType;
    repCount: number;
    duration: number;
    averageFormScore: number;
  };
};

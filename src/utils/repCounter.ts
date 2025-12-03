/**
 * Rep Counter Utility
 * State machine for detecting and counting exercise repetitions
 */

import { RepPhase, RepCounterState, ExerciseAngles } from '../types';

/**
 * Rep Counter Configuration
 * Allows customization per exercise type
 */
export interface RepCounterConfig {
  /** Which angle to track (e.g., 'knee' for squats, 'elbow' for pushups) */
  angleType: keyof ExerciseAngles;
  /** Angle threshold for "down" position */
  downThreshold: number;
  /** Angle threshold for "up" position */
  upThreshold: number;
  /** Angle threshold to detect start of descent */
  startDescentThreshold: number;
  /** Angle threshold to abort descent (went back up without completing) */
  abortThreshold: number;
  /** Minimum time in bottom position (ms) */
  minBottomTime: number;
}

/**
 * Rep Counter Class
 * Tracks exercise repetitions using a state machine
 * Transitions: ready → going_down → bottom → going_up → ready (rep counted!)
 *
 * Now supports configurable angle type for different exercises:
 * - Squats: tracks knee angle
 * - Pushups: tracks elbow angle
 */
export class RepCounter {
  private state: RepCounterState;
  private config: RepCounterConfig;

  /**
   * Initialize rep counter
   * @param config Configuration for the rep counter (angle type, thresholds, etc.)
   */
  constructor(config: Partial<RepCounterConfig> = {}) {
    // Default configuration (squat-style)
    this.config = {
      angleType: config.angleType ?? 'knee',
      downThreshold: config.downThreshold ?? 100,
      upThreshold: config.upThreshold ?? 160,
      startDescentThreshold: config.startDescentThreshold ?? 140,
      abortThreshold: config.abortThreshold ?? 150,
      minBottomTime: config.minBottomTime ?? 200,
    };

    this.state = {
      count: 0,
      phase: 'ready',
      phaseStartTime: Date.now(),
      lastRepSuccessful: false,
    };
  }

  /**
   * Update rep counter with new angle measurements
   * @param angles Current exercise angles
   * @returns Updated state with rep count
   */
  update(angles: ExerciseAngles): RepCounterState {
    const now = Date.now();
    // Use configurable angle type instead of hardcoded knee angle
    const trackingAngle = angles[this.config.angleType];
    const timeInPhase = now - this.state.phaseStartTime;

    // Skip update if the required angle is not available
    if (trackingAngle === undefined) {
      return { ...this.state };
    }

    // State machine transitions using configured thresholds
    switch (this.state.phase) {
      case 'ready':
        // Waiting for descent to begin
        if (trackingAngle < this.config.startDescentThreshold) {
          this.transitionTo('going_down', now);
        }
        break;

      case 'going_down':
        // Descending into exercise position
        if (trackingAngle < this.config.downThreshold) {
          this.transitionTo('bottom', now);
        } else if (trackingAngle > this.config.abortThreshold) {
          // Aborted descent, back to ready
          this.transitionTo('ready', now);
        }
        break;

      case 'bottom':
        // At bottom position
        if (trackingAngle > this.config.downThreshold + 10 && timeInPhase >= this.config.minBottomTime) {
          // Started ascending and spent minimum time at bottom
          this.transitionTo('going_up', now);
        } else if (trackingAngle > this.config.abortThreshold && timeInPhase < this.config.minBottomTime) {
          // Didn't hold bottom long enough - invalid rep
          this.state.lastRepSuccessful = false;
          this.transitionTo('ready', now);
        }
        break;

      case 'going_up':
        // Ascending from exercise
        if (trackingAngle > this.config.upThreshold) {
          // Reached top - count the rep!
          this.state.count++;
          this.state.lastRepSuccessful = true;
          this.transitionTo('ready', now);
        } else if (trackingAngle < this.config.downThreshold) {
          // Started going back down before reaching top - invalid
          this.state.lastRepSuccessful = false;
          this.transitionTo('bottom', now);
        }
        break;
    }

    return { ...this.state };
  }

  /**
   * Transition to a new phase
   * @param newPhase Phase to transition to
   * @param timestamp Current timestamp
   */
  private transitionTo(newPhase: RepPhase, timestamp: number): void {
    this.state.phase = newPhase;
    this.state.phaseStartTime = timestamp;
  }

  /**
   * Reset counter to initial state
   */
  reset(): void {
    this.state = {
      count: 0,
      phase: 'ready',
      phaseStartTime: Date.now(),
      lastRepSuccessful: false,
    };
  }

  /**
   * Get current rep count
   */
  getCount(): number {
    return this.state.count;
  }

  /**
   * Get current phase
   */
  getPhase(): RepPhase {
    return this.state.phase;
  }

  /**
   * Get full state
   */
  getState(): RepCounterState {
    return { ...this.state };
  }

  /**
   * Get current configuration
   */
  getConfig(): RepCounterConfig {
    return { ...this.config };
  }

  /**
   * Get which angle type is being tracked
   */
  getAngleType(): keyof ExerciseAngles {
    return this.config.angleType;
  }

  /**
   * Check if currently in a valid rep
   * (not in ready state)
   */
  isActiveRep(): boolean {
    return this.state.phase !== 'ready';
  }

  /**
   * Get progress through current rep (0-100%)
   * Useful for UI visualization
   */
  getRepProgress(): number {
    switch (this.state.phase) {
      case 'ready':
        return 0;
      case 'going_down':
        return 25;
      case 'bottom':
        return 50;
      case 'going_up':
        return 75;
      default:
        return 0;
    }
  }

  /**
   * Get human-readable phase description
   */
  getPhaseDescription(): string {
    switch (this.state.phase) {
      case 'ready':
        return 'Ready';
      case 'going_down':
        return 'Going Down';
      case 'bottom':
        return 'Hold';
      case 'going_up':
        return 'Push Up';
      default:
        return 'Unknown';
    }
  }
}

/**
 * Create a rep counter configured for squats
 * Tracks KNEE angle for rep counting
 */
export function createSquatRepCounter(): RepCounter {
  return new RepCounter({
    angleType: 'knee',           // Track knee angle for squats
    downThreshold: 100,          // knee < 100° = full squat depth
    upThreshold: 160,            // knee > 160° = standing
    startDescentThreshold: 140,  // Start tracking when knee < 140°
    abortThreshold: 150,         // Abort if knee > 150° before reaching bottom
    minBottomTime: 200,          // Hold 200ms at bottom
  });
}

/**
 * Create a rep counter configured for pushups
 * Tracks ELBOW angle for rep counting (FIXED: was incorrectly using knee)
 */
export function createPushupRepCounter(): RepCounter {
  return new RepCounter({
    angleType: 'elbow',          // Track elbow angle for pushups
    downThreshold: 90,           // elbow < 90° = chest near ground
    upThreshold: 170,            // elbow > 170° = arms fully extended
    startDescentThreshold: 150,  // Start tracking when elbow < 150°
    abortThreshold: 160,         // Abort if elbow > 160° before reaching bottom
    minBottomTime: 100,          // Hold 100ms at bottom
  });
}

/**
 * Create a rep counter configured for planks
 * Planks are static holds - no rep counting, just duration
 */
export function createPlankRepCounter(): RepCounter {
  return new RepCounter({
    angleType: 'back',           // Track back angle for plank form
    downThreshold: 0,            // Not used for planks
    upThreshold: 180,            // Not used for planks
    startDescentThreshold: 0,    // Not used for planks
    abortThreshold: 180,         // Not used for planks
    minBottomTime: 0,            // Not used for planks
  });
}

/**
 * Create a rep counter configured for generic exercises
 * @param exerciseId Exercise identifier
 * @returns Configured rep counter with appropriate angle type
 */
export function createRepCounterForExercise(exerciseId: string): RepCounter {
  switch (exerciseId) {
    case 'squat':
      return createSquatRepCounter();
    case 'pushup':
      return createPushupRepCounter();
    case 'plank':
      return createPlankRepCounter();
    default:
      return new RepCounter(); // Default configuration (squat-style with knee)
  }
}

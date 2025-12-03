/**
 * Exercise Definitions
 * Configuration for each supported exercise type
 */

import { Exercise } from '../types';

/**
 * SQUAT Exercise Definition
 * Bodyweight squat with full range of motion
 */
export const squatExercise: Exercise = {
  id: 'squat',
  name: 'Bodyweight Squat',
  description: 'Stand with feet shoulder-width apart, lower down keeping chest up and knees tracking over toes.',
  difficulty: 'beginner',
  icon: '🏋️',
  targetMuscles: ['Quadriceps', 'Glutes', 'Hamstrings', 'Core'],

  // Target angles for form validation
  // Each angle has tolerance (degrees before score=0) and weight (importance)
  targetAngles: {
    hip: {
      min: 80,
      max: 100,
      ideal: 90,
      tolerance: 20,  // Important for power transfer
      weight: 0.7,
    },
    knee: {
      min: 70,
      max: 110,
      ideal: 90,
      tolerance: 25,  // Critical - determines squat depth
      weight: 1.0,
    },
    back: {
      min: 45,
      max: 70,
      ideal: 55,
      tolerance: 15,  // Safety-related - spinal health
      weight: 0.8,
    },
  },

  // Step-by-step instructions
  instructions: [
    'Stand with feet shoulder-width apart',
    'Keep your chest up and core engaged',
    'Lower down by bending knees and hips',
    'Go until thighs are parallel to ground',
    'Push through heels to return to start',
    'Keep knees tracking over toes throughout',
  ],

  // Muscle groups worked
  muscleGroups: ['Quadriceps', 'Glutes', 'Hamstrings', 'Core'],

  // Rep detection configuration
  repDetection: {
    downThreshold: 100,  // knee angle < 100° = bottom position
    upThreshold: 160,    // knee angle > 160° = standing position
    minBottomTime: 200,  // must hold bottom for 200ms
  },

  // Common mistakes to detect
  commonMistakes: [
    {
      id: 'knees_over_toes',
      description: 'Knees extending too far past toes',
      check: (angles) => {
        // If knee angle is very acute, knees might be too forward
        return angles.knee < 60;
      },
    },
    {
      id: 'back_too_forward',
      description: 'Leaning too far forward',
      check: (angles) => {
        // If back angle > 75°, leaning too much
        return (angles.back ?? 0) > 75;
      },
    },
    {
      id: 'not_deep_enough',
      description: 'Not going deep enough',
      check: (angles) => {
        // If knee angle stays > 120° at bottom, too shallow
        return angles.knee > 120;
      },
    },
    {
      id: 'back_rounding',
      description: 'Rounding your back',
      check: (angles) => {
        // If back angle < 35°, spine might be rounding
        return (angles.back ?? 90) < 35;
      },
    },
  ],
};

/**
 * PUSHUP Exercise Definition
 * Standard pushup with full range of motion
 */
export const pushupExercise: Exercise = {
  id: 'pushup',
  name: 'Pushup',
  description: 'Start in plank position, lower chest to ground, push back up keeping body straight.',
  difficulty: 'intermediate',
  icon: '💪',
  targetMuscles: ['Chest', 'Triceps', 'Shoulders', 'Core'],

  // Each angle has tolerance (degrees before score=0) and weight (importance)
  targetAngles: {
    elbow: {
      min: 80,
      max: 100,
      ideal: 90,
      tolerance: 20,  // Critical - determines pushup depth
      weight: 1.0,
    },
    back: {
      min: 160,
      max: 180,
      ideal: 170,
      tolerance: 10,  // Core stability - strict tolerance
      weight: 0.9,
    },
  },

  instructions: [
    'Start in high plank position',
    'Hands slightly wider than shoulders',
    'Keep body in straight line',
    'Lower chest toward ground',
    'Push back up to start position',
    'Keep core engaged throughout',
  ],

  muscleGroups: ['Chest', 'Triceps', 'Shoulders', 'Core'],

  repDetection: {
    downThreshold: 90,   // elbow < 90° = chest near ground
    upThreshold: 170,    // elbow > 170° = arms extended
    minBottomTime: 100,
  },

  commonMistakes: [
    {
      id: 'hips_sagging',
      description: 'Hips sagging down',
      check: (angles) => {
        return (angles.back ?? 180) < 150;
      },
    },
    {
      id: 'hips_too_high',
      description: 'Hips too high (pike position)',
      check: (angles) => {
        return (angles.hip ?? 180) < 140;
      },
    },
    {
      id: 'not_lowering_enough',
      description: 'Not lowering chest enough',
      check: (angles) => {
        return angles.elbow! > 120;
      },
    },
  ],
};

/**
 * PLANK Exercise Definition
 * Hold static plank position
 */
export const plankExercise: Exercise = {
  id: 'plank',
  name: 'Plank Hold',
  description: 'Hold a straight body position on forearms and toes.',
  difficulty: 'beginner',
  icon: '🧘',
  targetMuscles: ['Core', 'Shoulders', 'Glutes'],

  // Each angle has tolerance (degrees before score=0) and weight (importance)
  targetAngles: {
    back: {
      min: 165,
      max: 180,
      ideal: 175,
      tolerance: 10,  // Core stability - strict tolerance
      weight: 1.0,
    },
    hip: {
      min: 160,
      max: 180,
      ideal: 175,
      tolerance: 15,  // Body alignment
      weight: 0.8,
    },
  },

  instructions: [
    'Start on forearms and toes',
    'Elbows directly under shoulders',
    'Keep body in straight line',
    'Engage core and glutes',
    'Hold position',
    'Breathe steadily',
  ],

  muscleGroups: ['Core', 'Shoulders', 'Glutes'],

  repDetection: {
    downThreshold: 0,    // Not applicable for holds
    upThreshold: 0,      // Not applicable for holds
    minBottomTime: 0,
  },

  commonMistakes: [
    {
      id: 'hips_sagging',
      description: 'Hips sagging toward ground',
      check: (angles) => {
        return (angles.back ?? 180) < 160;
      },
    },
    {
      id: 'hips_too_high',
      description: 'Hips too high',
      check: (angles) => {
        return (angles.hip ?? 180) < 150;
      },
    },
  ],
};

/**
 * All available exercises
 */
export const exercises: Exercise[] = [
  squatExercise,
  pushupExercise,
  plankExercise,
];

/**
 * Exercise mapping by type (for quick lookup)
 * Used by CameraScreen and other components
 */
export const EXERCISES: Record<string, Exercise> = {
  squat: squatExercise,
  pushup: pushupExercise,
  plank: plankExercise,
};

/**
 * Get exercise by ID
 * @param id Exercise identifier
 * @returns Exercise configuration or undefined
 */
export function getExerciseById(id: string): Exercise | undefined {
  return exercises.find(ex => ex.id === id);
}

/**
 * Get exercises by difficulty level
 * @param difficulty Difficulty filter
 * @returns Filtered array of exercises
 */
export function getExercisesByDifficulty(
  difficulty: 'beginner' | 'intermediate' | 'advanced'
): Exercise[] {
  return exercises.filter(ex => ex.difficulty === difficulty);
}

/**
 * Get all exercise IDs
 * @returns Array of exercise IDs
 */
export function getAllExerciseIds(): string[] {
  return exercises.map(ex => ex.id);
}

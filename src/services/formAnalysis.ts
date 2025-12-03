/**
 * Form Analysis Service
 * Validates exercise form and generates real-time feedback
 */

import { Exercise, ExerciseAngles, FormFeedback } from '../types';

/**
 * Analyze exercise form and generate feedback
 * Compares actual angles against target ranges
 *
 * @param angles Current calculated angles
 * @param exercise Exercise configuration
 * @returns Array of feedback messages (empty if form is perfect)
 */
export function analyzeForm(
  angles: ExerciseAngles,
  exercise: Exercise
): FormFeedback[] {
  const feedback: FormFeedback[] = [];

  // Check each target angle
  Object.entries(exercise.targetAngles).forEach(([angleName, target]) => {
    const actualAngle = angles[angleName as keyof ExerciseAngles];

    if (actualAngle === undefined) return;

    const key = angleName as keyof ExerciseAngles;

    // Check if angle is out of acceptable range
    if (actualAngle < target.min) {
      feedback.push({
        type: 'warning',
        message: getAngleFeedback(key, 'too_low', exercise.id),
        angle: key,
        value: actualAngle,
      });
    } else if (actualAngle > target.max) {
      feedback.push({
        type: 'warning',
        message: getAngleFeedback(key, 'too_high', exercise.id),
        angle: key,
        value: actualAngle,
      });
    }
  });

  // Check for common mistakes
  if (exercise.commonMistakes) {
    exercise.commonMistakes.forEach(mistake => {
      if (mistake.check(angles)) {
        feedback.push({
          type: 'error',
          message: mistake.description,
        });
      }
    });
  }

  // If no issues found, give positive feedback
  if (feedback.length === 0) {
    feedback.push({
      type: 'good',
      message: getPositiveFeedback(exercise.id),
    });
  }

  return feedback;
}

/**
 * Generate feedback message for specific angle issues
 * @param angle Which angle is problematic
 * @param issue Whether angle is too high or too low
 * @param exerciseId Current exercise
 * @returns Human-readable feedback message
 */
function getAngleFeedback(
  angle: keyof ExerciseAngles,
  issue: 'too_low' | 'too_high',
  exerciseId: string
): string {
  // Squat-specific feedback
  if (exerciseId === 'squat') {
    if (angle === 'knee') {
      if (issue === 'too_low') {
        return 'Excellent depth!';
      } else {
        return 'Go deeper - thighs parallel to ground';
      }
    }

    if (angle === 'hip') {
      if (issue === 'too_low') {
        return 'Hinging too much - keep chest up';
      } else {
        return 'Good hip hinge!';
      }
    }

    if (angle === 'back') {
      if (issue === 'too_low') {
        return 'Keep your back straighter';
      } else {
        return 'Leaning too far forward';
      }
    }
  }

  // Pushup-specific feedback
  if (exerciseId === 'pushup') {
    if (angle === 'elbow') {
      if (issue === 'too_low') {
        return 'Great depth!';
      } else {
        return 'Lower your chest more';
      }
    }

    if (angle === 'back') {
      if (issue === 'too_low') {
        return 'Hips sagging - engage core!';
      } else {
        return 'Perfect plank position!';
      }
    }
  }

  // Plank-specific feedback
  if (exerciseId === 'plank') {
    if (angle === 'back') {
      if (issue === 'too_low') {
        return 'Hips sagging - squeeze glutes!';
      } else {
        return 'Perfect straight line!';
      }
    }

    if (angle === 'hip') {
      if (issue === 'too_low') {
        return 'Hips too high - lower down';
      } else {
        return 'Great body alignment!';
      }
    }
  }

  // Generic feedback
  return issue === 'too_low'
    ? `${angle} angle too low`
    : `${angle} angle too high`;
}

/**
 * Get positive encouragement message
 * @param exerciseId Current exercise
 * @returns Motivational message
 */
function getPositiveFeedback(exerciseId: string): string {
  const messages = {
    squat: [
      'Perfect form!',
      'Excellent depth!',
      'Great squat!',
      'Looking strong!',
      'Nice control!',
    ],
    pushup: [
      'Perfect form!',
      'Great pushup!',
      'Strong chest!',
      'Excellent control!',
      'Keep it up!',
    ],
    plank: [
      'Perfect hold!',
      'Great core engagement!',
      'Straight as an arrow!',
      'Solid form!',
      'Stay strong!',
    ],
  };

  const exerciseMessages = messages[exerciseId as keyof typeof messages] || [
    'Good form!',
    'Keep going!',
    'Looking good!',
  ];

  // Return random message
  return exerciseMessages[
    Math.floor(Math.random() * exerciseMessages.length)
  ];
}

/**
 * Calculate overall form score (0-100)
 * Based on how close angles are to ideal targets
 * Uses per-angle tolerance and weight for accurate scoring
 *
 * @param angles Current calculated angles
 * @param exercise Exercise configuration
 * @returns Score from 0-100
 */
export function calculateFormScore(
  angles: ExerciseAngles,
  exercise: Exercise
): number {
  let totalScore = 0;
  let totalWeight = 0;

  Object.entries(exercise.targetAngles).forEach(([angleName, target]) => {
    const actualAngle = angles[angleName as keyof ExerciseAngles];

    if (actualAngle === undefined || !target) return;

    // Use per-angle tolerance (default: 20°) and weight (default: 1.0)
    const tolerance = target.tolerance ?? 20;
    const weight = target.weight ?? 1.0;

    // Calculate how far from ideal (in degrees)
    const deviation = Math.abs(actualAngle - target.ideal);

    // Score decays linearly from 100 to 0 over tolerance range
    const score = Math.max(0, 100 - (deviation / tolerance) * 100);

    // Apply weight to score
    totalScore += score * weight;
    totalWeight += weight;
  });

  return totalWeight > 0 ? Math.round(totalScore / totalWeight) : 0;
}

/**
 * Get the most important feedback to show
 * Prioritizes errors > warnings > good
 *
 * @param feedback Array of all feedback
 * @returns Single most important message
 */
export function getPrimaryFeedback(feedback: FormFeedback[]): FormFeedback | null {
  if (feedback.length === 0) return null;

  // Prioritize errors first
  const errors = feedback.filter(f => f.type === 'error');
  if (errors.length > 0) return errors[0];

  // Then warnings
  const warnings = feedback.filter(f => f.type === 'warning');
  if (warnings.length > 0) return warnings[0];

  // Finally positive feedback
  const good = feedback.filter(f => f.type === 'good');
  return good[0] || null;
}

/**
 * Determine feedback color for UI
 * @param type Feedback type
 * @returns Color code
 */
export function getFeedbackColor(type: FormFeedback['type']): string {
  switch (type) {
    case 'good':
      return '#10B981'; // Green
    case 'warning':
      return '#F59E0B'; // Amber
    case 'error':
      return '#EF4444'; // Red
    default:
      return '#FFFFFF'; // White
  }
}

/**
 * Determine skeleton overlay color based on form quality
 * @param formScore Overall form score (0-100)
 * @returns Color code for skeleton
 */
export function getSkeletonColor(formScore: number): string {
  if (formScore >= 80) return '#10B981'; // Green - good form
  if (formScore >= 60) return '#F59E0B'; // Amber - okay form
  return '#EF4444'; // Red - poor form
}

/**
 * Check if form is safe to continue
 * Prevents counting reps with dangerous form
 *
 * @param feedback Array of feedback messages
 * @returns True if form is safe
 */
export function isSafeForm(feedback: FormFeedback[]): boolean {
  // If there are any errors, form is not safe
  return !feedback.some(f => f.type === 'error');
}

/**
 * Generate end-of-session summary feedback
 * @param repScores Array of form scores for each rep
 * @returns Summary message
 */
export function generateSessionSummary(repScores: number[]): string {
  if (repScores.length === 0) {
    return 'No reps completed';
  }

  const averageScore = repScores.reduce((a, b) => a + b, 0) / repScores.length;
  const bestRep = Math.max(...repScores);
  const worstRep = Math.min(...repScores);

  if (averageScore >= 90) {
    return `Excellent session! Average form: ${Math.round(averageScore)}%`;
  } else if (averageScore >= 75) {
    return `Great work! Average form: ${Math.round(averageScore)}%. Keep it up!`;
  } else if (averageScore >= 60) {
    return `Good effort! Average form: ${Math.round(averageScore)}%. Focus on technique!`;
  } else {
    return `Keep practicing! Average form: ${Math.round(averageScore)}%. Quality over quantity!`;
  }
}

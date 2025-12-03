/**
 * Skeleton Overlay Component
 *
 * Renders a visual skeleton overlay on top of the camera feed to show
 * detected body pose. Color-codes the skeleton based on form quality:
 * - Green: Good form
 * - Amber: Warning (minor issues)
 * - Red: Error (bad form)
 *
 * @module components/SkeletonOverlay
 */

import React from 'react';
import { StyleSheet } from 'react-native';
import Svg, { Line, Circle } from 'react-native-svg';
import type { Pose, Keypoint } from '../types';

// Extended keypoint indices (19 keypoints - preserved neck and root from Vision Framework)
const KEYPOINT_INDICES = {
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
  NECK: 17,    // NEW: Preserved from Vision Framework
  ROOT: 18     // NEW: Pelvis center from Vision Framework
};

// Define body connections (which keypoints connect to which)
const SKELETON_CONNECTIONS: [number, number][] = [
  // Face
  [KEYPOINT_INDICES.NOSE, KEYPOINT_INDICES.LEFT_EYE],
  [KEYPOINT_INDICES.NOSE, KEYPOINT_INDICES.RIGHT_EYE],
  [KEYPOINT_INDICES.LEFT_EYE, KEYPOINT_INDICES.LEFT_EAR],
  [KEYPOINT_INDICES.RIGHT_EYE, KEYPOINT_INDICES.RIGHT_EAR],

  // Neck (NEW: connects head to shoulders)
  [KEYPOINT_INDICES.NECK, KEYPOINT_INDICES.NOSE],           // Neck to head
  [KEYPOINT_INDICES.NECK, KEYPOINT_INDICES.LEFT_SHOULDER],  // Neck to left shoulder
  [KEYPOINT_INDICES.NECK, KEYPOINT_INDICES.RIGHT_SHOULDER], // Neck to right shoulder

  // Torso
  [KEYPOINT_INDICES.LEFT_SHOULDER, KEYPOINT_INDICES.RIGHT_SHOULDER],
  [KEYPOINT_INDICES.LEFT_SHOULDER, KEYPOINT_INDICES.LEFT_HIP],
  [KEYPOINT_INDICES.RIGHT_SHOULDER, KEYPOINT_INDICES.RIGHT_HIP],
  [KEYPOINT_INDICES.LEFT_HIP, KEYPOINT_INDICES.RIGHT_HIP],

  // Root/Pelvis connections (NEW: connects pelvis center to hips)
  [KEYPOINT_INDICES.ROOT, KEYPOINT_INDICES.LEFT_HIP],
  [KEYPOINT_INDICES.ROOT, KEYPOINT_INDICES.RIGHT_HIP],

  // Left arm
  [KEYPOINT_INDICES.LEFT_SHOULDER, KEYPOINT_INDICES.LEFT_ELBOW],
  [KEYPOINT_INDICES.LEFT_ELBOW, KEYPOINT_INDICES.LEFT_WRIST],

  // Right arm
  [KEYPOINT_INDICES.RIGHT_SHOULDER, KEYPOINT_INDICES.RIGHT_ELBOW],
  [KEYPOINT_INDICES.RIGHT_ELBOW, KEYPOINT_INDICES.RIGHT_WRIST],

  // Left leg
  [KEYPOINT_INDICES.LEFT_HIP, KEYPOINT_INDICES.LEFT_KNEE],
  [KEYPOINT_INDICES.LEFT_KNEE, KEYPOINT_INDICES.LEFT_ANKLE],

  // Right leg
  [KEYPOINT_INDICES.RIGHT_HIP, KEYPOINT_INDICES.RIGHT_KNEE],
  [KEYPOINT_INDICES.RIGHT_KNEE, KEYPOINT_INDICES.RIGHT_ANKLE]
];

// Minimum confidence threshold for displaying keypoints
const MIN_CONFIDENCE = 0.5;

interface SkeletonOverlayProps {
  pose: Pose;
  width: number;
  height: number;
  color: string;  // Color based on form quality
}

/**
 * Skeleton Overlay Component
 * Renders detected pose as a skeleton on top of camera feed
 */
export const SkeletonOverlay: React.FC<SkeletonOverlayProps> = ({
  pose,
  width,
  height,
  color
}) => {
  // Filter keypoints by confidence
  const reliableKeypoints = pose.keypoints.filter(
    kp => kp.score !== undefined && kp.score >= MIN_CONFIDENCE
  );

  // Helper to check if a keypoint is reliable
  const isReliable = (index: number): boolean => {
    const kp = pose.keypoints[index];
    return kp && kp.score !== undefined && kp.score >= MIN_CONFIDENCE;
  };

  // Helper to get keypoint
  const getKeypoint = (index: number): Keypoint | null => {
    return pose.keypoints[index] || null;
  };

  return (
    <Svg
      width={width}
      height={height}
      style={StyleSheet.absoluteFill}
      pointerEvents="none"  // Allow touches to pass through
    >
      {/* Draw skeleton lines (connections between keypoints) */}
      {SKELETON_CONNECTIONS.map(([startIdx, endIdx], index) => {
        const start = getKeypoint(startIdx);
        const end = getKeypoint(endIdx);

        // Only draw if both keypoints are reliable
        if (!start || !end || !isReliable(startIdx) || !isReliable(endIdx)) {
          return null;
        }

        return (
          <Line
            key={`line-${index}`}
            x1={start.x}
            y1={start.y}
            x2={end.x}
            y2={end.y}
            stroke={color}
            strokeWidth={3}
            strokeLinecap="round"
          />
        );
      })}

      {/* Draw keypoint circles */}
      {reliableKeypoints.map((kp, index) => (
        <Circle
          key={`point-${index}`}
          cx={kp.x}
          cy={kp.y}
          r={6}
          fill={color}
          stroke="#FFFFFF"
          strokeWidth={2}
        />
      ))}
    </Svg>
  );
};

const styles = StyleSheet.create({
  // No styles needed - SVG handles positioning with absoluteFill
});

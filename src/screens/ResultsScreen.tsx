/**
 * Results Screen
 *
 * Post-workout summary screen that displays:
 * - Workout statistics (reps, duration, form score)
 * - Performance breakdown
 * - Option to start another workout or return home
 *
 * @module screens/ResultsScreen
 */

import React from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  SafeAreaView
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../types';
import { EXERCISES } from '../data/exercises';

type Props = NativeStackScreenProps<RootStackParamList, 'Results'>;

/**
 * Stat Card Component
 */
interface StatCardProps {
  icon: string;
  label: string;
  value: string | number;
  subtitle?: string;
  color?: string;
}

const StatCard: React.FC<StatCardProps> = ({
  icon,
  label,
  value,
  subtitle,
  color = '#007AFF'
}) => {
  return (
    <View style={styles.statCard}>
      <Text style={styles.statIcon}>{icon}</Text>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      {subtitle && <Text style={styles.statSubtitle}>{subtitle}</Text>}
    </View>
  );
};

/**
 * Results Screen Component
 */
export const ResultsScreen: React.FC<Props> = ({ route, navigation }) => {
  const { exerciseType, repCount, duration, averageFormScore } = route.params;
  const exercise = EXERCISES[exerciseType];

  // Format duration as MM:SS
  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Calculate form grade
  const getFormGrade = (score: number): { grade: string; color: string } => {
    if (score >= 0.9) return { grade: 'A+', color: '#00AA00' };
    if (score >= 0.8) return { grade: 'A', color: '#00BB00' };
    if (score >= 0.7) return { grade: 'B', color: '#88CC00' };
    if (score >= 0.6) return { grade: 'C', color: '#FFAA00' };
    if (score >= 0.5) return { grade: 'D', color: '#FF8800' };
    return { grade: 'F', color: '#CC0000' };
  };

  // Calculate calories (rough estimate)
  const estimateCalories = (): number => {
    // Simple estimation: ~0.5 calories per rep (varies by exercise)
    const caloriesPerRep = exerciseType === 'squat' ? 0.6 :
                          exerciseType === 'pushup' ? 0.5 :
                          0.3; // plank
    return Math.round(repCount * caloriesPerRep);
  };

  const formGrade = getFormGrade(averageFormScore);
  const calories = estimateCalories();

  /**
   * Handle try again button
   */
  const handleTryAgain = () => {
    navigation.replace('Camera', { exerciseType });
  };

  /**
   * Handle done button
   */
  const handleDone = () => {
    navigation.navigate('Home');
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.completionIcon}>✅</Text>
          <Text style={styles.title}>Workout Complete!</Text>
          <Text style={styles.exerciseName}>{exercise.name}</Text>
        </View>

        {/* Main Stats */}
        <View style={styles.mainStatsContainer}>
          <StatCard
            icon="🔥"
            label="REPS COMPLETED"
            value={repCount}
            color="#007AFF"
          />

          <StatCard
            icon="⏱️"
            label="DURATION"
            value={formatDuration(duration)}
            color="#007AFF"
          />
        </View>

        {/* Form Score */}
        <View style={styles.formScoreContainer}>
          <Text style={styles.formScoreLabel}>FORM QUALITY</Text>
          <View style={styles.formScoreBox}>
            <Text style={[styles.formGrade, { color: formGrade.color }]}>
              {formGrade.grade}
            </Text>
            <Text style={styles.formPercentage}>
              {Math.round(averageFormScore * 100)}%
            </Text>
          </View>
          <Text style={styles.formDescription}>
            {formGrade.grade === 'A+' || formGrade.grade === 'A'
              ? 'Excellent form! Keep up the great work!'
              : formGrade.grade === 'B'
              ? 'Good form! Focus on the feedback for improvement.'
              : formGrade.grade === 'C'
              ? 'Decent form, but there\'s room for improvement.'
              : 'Work on your form for better results and injury prevention.'}
          </Text>
        </View>

        {/* Additional Stats */}
        <View style={styles.additionalStatsContainer}>
          <View style={styles.additionalStatRow}>
            <View style={styles.additionalStat}>
              <Text style={styles.additionalStatIcon}>💪</Text>
              <Text style={styles.additionalStatLabel}>Target Muscles</Text>
              <Text style={styles.additionalStatValue}>
                {(exercise.targetMuscles || exercise.muscleGroups).join(', ')}
              </Text>
            </View>

            <View style={styles.additionalStat}>
              <Text style={styles.additionalStatIcon}>🔥</Text>
              <Text style={styles.additionalStatLabel}>Est. Calories</Text>
              <Text style={styles.additionalStatValue}>{calories} kcal</Text>
            </View>
          </View>
        </View>

        {/* Performance Breakdown */}
        <View style={styles.breakdownContainer}>
          <Text style={styles.sectionTitle}>Performance Breakdown</Text>

          <View style={styles.breakdownItem}>
            <Text style={styles.breakdownLabel}>Consistency</Text>
            <View style={styles.breakdownBar}>
              <View
                style={[
                  styles.breakdownFill,
                  { width: `${averageFormScore * 100}%`, backgroundColor: formGrade.color }
                ]}
              />
            </View>
            <Text style={styles.breakdownValue}>
              {Math.round(averageFormScore * 100)}%
            </Text>
          </View>

          <View style={styles.breakdownItem}>
            <Text style={styles.breakdownLabel}>Completion Rate</Text>
            <View style={styles.breakdownBar}>
              <View
                style={[
                  styles.breakdownFill,
                  { width: '100%', backgroundColor: '#00AA00' }
                ]}
              />
            </View>
            <Text style={styles.breakdownValue}>100%</Text>
          </View>

          <View style={styles.breakdownItem}>
            <Text style={styles.breakdownLabel}>Difficulty</Text>
            <View style={styles.breakdownBar}>
              <View
                style={[
                  styles.breakdownFill,
                  {
                    width: exercise.difficulty === 'beginner' ? '33%' :
                          exercise.difficulty === 'intermediate' ? '66%' : '100%',
                    backgroundColor: exercise.difficulty === 'beginner' ? '#00AA00' :
                                   exercise.difficulty === 'intermediate' ? '#FF8800' : '#CC0000'
                  }
                ]}
              />
            </View>
            <Text style={styles.breakdownValue}>
              {exercise.difficulty.toUpperCase()}
            </Text>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionsContainer}>
          <TouchableOpacity
            style={[styles.actionButton, styles.tryAgainButton]}
            onPress={handleTryAgain}
            activeOpacity={0.8}
          >
            <Text style={styles.actionButtonText}>TRY AGAIN</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, styles.doneButton]}
            onPress={handleDone}
            activeOpacity={0.8}
          >
            <Text style={styles.actionButtonText}>DONE</Text>
          </TouchableOpacity>
        </View>

        {/* Tips Section */}
        <View style={styles.tipsContainer}>
          <Text style={styles.tipsTitle}>💡 Tips for Next Time</Text>
          <Text style={styles.tipText}>
            • Maintain proper form throughout each rep
          </Text>
          <Text style={styles.tipText}>
            • Control your movement speed
          </Text>
          <Text style={styles.tipText}>
            • Focus on full range of motion
          </Text>
          <Text style={styles.tipText}>
            • Keep your core engaged
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5'
  },
  scrollView: {
    flex: 1
  },
  scrollContent: {
    paddingBottom: 40
  },
  header: {
    alignItems: 'center',
    paddingVertical: 30,
    backgroundColor: '#FFF',
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    marginBottom: 20
  },
  completionIcon: {
    fontSize: 64,
    marginBottom: 10
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5
  },
  exerciseName: {
    fontSize: 18,
    color: '#666',
    marginTop: 5
  },
  mainStatsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 20,
    marginBottom: 20
  },
  statCard: {
    backgroundColor: '#FFF',
    borderRadius: 15,
    padding: 20,
    alignItems: 'center',
    flex: 1,
    marginHorizontal: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3
  },
  statIcon: {
    fontSize: 32,
    marginBottom: 8
  },
  statLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#999',
    marginBottom: 8,
    textAlign: 'center'
  },
  statValue: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#007AFF'
  },
  statSubtitle: {
    fontSize: 12,
    color: '#666',
    marginTop: 4
  },
  formScoreContainer: {
    backgroundColor: '#FFF',
    marginHorizontal: 20,
    marginBottom: 20,
    borderRadius: 15,
    padding: 25,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3
  },
  formScoreLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#999',
    marginBottom: 15
  },
  formScoreBox: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 15
  },
  formGrade: {
    fontSize: 64,
    fontWeight: 'bold',
    marginRight: 10
  },
  formPercentage: {
    fontSize: 24,
    fontWeight: '600',
    color: '#666'
  },
  formDescription: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20
  },
  additionalStatsContainer: {
    paddingHorizontal: 20,
    marginBottom: 20
  },
  additionalStatRow: {
    flexDirection: 'row',
    justifyContent: 'space-between'
  },
  additionalStat: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 15,
    alignItems: 'center',
    flex: 1,
    marginHorizontal: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2
  },
  additionalStatIcon: {
    fontSize: 28,
    marginBottom: 8
  },
  additionalStatLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#999',
    marginBottom: 5,
    textAlign: 'center'
  },
  additionalStatValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center'
  },
  breakdownContainer: {
    backgroundColor: '#FFF',
    marginHorizontal: 20,
    marginBottom: 20,
    borderRadius: 15,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 20
  },
  breakdownItem: {
    marginBottom: 20
  },
  breakdownLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 8
  },
  breakdownBar: {
    height: 8,
    backgroundColor: '#E0E0E0',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 5
  },
  breakdownFill: {
    height: '100%',
    borderRadius: 4
  },
  breakdownValue: {
    fontSize: 12,
    color: '#999',
    textAlign: 'right'
  },
  actionsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginBottom: 20
  },
  actionButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginHorizontal: 5
  },
  tryAgainButton: {
    backgroundColor: '#007AFF'
  },
  doneButton: {
    backgroundColor: '#00AA00'
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFF'
  },
  tipsContainer: {
    backgroundColor: '#FFF',
    marginHorizontal: 20,
    borderRadius: 15,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2
  },
  tipsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12
  },
  tipText: {
    fontSize: 13,
    color: '#666',
    lineHeight: 22,
    marginBottom: 5
  }
});

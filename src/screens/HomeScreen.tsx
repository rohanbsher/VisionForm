/**
 * Home Screen
 *
 * Main landing screen where users can:
 * - Select an exercise to perform
 * - View exercise descriptions
 * - Navigate to camera screen to start workout
 *
 * @module screens/HomeScreen
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
import type { RootStackParamList, ExerciseType } from '../types';
import { EXERCISES } from '../data/exercises';

type Props = NativeStackScreenProps<RootStackParamList, 'Home'>;

/**
 * Exercise Card Component
 */
interface ExerciseCardProps {
  exerciseType: ExerciseType;
  onPress: () => void;
}

const ExerciseCard: React.FC<ExerciseCardProps> = ({ exerciseType, onPress }) => {
  const exercise = EXERCISES[exerciseType];

  return (
    <TouchableOpacity
      style={styles.exerciseCard}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.cardHeader}>
        <Text style={styles.exerciseIcon}>{exercise.icon}</Text>
        <Text style={styles.exerciseName}>{exercise.name}</Text>
      </View>

      <Text style={styles.exerciseDescription}>{exercise.description}</Text>

      <View style={styles.cardDetails}>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Target:</Text>
          <Text style={styles.detailValue}>
            {(exercise.targetMuscles || exercise.muscleGroups).join(', ')}
          </Text>
        </View>

        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Difficulty:</Text>
          <Text style={[
            styles.detailValue,
            exercise.difficulty === 'beginner' && styles.beginnerText,
            exercise.difficulty === 'intermediate' && styles.intermediateText,
            exercise.difficulty === 'advanced' && styles.advancedText
          ]}>
            {exercise.difficulty.toUpperCase()}
          </Text>
        </View>
      </View>

      <View style={styles.startButton}>
        <Text style={styles.startButtonText}>START WORKOUT</Text>
      </View>
    </TouchableOpacity>
  );
};

/**
 * Home Screen Component
 */
export const HomeScreen: React.FC<Props> = ({ navigation }) => {
  const handleExercisePress = (exerciseType: ExerciseType) => {
    navigation.navigate('Camera', { exerciseType });
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
          <Text style={styles.title}>VisionForm</Text>
          <Text style={styles.subtitle}>AI-Powered Workout Form Analyzer</Text>
        </View>

        {/* Description */}
        <View style={styles.descriptionContainer}>
          <Text style={styles.descriptionText}>
            Select an exercise below to start your workout. Our AI will analyze
            your form in real-time and provide instant feedback to help you
            perform each rep with perfect technique.
          </Text>
        </View>

        {/* Exercise Cards */}
        <View style={styles.exercisesContainer}>
          <Text style={styles.sectionTitle}>Available Exercises</Text>

          <ExerciseCard
            exerciseType="squat"
            onPress={() => handleExercisePress('squat')}
          />

          <ExerciseCard
            exerciseType="pushup"
            onPress={() => handleExercisePress('pushup')}
          />

          <ExerciseCard
            exerciseType="plank"
            onPress={() => handleExercisePress('plank')}
          />
        </View>

        {/* Features Section */}
        <View style={styles.featuresContainer}>
          <Text style={styles.sectionTitle}>Features</Text>

          <View style={styles.featureItem}>
            <Text style={styles.featureIcon}>🎯</Text>
            <View style={styles.featureTextContainer}>
              <Text style={styles.featureTitle}>Real-Time Analysis</Text>
              <Text style={styles.featureDescription}>
                Get instant feedback on your form as you exercise
              </Text>
            </View>
          </View>

          <View style={styles.featureItem}>
            <Text style={styles.featureIcon}>📊</Text>
            <View style={styles.featureTextContainer}>
              <Text style={styles.featureTitle}>Rep Counting</Text>
              <Text style={styles.featureDescription}>
                Automatic rep counting with form quality tracking
              </Text>
            </View>
          </View>

          <View style={styles.featureItem}>
            <Text style={styles.featureIcon}>🤖</Text>
            <View style={styles.featureTextContainer}>
              <Text style={styles.featureTitle}>AI-Powered</Text>
              <Text style={styles.featureDescription}>
                Advanced pose detection with TensorFlow and PoseNet
              </Text>
            </View>
          </View>

          <View style={styles.featureItem}>
            <Text style={styles.featureIcon}>🔒</Text>
            <View style={styles.featureTextContainer}>
              <Text style={styles.featureTitle}>Privacy First</Text>
              <Text style={styles.featureDescription}>
                All processing happens locally on your device
              </Text>
            </View>
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Position yourself 6-8 feet from the camera with your full body visible
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
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 10,
    backgroundColor: '#007AFF',
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30
  },
  title: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#FFF',
    marginBottom: 5
  },
  subtitle: {
    fontSize: 16,
    color: '#E0E0E0',
    marginBottom: 10
  },
  descriptionContainer: {
    paddingHorizontal: 20,
    paddingVertical: 20
  },
  descriptionText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    textAlign: 'center'
  },
  exercisesContainer: {
    paddingHorizontal: 20
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
    marginTop: 10
  },
  exerciseCard: {
    backgroundColor: '#FFF',
    borderRadius: 15,
    padding: 20,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12
  },
  exerciseIcon: {
    fontSize: 32,
    marginRight: 12
  },
  exerciseName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    flex: 1
  },
  exerciseDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 15
  },
  cardDetails: {
    marginBottom: 15
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8
  },
  detailLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    width: 80
  },
  detailValue: {
    fontSize: 14,
    color: '#333',
    flex: 1
  },
  beginnerText: {
    color: '#00AA00',
    fontWeight: '600'
  },
  intermediateText: {
    color: '#FF8800',
    fontWeight: '600'
  },
  advancedText: {
    color: '#CC0000',
    fontWeight: '600'
  },
  startButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center'
  },
  startButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFF'
  },
  featuresContainer: {
    paddingHorizontal: 20,
    marginTop: 20
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 15,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2
  },
  featureIcon: {
    fontSize: 32,
    marginRight: 15
  },
  featureTextContainer: {
    flex: 1
  },
  featureTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4
  },
  featureDescription: {
    fontSize: 13,
    color: '#666',
    lineHeight: 18
  },
  footer: {
    paddingHorizontal: 20,
    paddingTop: 20,
    alignItems: 'center'
  },
  footerText: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
    fontStyle: 'italic'
  }
});

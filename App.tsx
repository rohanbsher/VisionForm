/**
 * VisionForm - AI-Powered Workout Form Analyzer
 *
 * Main application entry point that sets up navigation
 * and initializes the app structure.
 *
 * @module App
 */

import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { RootStackParamList } from './src/types';

// Import screens
import { HomeScreen } from './src/screens/HomeScreen';
import { CameraScreen } from './src/screens/CameraScreen';
import { ResultsScreen } from './src/screens/ResultsScreen';

// Create navigation stack
const Stack = createNativeStackNavigator<RootStackParamList>();

/**
 * Main App Component
 */
export default function App() {
  return (
    <>
      <StatusBar style="light" />
      <NavigationContainer>
        <Stack.Navigator
          initialRouteName="Home"
          screenOptions={{
            headerShown: false, // We'll use custom headers in each screen
            animation: 'slide_from_right',
            gestureEnabled: true,
            contentStyle: {
              backgroundColor: '#000'
            }
          }}
        >
          {/* Home Screen - Exercise Selection */}
          <Stack.Screen
            name="Home"
            component={HomeScreen}
            options={{
              title: 'VisionForm'
            }}
          />

          {/* Camera Screen - Workout Session */}
          <Stack.Screen
            name="Camera"
            component={CameraScreen}
            options={{
              title: 'Workout',
              animation: 'fade'
            }}
          />

          {/* Results Screen - Post-Workout Summary */}
          <Stack.Screen
            name="Results"
            component={ResultsScreen}
            options={{
              title: 'Results',
              animation: 'slide_from_bottom',
              gestureEnabled: false // Prevent accidental swipe back
            }}
          />
        </Stack.Navigator>
      </NavigationContainer>
    </>
  );
}

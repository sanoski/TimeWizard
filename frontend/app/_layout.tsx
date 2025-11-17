import { useEffect, useState } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { TamaguiProvider } from '@tamagui/core';
import tamaguiConfig from '../tamagui.config';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { View, ActivityIndicator } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { db } from '../services/database';

export default function RootLayout() {
  const [isReady, setIsReady] = useState(false);
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    initializeApp();
  }, []);

  const initializeApp = async () => {
    try {
      // Initialize the local database
      await db.initialize();
      console.log('✅ Database initialized in app');

      // Check if migration is needed
      const migrationCompleted = await AsyncStorage.getItem('migration_completed');
      
      if (migrationCompleted !== 'true') {
        // Show migration screen
        router.replace('/migrate');
      }
      
      setIsReady(true);
    } catch (error) {
      console.error('App initialization error:', error);
      setIsReady(true); // Continue anyway to show errors to user
    }
  };

  if (!isReady) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f3f4f6' }}>
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    );
  }

  return (
    <TamaguiProvider config={tamaguiConfig}>
      <SafeAreaProvider>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="migrate" />
          <Stack.Screen name="(tabs)" />
        </Stack>
      </SafeAreaProvider>
    </TamaguiProvider>
  );
}

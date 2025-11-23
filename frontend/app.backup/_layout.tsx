import { useEffect, useState } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { TamaguiProvider } from '@tamagui/core';
import tamaguiConfig from '../tamagui.config';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { View, ActivityIndicator, Platform, Text, AppState } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { db } from '../services/databaseWrapper';
import { checkAndSync } from '../services/autoSync';

export default function RootLayout() {
  useEffect(() => {
    // Trigger auto-sync on app open
    const triggerAutoSync = async () => {
      console.log('🚀 App opened, checking for auto-sync...');
      await checkAndSync();
    };
    
    triggerAutoSync();
    
    // Also check when app comes to foreground
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'active') {
        console.log('🚀 App became active, checking for auto-sync...');
        triggerAutoSync();
      }
    });
    
    return () => {
      subscription.remove();
    };
  }, []);
  
  return (
    <TamaguiProvider config={tamaguiConfig}>
      <SafeAreaProvider>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="migrate" options={{ presentation: 'modal' }} />
          <Stack.Screen name="weekly-summary" />
        </Stack>
      </SafeAreaProvider>
    </TamaguiProvider>
  );
}

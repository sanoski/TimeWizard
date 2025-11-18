import { useEffect, useState } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { TamaguiProvider } from '@tamagui/core';
import tamaguiConfig from '../tamagui.config';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { View, ActivityIndicator, Platform, Text } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { db } from '../services/databaseWrapper';

export default function RootLayout() {
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

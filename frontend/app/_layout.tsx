import { Stack } from 'expo-router';
import { TamaguiProvider } from '@tamagui/core';
import tamaguiConfig from '../tamagui.config';
import { SafeAreaProvider } from 'react-native-safe-area-context';

export default function RootLayout() {
  return (
    <TamaguiProvider config={tamaguiConfig}>
      <SafeAreaProvider>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(tabs)" />
        </Stack>
      </SafeAreaProvider>
    </TamaguiProvider>
  );
}

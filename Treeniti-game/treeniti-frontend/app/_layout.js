import React from 'react';
import { Stack } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { ConfigProvider } from '../context/ConfigContext';
import { LanguageProvider } from '../context/LanguageContext';

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ConfigProvider>
        <LanguageProvider>
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="index" />
            <Stack.Screen name="home" />
            <Stack.Screen name="login" />
            <Stack.Screen name="profile" />
            <Stack.Screen name="wallet" />
          </Stack>
        </LanguageProvider>
      </ConfigProvider>
    </GestureHandlerRootView>
  );
}

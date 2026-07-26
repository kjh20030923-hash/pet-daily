import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { Modal, Text, TextInput } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider, useAuth } from './src/backend/AuthContext';
import { BottomTabs } from './src/navigation/BottomTabs';
import { AuthScreen } from './src/screens/AuthScreen';
import { AppProvider } from './src/store';

const textDefaults = { allowFontScaling: true, maxFontSizeMultiplier: 1.45 };
// RN Text types omit defaultProps; runtime supports it for accessibility defaults.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(Text as any).defaultProps = { ...(Text as any).defaultProps, ...textDefaults };
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(TextInput as any).defaultProps = { ...(TextInput as any).defaultProps, ...textDefaults };

const AppContent = () => {
  const { authVisible, closeAuth } = useAuth();

  return (
    <AppProvider>
      <StatusBar style="dark" />
      <BottomTabs />
      <Modal
        visible={authVisible}
        animationType="slide"
        presentationStyle="fullScreen"
        onRequestClose={closeAuth}
      >
        <AuthScreen onClose={closeAuth} />
      </Modal>
    </AppProvider>
  );
};

export default function App() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </SafeAreaProvider>
  );
}

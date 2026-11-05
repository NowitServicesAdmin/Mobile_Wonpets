import './global.css';
import './src/i18n/installTranslation'; // makes every <Text> translatable - must load before any screen renders
import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from './src/context/AuthContext';
import { ManagedProvider } from './src/context/ManagedContext';
import { CartProvider } from './src/context/CartContext';
import { PetsProvider } from './src/context/PetsContext';
import { ChatProvider } from './src/context/ChatContext';
import { ResellProvider } from './src/context/ResellContext';
import { ReviewsProvider } from './src/context/ReviewsContext';
import { SettingsProvider } from './src/context/SettingsContext';
import { LiveSyncProvider } from './src/context/LiveSyncContext';
import { LocationProvider } from './src/context/LocationContext';
import { LanguageProvider } from './src/context/LanguageContext';
import RootNavigator from './src/navigation/RootNavigator';
import { AlertHost } from './src/components/WonPetsAlert';

export default function App() {
  return (
    <SafeAreaProvider>
      <LanguageProvider>
      <AuthProvider>
        <ManagedProvider>
        <LocationProvider>
        <PetsProvider>
          <CartProvider>
            <ChatProvider>
              <ResellProvider>
                <ReviewsProvider>
                  <SettingsProvider>
                    <LiveSyncProvider>
                      <StatusBar style="dark" />
                      <RootNavigator />
                      <AlertHost />
                    </LiveSyncProvider>
                  </SettingsProvider>
                </ReviewsProvider>
              </ResellProvider>
            </ChatProvider>
          </CartProvider>
        </PetsProvider>
        </LocationProvider>
        </ManagedProvider>
      </AuthProvider>
      </LanguageProvider>
    </SafeAreaProvider>
  );
}
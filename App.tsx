import './global.css';
import './src/i18n/installTranslation'; // makes every <Text> translatable - must load before any screen renders
import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import { DoctorProvider } from './src/context/DoctorContext';
import { StoreManagerProvider } from './src/context/StoreManagerContext';
import StoreManagerNavigator from './src/navigation/StoreManagerNavigator';
import DoctorNavigator from './src/navigation/DoctorNavigator';
import DoctorSharedBridge from './src/components/doctor/DoctorSharedBridge';
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

/** Doctors get their own (much lighter) provider tree - none of the pet-owner data (pets, cart, resell…) is loaded for them.
 *  ManagedProvider + DoctorSharedBridge add "Shared With Me" (pets other owners share with the doctor), same as for pet owners. */
function Shell() {
  const { user, loading } = useAuth();
  // store managers: only their store data (no pets / cart / chat); settings load the store details, documents and prefs
  if (!loading && user?.role === 'store_manager') {
    return (
      <SettingsProvider scope="store">
        <StoreManagerProvider>
          <StatusBar style="dark" />
          <StoreManagerNavigator />
          <AlertHost />
        </StoreManagerProvider>
      </SettingsProvider>
    );
  }
  if (!loading && user?.role === 'doctor') {
    return (
      <ManagedProvider>
        <ChatProvider>
          <SettingsProvider scope="doctor">
            <DoctorProvider>
              <DoctorSharedBridge>
                <StatusBar style="dark" />
                <DoctorNavigator />
                <AlertHost />
              </DoctorSharedBridge>
            </DoctorProvider>
          </SettingsProvider>
        </ChatProvider>
      </ManagedProvider>
    );
  }
  return (
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
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <LanguageProvider>
        <AuthProvider>
          <Shell />
        </AuthProvider>
      </LanguageProvider>
    </SafeAreaProvider>
  );
}

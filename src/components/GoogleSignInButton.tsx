import React, { useEffect } from 'react';
import { Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import { Button } from './ui';
import { toast } from './WonPetsAlert';
import { GOOGLE } from '../config/env';

WebBrowser.maybeCompleteAuthSession();

/** The one client id this platform actually uses (expo-auth-session throws if it is empty, e.g. iOS with only a web id). */
const clientIdForPlatform = Platform.select({ ios: GOOGLE.iosClientId, android: GOOGLE.androidClientId, default: GOOGLE.webClientId });
export const googleConfigured = !!clientIdForPlatform;

/** Expo Go cannot receive Google's redirect (its package id is host.exp.exponent) - a development / production build is needed. */
const inExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

/** Only render this when `googleConfigured` - the hook throws without a client id. */
export default function GoogleSignInButton({ onToken, disabled }: { onToken: (accessToken: string) => void; disabled?: boolean }) {
  const [request, response, prompt] = Google.useAuthRequest({
    webClientId: GOOGLE.webClientId || undefined,
    androidClientId: GOOGLE.androidClientId || undefined,
    iosClientId: GOOGLE.iosClientId || undefined,
  });

  useEffect(() => {
    if (!response) return;
    if (response.type === 'success') {
      const token = response.authentication?.accessToken || (response.params as any)?.access_token;
      if (token) onToken(token);
      else toast.error('Google did not return an access token. Please try again.');
    } else if (response.type === 'error') {
      // e.g. "Custom URI scheme is not enabled for your Android client" - means the OAuth client in Google Cloud is the wrong type
      toast.error(response.error?.message || (response.params as any)?.error_description || 'Google sign-in failed. Please try again.');
    }
    // 'dismiss' / 'cancel' = the user closed the Google window: nothing to report
  }, [response]);

  const start = async () => {
    if (inExpoGo) {
      toast.info('Google sign-in does not work inside Expo Go. Use a development build (npx expo run:android / eas build).');
      return;
    }
    try {
      await prompt();
    } catch (e: any) {
      toast.error(e?.message || 'Could not open Google sign-in.');
    }
  };

  return (
    <Button
      title="Continue with Google"
      variant="neutral"
      disabled={!request || disabled}
      icon={<Ionicons name="logo-google" size={18} color="#EA4335" />}
      onPress={start}
    />
  );
}
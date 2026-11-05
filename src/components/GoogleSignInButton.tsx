import React, { useEffect } from 'react';
import { Ionicons } from '@expo/vector-icons';
import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import { Button } from './ui';
import { GOOGLE } from '../config/env';

WebBrowser.maybeCompleteAuthSession();

export const googleConfigured = !!(GOOGLE.webClientId || GOOGLE.androidClientId || GOOGLE.iosClientId);

/** Only render this when `googleConfigured` - the hook throws without a client id. */
export default function GoogleSignInButton({ onToken, disabled }: { onToken: (accessToken: string) => void; disabled?: boolean }) {
  const [request, response, prompt] = Google.useAuthRequest({
    webClientId: GOOGLE.webClientId || undefined,
    androidClientId: GOOGLE.androidClientId || undefined,
    iosClientId: GOOGLE.iosClientId || undefined,
  });

  useEffect(() => {
    if (response?.type === 'success') {
      const token = response.authentication?.accessToken || (response.params as any)?.access_token;
      if (token) onToken(token);
    }
  }, [response]);

  return (
    <Button
      title="Continue with Google"
      variant="neutral"
      disabled={!request || disabled}
      icon={<Ionicons name="logo-google" size={18} color="#EA4335" />}
      onPress={() => prompt()}
    />
  );
}

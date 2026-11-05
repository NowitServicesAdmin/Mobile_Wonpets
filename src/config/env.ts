import { Platform } from 'react-native';

const fallback = Platform.OS === 'android' ? 'http://10.0.2.2:5000/api' : 'http://localhost:5000/api';

const configuredUrl = process.env.EXPO_PUBLIC_API_URL?.trim();

export const API_URL = (configuredUrl || fallback).replace(/\/+$/, '');

console.log('[API CONFIG]', {
  platform: Platform.OS,
  envUrl: process.env.EXPO_PUBLIC_API_URL,
  finalApiUrl: API_URL,
});
/** Origin of the backend (for relative image paths such as /uploads/x.png). */
export const API_ORIGIN = API_URL.replace(/\/api$/, '');

/** Google sign-in client ids (optional). Leave empty to hide the feature behind a "not configured" message. */
export const GOOGLE = {
  webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID || '',
  androidClientId: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID || '',
  iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID || '',
};

/** OPTIONAL. The Settings > Language switcher works without it (same free Google Translate the web widget uses). Set a Cloud Translation v2 key only if you want the official, billed API. */
export const TRANSLATE_API_KEY = process.env.EXPO_PUBLIC_GOOGLE_TRANSLATE_API_KEY?.trim() || '';

/** Self-hosted Jitsi server used for video consultations (same one the web app uses). */
export const JITSI_DOMAIN = (process.env.EXPO_PUBLIC_JITSI_DOMAIN?.trim() || 'meet.nowitservices.com').replace(/^https?:\/\//, '').replace(/\/+$/, '');
/** Room name is shared with the web app, so the vet (web) and the owner (mobile) land in the same call. */
export const jitsiRoomFor = (appointmentId: string) => `wonpet-${appointmentId}`;

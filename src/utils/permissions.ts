import { Linking, PermissionsAndroid, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { WonPetsAlert } from '../components/WonPetsAlert';

/**
 * One place for every permission the app uses.
 *
 * The app asks for camera / microphone / location once at start. Anything the user skipped or denied
 * there is asked again, right when a feature needs it:
 *   - askForPermission(kind)  checks, asks the system dialog if the OS still allows it, never shows our own UI
 *   - ensurePermission(kind)  same, and when the OS will not show the dialog any more ("don't ask again" / iOS denied)
 *                             it explains why it is needed and offers to open the app's Settings page
 */
export type PermKind = 'camera' | 'photos' | 'location' | 'call';
export type PermResult = { granted: boolean; /** the OS will not show the dialog again - only the Settings page can turn it on */ blocked: boolean };

const COPY: Record<PermKind, { title: string; text: string }> = {
  camera: { title: 'Camera access needed', text: 'Allow camera access to take a photo.' },
  photos: { title: 'Photo access needed', text: 'Allow photo access to choose a picture from your gallery.' },
  location: { title: 'Location access needed', text: 'Allow location access to find vets and use your current position.' },
  call: { title: 'Camera & microphone needed', text: 'Allow camera and microphone access so your vet can see and hear you during the video consultation.' },
};

type Raw = { granted: boolean; canAskAgain: boolean };

const ANDROID_CALL_PERMS = [PermissionsAndroid.PERMISSIONS.CAMERA, PermissionsAndroid.PERMISSIONS.RECORD_AUDIO];

async function checkRaw(kind: PermKind): Promise<Raw> {
  switch (kind) {
    case 'camera': return ImagePicker.getCameraPermissionsAsync();
    case 'photos': return ImagePicker.getMediaLibraryPermissionsAsync();
    case 'location': return Location.getForegroundPermissionsAsync();
    case 'call': {
      if (Platform.OS === 'android') {
        const res = await Promise.all(ANDROID_CALL_PERMS.map((p) => PermissionsAndroid.check(p)));
        return { granted: res.every(Boolean), canAskAgain: true }; // Android only tells us "don't ask again" after we ask
      }
      return ImagePicker.getCameraPermissionsAsync(); // iOS: the microphone prompt comes from the call page itself
    }
  }
}

async function askRaw(kind: PermKind): Promise<Raw> {
  switch (kind) {
    case 'camera': return ImagePicker.requestCameraPermissionsAsync();
    case 'photos': return ImagePicker.requestMediaLibraryPermissionsAsync();
    case 'location': return Location.requestForegroundPermissionsAsync();
    case 'call': {
      if (Platform.OS === 'android') {
        const res = await PermissionsAndroid.requestMultiple(ANDROID_CALL_PERMS);
        const values = Object.values(res);
        return {
          granted: values.every((v) => v === PermissionsAndroid.RESULTS.GRANTED),
          canAskAgain: !values.includes(PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN),
        };
      }
      return ImagePicker.requestCameraPermissionsAsync();
    }
  }
}

export async function openAppSettings(): Promise<void> {
  try { await Linking.openSettings(); } catch { /* nothing else to do */ }
}

/** Checks the permission and, if it is not given yet, asks for it. No UI of our own. */
export async function askForPermission(kind: PermKind): Promise<PermResult> {
  try {
    const cur = await checkRaw(kind);
    if (cur.granted) return { granted: true, blocked: false };
    if (!cur.canAskAgain) return { granted: false, blocked: true };
    const res = await askRaw(kind);
    return { granted: res.granted, blocked: !res.granted && !res.canAskAgain };
  } catch {
    return { granted: false, blocked: false };
  }
}

/**
 * Use this right before a feature that needs the permission. Resolves true when it is allowed.
 * When it is blocked at the OS level it asks the user to open Settings; otherwise it just resolves false
 * and the caller shows its own "permission is needed" message.
 */
export async function ensurePermission(kind: PermKind): Promise<boolean> {
  const r = await askForPermission(kind);
  if (r.granted) return true;
  if (r.blocked) {
    const { title, text } = COPY[kind];
    const a = await WonPetsAlert.confirm(title, `${text} It is turned off for this app - open Settings > Permissions and switch it on.`, { confirmText: 'Open Settings', cancelText: 'Not now' });
    if (a.isConfirmed) await openAppSettings();
  }
  return false;
}

// ---------- video-call helpers (kept for the call screen) ----------

/** True when the camera + microphone are already allowed. (iOS microphone can only be checked by the WebView, so iOS reports camera.) */
export async function hasCallPermissions(): Promise<boolean> {
  try { return (await checkRaw('call')).granted; } catch { return false; }
}

/** Asks for camera + microphone (Android: both now; iOS: camera now, the microphone prompt appears when the call starts). */
export async function requestCallPermissions(): Promise<boolean> {
  return (await askForPermission('call')).granted;
}

/** Used at app start, next to the location prompt: asks once so the video call screen can open straight away later.
 *  If it was skipped or denied, the call screen asks again when a call is opened. */
export async function askCallPermissionsOnce(): Promise<void> {
  try {
    const ASKED_KEY = 'wonpet:asked-call-permissions';
    if (await AsyncStorage.getItem(ASKED_KEY)) return;
    await AsyncStorage.setItem(ASKED_KEY, '1');
    if (await hasCallPermissions()) return;
    await requestCallPermissions();
  } catch { /* never block startup on a permission prompt */ }
}

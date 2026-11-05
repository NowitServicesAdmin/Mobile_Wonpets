import { PermissionsAndroid, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';

const ASKED_KEY = 'wonpet:asked-call-permissions';

const ANDROID_PERMS = [PermissionsAndroid.PERMISSIONS.CAMERA, PermissionsAndroid.PERMISSIONS.RECORD_AUDIO];

/** True when the camera + microphone are already allowed. (iOS microphone can only be checked by the WebView, so iOS reports camera.) */
export async function hasCallPermissions(): Promise<boolean> {
  try {
    if (Platform.OS === 'android') {
      const res = await Promise.all(ANDROID_PERMS.map((p) => PermissionsAndroid.check(p)));
      return res.every(Boolean);
    }
    const cam = await ImagePicker.getCameraPermissionsAsync();
    return cam.granted;
  } catch {
    return false;
  }
}

/** Asks for camera + microphone (Android: both now; iOS: camera now, the microphone prompt appears when the call starts). */
export async function requestCallPermissions(): Promise<boolean> {
  try {
    if (Platform.OS === 'android') {
      const res = await PermissionsAndroid.requestMultiple(ANDROID_PERMS);
      return Object.values(res).every((v) => v === PermissionsAndroid.RESULTS.GRANTED);
    }
    const cam = await ImagePicker.requestCameraPermissionsAsync();
    return cam.granted;
  } catch {
    return false;
  }
}

/** Used at app start, next to the location prompt: asks once so the video call screen can open straight away later. */
export async function askCallPermissionsOnce(): Promise<void> {
  try {
    if (await AsyncStorage.getItem(ASKED_KEY)) return;
    await AsyncStorage.setItem(ASKED_KEY, '1');
    if (await hasCallPermissions()) return;
    await requestCallPermissions();
  } catch { /* never block startup on a permission prompt */ }
}

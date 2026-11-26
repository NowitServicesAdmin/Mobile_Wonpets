import { Platform } from 'react-native';
import Constants, { ExecutionEnvironment } from 'expo-constants';

export const APP_NAME = 'Won Pet Pro';
/** Comes from app.json (expo.version) - bump it there for every release. */
export const APP_VERSION: string = Constants.expoConfig?.version ?? '1.1.0';

const inExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;
/** Native build number of the installed app (not available inside Expo Go, where it would be Expo Go's own). */
export const BUILD_NUMBER: string = inExpoGo ? '' : String(Constants.nativeBuildVersion ?? '');
export const RUNTIME_LABEL = inExpoGo ? 'Expo Go' : 'Installed app';
export const platformLabel = () => `${Platform.OS === 'ios' ? 'iOS' : 'Android'} ${Platform.Version}`;
/** "WON PET PRO · v1.1.0" - the footer line on the Settings screens. */
export const versionFooter = (name = 'WON PET PRO') => `${name} · v${APP_VERSION}`;

import axios, { AxiosError, AxiosInstance } from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL } from '../config/env';

const TOKEN_KEY = 'wonpet:token';
let memoryToken: string | null = null;
let onUnauthorized: (() => void) | null = null;

export const tokenStore = {
  async load() {
    memoryToken = await AsyncStorage.getItem(TOKEN_KEY);
    return memoryToken;
  },
  async set(token: string) {
    memoryToken = token;
    await AsyncStorage.setItem(TOKEN_KEY, token);
  },
  async clear() {
    memoryToken = null;
    await AsyncStorage.removeItem(TOKEN_KEY);
  },
  get: () => memoryToken,
};

/** AuthContext registers this so an expired / invalid token logs the user out everywhere. */
export const setUnauthorizedHandler = (fn: (() => void) | null) => {
  onUnauthorized = fn;
};

export const api: AxiosInstance = axios.create({
  baseURL: API_URL,
  timeout: 25000,
  headers: { Accept: 'application/json' },
});

api.interceptors.request.use((config) => {
  if (memoryToken) config.headers.Authorization = `Bearer ${memoryToken}`;
  return config;
});

export type ApiError = Error & { status?: number; code?: string };

api.interceptors.response.use(
  (res) => res,
  async (error: AxiosError<any>) => {
        console.log('========== API ERROR ==========');
    console.log('API BASE URL:', error.config?.baseURL);
    console.log('REQUEST URL:', error.config?.url);
    console.log('REQUEST METHOD:', error.config?.method);
    console.log('ERROR MESSAGE:', error.message);
    console.log('ERROR CODE:', error.code);
    console.log('HTTP STATUS:', error.response?.status);
    console.log('RESPONSE DATA:', error.response?.data);
    console.log('================================');
    const status = error.response?.status;
    const data = error.response?.data;

    // Expired / invalid token -> sign out. (Login endpoints answer 400, so they never trigger this.)
    if (status === 401 && memoryToken) {
      await tokenStore.clear();
      onUnauthorized?.();
    }

    let message: string;
    if (data?.message) message = data.message;
    else if (error.code === 'ECONNABORTED') message = 'The server took too long to respond. Please try again.';
    else if (!error.response) message = "Can't reach the server. Check your internet connection and try again.";
    else if (status === 429) message = 'Too many requests. Please wait a moment.';
    else message = 'Something went wrong. Please try again.';

    const err: ApiError = new Error(message);
    err.status = status;
    err.code = data?.code;
    return Promise.reject(err);
  },
);

export const errorMessage = (e: unknown, fallback = 'Something went wrong. Please try again.') =>
  (e as Error)?.message || fallback;

/** Build a multipart `file` entry from a local image uri (works with expo-image-picker). */
export const fileFromUri = (uri: string, fallbackName = 'photo') => {
  const name = uri.split('/').pop() || `${fallbackName}.jpg`;
  const ext = (name.split('.').pop() || 'jpg').toLowerCase();
  const type = ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg';
  return { uri, name: name.includes('.') ? name : `${name}.jpg`, type } as any;
};

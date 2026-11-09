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

/* ----------------------- rate-limit cooldown (HTTP 429) ----------------------- */
// When the server says "slow down" we hold back GETs until the window
// has passed (instead of hammering it every few seconds, which kept the app locked out). Waiting reads are retried automatically.
let cooldownUntil = 0;
export const isRateLimited = () => Date.now() < cooldownUntil;
const startCooldown = (seconds?: number) => {
  const ms = Math.min(Math.max((seconds || 20) * 1000, 5000), 70000);
  cooldownUntil = Math.max(cooldownUntil, Date.now() + ms);
};

/* ---------------- identical in-flight GETs share one network call ---------------- */
// Several screens/contexts ask for the same thing at the same moment (unread count,
// delegated accounts...). Without this each one is a separate request against the limit.
const baseAdapter = axios.getAdapter(axios.defaults.adapter as any);
const inflight = new Map<string, Promise<any>>();
const dedupeAdapter = (config: any) => {
  if (String(config.method || 'get').toLowerCase() !== 'get') return baseAdapter(config);
  const h = config.headers;
  const owner = (h && (typeof h.get === 'function' ? h.get('x-managed-owner') : h['x-managed-owner'])) || '';
  const key = [config.baseURL, config.url, JSON.stringify(config.params || {}), owner, memoryToken || ''].join('|');
  const hit = inflight.get(key);
  if (hit) return hit.then((r) => ({ ...r, config }));
  const p = baseAdapter(config);
  inflight.set(key, p);
  const clear = () => { if (inflight.get(key) === p) inflight.delete(key); };
  p.then(clear, clear);
  return p;
};

export const api: AxiosInstance = axios.create({
  baseURL: API_URL,
  timeout: 25000,
  headers: { Accept: 'application/json' },
  adapter: dedupeAdapter as any,
});

api.interceptors.request.use(async (config) => {
  if (memoryToken) config.headers.Authorization = `Bearer ${memoryToken}`;
  // During a cooldown, reads WAIT until the rate-limit window has passed and then go through
  // (a little random spread so they do not all fire in the same instant). The screen just keeps
  // its skeleton for a moment instead of showing "Too many requests". Writes the user triggered go straight through.
  if (String(config.method || 'get').toLowerCase() === 'get') {
    const wait = cooldownUntil - Date.now();
    if (wait > 0) await new Promise((r) => setTimeout(r, wait + Math.random() * 1500));
  }
  return config;
});

export type ApiError = Error & { status?: number; code?: string };

api.interceptors.response.use(
  (res) => res,
  async (error: AxiosError<any>) => {
    if (__DEV__) {
      // one short line; 403 / 429 are expected in some flows and are handled by the callers
      console.log(`[API] ${String(error.config?.method).toUpperCase()} ${error.config?.url} -> ${error.response?.status ?? error.code}: ${error.response?.data?.message ?? error.message}`);
    }
    const status = error.response?.status;
    const data = error.response?.data;

    if (status === 429) {
      const header = Number((error.response?.headers as any)?.['retry-after']);
      startCooldown(Number.isFinite(header) && header > 0 ? header : data?.retryAfter);
      // reads heal themselves: wait out the window (see request interceptor) and try again, up to 2 times
      const cfg: any = error.config;
      if (cfg && String(cfg.method || 'get').toLowerCase() === 'get' && (cfg.__retries || 0) < 2) {
        cfg.__retries = (cfg.__retries || 0) + 1;
        return api.request(cfg);
      }
    }

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

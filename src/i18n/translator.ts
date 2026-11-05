import AsyncStorage from '@react-native-async-storage/async-storage';
import { TRANSLATE_API_KEY } from '../config/env';

/**
 * Mobile equivalent of the web's Google Translate widget.
 *
 * The web translates the rendered page in the browser. React Native has no page to translate, so every <Text> and
 * TextInput placeholder asks this module for its translation (see installTranslation.ts). Missing strings are
 * collected, sent to Google Cloud Translation in small batches, cached (memory + AsyncStorage) and the screen
 * refreshes itself. English is the source language, exactly like the web's `googtrans=/en/<code>` cookie.
 */

const LANG_KEY = 'app_language'; // same key name the web uses in localStorage
const CACHE_PREFIX = 'wonpet:i18n:';
const OFFICIAL_ENDPOINT = 'https://translation.googleapis.com/language/translate/v2'; // only used if an optional key is set
const FREE_ENDPOINT = 'https://translate.googleapis.com/translate_a/single'; // keyless - the same service the web's Google Translate widget uses
const FREE_PARALLEL = 4;
const MAX_FREE_CHARS = 1500;
const BATCH_SIZE = 40;
const FLUSH_DELAY_MS = 120;
const MAX_CACHED_PER_LANGUAGE = 1500; // keeps the AsyncStorage entry well under Android's per-row limit

type Listener = () => void;

let current = 'en';
let version = 0;
let lastError: string | null = null;
const listeners = new Set<Listener>();
const cache: Record<string, Record<string, string>> = {};
const pending = new Set<string>();
const inflight = new Set<string>();
const failed = new Set<string>(); // not retried until the language changes
let flushTimer: ReturnType<typeof setTimeout> | null = null;
let persistTimer: ReturnType<typeof setTimeout> | null = null;

const emit = () => { version += 1; listeners.forEach((l) => l()); };

export const subscribe = (l: Listener) => { listeners.add(l); return () => { listeners.delete(l); }; };
export const getVersion = () => version;
export const getLanguageCode = () => current;
export const isTranslationConfigured = () => true; // works without a key, like the web widget
export const isBusy = () => pending.size > 0 || inflight.size > 0;
export const getLastError = () => lastError;

/** Only strings with Latin letters are worth sending - numbers, prices, emoji and already-translated text are skipped. */
const needsTranslation = (s: string) => s.trim().length > 1 && /[A-Za-z]/.test(s);

/** Translated text for the current language, or the original while it is still being fetched. */
export function tr(text: string): string {
  if (current === 'en' || !needsTranslation(text) || (!TRANSLATE_API_KEY && text.length > MAX_FREE_CHARS)) return text;
  const hit = cache[current]?.[text];
  if (hit !== undefined) return hit;
  if (!inflight.has(text) && !failed.has(text)) { pending.add(text); schedule(); }
  return text;
}

function schedule() {
  if (flushTimer) return;
  flushTimer = setTimeout(() => { flushTimer = null; flush(); }, FLUSH_DELAY_MS);
}

function persist(lang: string) {
  if (persistTimer) clearTimeout(persistTimer);
  persistTimer = setTimeout(() => {
    const entries = Object.entries(cache[lang] ?? {});
    const trimmed = entries.length > MAX_CACHED_PER_LANGUAGE ? entries.slice(entries.length - MAX_CACHED_PER_LANGUAGE) : entries;
    AsyncStorage.setItem(CACHE_PREFIX + lang, JSON.stringify(Object.fromEntries(trimmed))).catch(() => {});
  }, 1000);
}

async function translateOfficial(batch: string[], lang: string): Promise<(string | undefined)[]> {
  const res = await fetch(`${OFFICIAL_ENDPOINT}?key=${encodeURIComponent(TRANSLATE_API_KEY)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ q: batch, source: 'en', target: lang, format: 'text' }),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json?.error?.message || `Translation failed (${res.status})`);
  return (json?.data?.translations ?? []).map((t: { translatedText: string }) => t.translatedText);
}

/** Keyless: one request per string, a few at a time. Response shape: [[["translated","original",...], ...], ...] */
async function translateFree(batch: string[], lang: string): Promise<(string | undefined)[]> {
  const out: (string | undefined)[] = new Array(batch.length).fill(undefined);
  let next = 0;
  const worker = async () => {
    while (next < batch.length) {
      const i = next++;
      try {
        const res = await fetch(`${FREE_ENDPOINT}?client=gtx&sl=en&tl=${encodeURIComponent(lang)}&dt=t&q=${encodeURIComponent(batch[i])}`);
        if (!res.ok) throw new Error(`Translation failed (${res.status})`);
        const json = await res.json();
        out[i] = (json?.[0] ?? []).map((seg: any[]) => seg?.[0] ?? '').join('') || undefined;
      } catch (e: any) {
        if (!out.some((v) => v !== undefined) && i === 0) throw e; // nothing worked at all -> surface the error
      }
    }
  };
  await Promise.all(Array.from({ length: Math.min(FREE_PARALLEL, batch.length) }, worker));
  return out;
}

async function flush() {
  const lang = current;
  if (lang === 'en' || !pending.size) return;
  const batch = Array.from(pending).slice(0, BATCH_SIZE);
  batch.forEach((s) => { pending.delete(s); inflight.add(s); });
  try {
    const out = TRANSLATE_API_KEY ? await translateOfficial(batch, lang) : await translateFree(batch, lang);
    if (lang === current) { // ignore answers that arrive after the user switched language again
      const store = (cache[lang] ??= {});
      batch.forEach((s, i) => { store[s] = out[i] ?? s; });
      lastError = null;
      persist(lang);
    }
  } catch (e: any) {
    batch.forEach((s) => failed.add(s));
    lastError = e?.message || 'Translation failed';
  } finally {
    batch.forEach((s) => inflight.delete(s));
    emit();
    if (pending.size) schedule();
  }
}

async function loadCache(lang: string) {
  if (lang === 'en' || cache[lang]) return;
  try {
    const raw = await AsyncStorage.getItem(CACHE_PREFIX + lang);
    cache[lang] = raw ? JSON.parse(raw) : {};
  } catch { cache[lang] = {}; }
}

/** Switch language. No reload is needed (the web reloads the page for the Google widget); mounted screens refresh in place. */
export async function setLanguageCode(code: string) {
  await loadCache(code);
  current = code;
  pending.clear();
  failed.clear();
  lastError = null;
  AsyncStorage.setItem(LANG_KEY, code).catch(() => {});
  emit();
}

/** Restore the saved language at app start. */
export async function initLanguage(): Promise<string> {
  try {
    const saved = (await AsyncStorage.getItem(LANG_KEY)) || 'en';
    await loadCache(saved);
    current = saved;
  } catch { current = 'en'; }
  emit();
  return current;
}
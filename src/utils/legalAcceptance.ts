import AsyncStorage from '@react-native-async-storage/async-storage';
import { LEGAL_DOCS, LEGAL_ORDER, type LegalDocId } from '../data/legal';

const KEY = 'wonpet:legal-accepted';

export type LegalAcceptance = { at: string; versions: Record<LegalDocId, string> };

/** The versions that are current right now. */
export const currentVersions = (): Record<LegalDocId, string> =>
  Object.fromEntries(LEGAL_ORDER.map((id) => [id, LEGAL_DOCS[id].version])) as Record<LegalDocId, string>;

/** Called at sign-up, when the user ticks "I agree" and continues: remembers which versions they agreed to, and when. */
export async function recordLegalAcceptance(): Promise<void> {
  try {
    const rec: LegalAcceptance = { at: new Date().toISOString(), versions: currentVersions() };
    await AsyncStorage.setItem(KEY, JSON.stringify(rec));
  } catch { /* never block sign-up on this */ }
}

/** What was accepted on this device, or null (older accounts, Google sign-in on another device, cleared app data). */
export async function getLegalAcceptance(): Promise<LegalAcceptance | null> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return null;
    const rec = JSON.parse(raw);
    return rec && typeof rec.at === 'string' && rec.versions ? (rec as LegalAcceptance) : null;
  } catch {
    return null;
  }
}

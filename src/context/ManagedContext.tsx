import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from './AuthContext';
import { ManagedAccount, managedService } from '../services/managed.service';

type Ctx = {
  /** Owners who currently share pets with this user (accepted + within their dates). */
  accounts: ManagedAccount[];
  /** True while the app shows the shared pets instead of the user's own account. */
  isManaged: boolean;
  /** True when at least one owner is sharing pets, so the switcher is worth showing. */
  canSwitch: boolean;
  enterManaged: () => void;
  exitManaged: () => void;
  refreshAccounts: () => Promise<void>;
};

const KEY = 'wonpet:managed';
const ManagedContext = createContext<Ctx>({ accounts: [], isManaged: false, canSwitch: false, enterManaged() {}, exitManaged() {}, refreshAccounts: async () => {} });
export const useManaged = () => useContext(ManagedContext);

/** The mobile twin of the web's "collaborator mode": switch between My Account and Shared With Me. */
export function ManagedProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [accounts, setAccounts] = useState<ManagedAccount[]>([]);
  const [isManaged, setIsManaged] = useState(false);

  const setMode = useCallback((v: boolean) => {
    setIsManaged(v);
    if (v) AsyncStorage.setItem(KEY, '1').catch(() => {});
    else AsyncStorage.removeItem(KEY).catch(() => {});
  }, []);

  // remember the last mode across app restarts (it only applies while a user is signed in)
  useEffect(() => {
    AsyncStorage.getItem(KEY).then((v) => { if (v === '1') setIsManaged(true); }).catch(() => {});
  }, []);

  const refreshAccounts = useCallback(async () => {
    try {
      const list = await managedService.accounts();
      setAccounts((prev) => (JSON.stringify(prev) === JSON.stringify(list) ? prev : list));
      // access was revoked / expired while in shared mode -> fall back to the user's own account
      if (!list.length) setMode(false);
    } catch {
      /* offline - keep what we have */
    }
  }, [setMode]);

  useEffect(() => {
    if (user?.id) refreshAccounts();
    else { setAccounts([]); setMode(false); }
  }, [user?.id, refreshAccounts, setMode]);

  return (
    <ManagedContext.Provider
      value={{
        accounts,
        isManaged: isManaged && !!user,
        canSwitch: accounts.length > 0,
        enterManaged: () => { if (accounts.length > 0) setMode(true); },
        exitManaged: () => setMode(false),
        refreshAccounts,
      }}
    >
      {children}
    </ManagedContext.Provider>
  );
}

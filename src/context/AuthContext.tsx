import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ApiUser, Session, authService } from '../services/auth.service';
import { setUnauthorizedHandler, tokenStore } from '../services/api';
import { AppRole, fromApiRole, mapUser, toApiGender } from '../services/mappers';

export type User = {
  id: string;
  name: string;
  email: string;
  phone: string;
  gender: 'male' | 'female' | 'other';
  role: AppRole;
  /** Saved as the account "address" on the backend. */
  location: string;
  profileImage?: string;
  createdAt?: string;
  isSubscribed?: boolean;
  subscriptionPlan?: string;
};
type SessionResult = { ok: true } | { ok: false; message: string };
type Ctx = {
  loading: boolean;
  onboarded: boolean;
  user: User | null;
  finishOnboarding: () => Promise<void>;
  /** Call with the token + user returned by verify-otp / register / google login. */
  startSession: (s: Session) => Promise<SessionResult>;
  updateProfile: (patch: { name: string; gender?: User['gender']; location?: string; imageUri?: string }) => Promise<void>;
  refreshUser: () => Promise<void>;
  signOut: () => Promise<void>;
};

const KEY_ONB = 'wonpet:onboarded';
const KEY_USER = 'wonpet:user';
const AuthContext = createContext<Ctx>({} as Ctx);
export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [onboarded, setOnboarded] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const userRef = useRef<User | null>(null);
  userRef.current = user;

  const persist = async (u: User | null) => {
    setUser(u);
    if (u) await AsyncStorage.setItem(KEY_USER, JSON.stringify(u));
    else await AsyncStorage.removeItem(KEY_USER);
  };

  const signOut = useCallback(async () => {
    await tokenStore.clear();
    await persist(null);
  }, []);

  useEffect(() => {
    // any request answered with 401 (expired / revoked token) ends the session
    setUnauthorizedHandler(() => {
      persist(null);
    });
    return () => setUnauthorizedHandler(null);
  }, []);

  useEffect(() => {
    (async () => {
      const [o, u, token] = await Promise.all([AsyncStorage.getItem(KEY_ONB), AsyncStorage.getItem(KEY_USER), tokenStore.load()]);
      setOnboarded(o === '1');
      // a cached user without a token is useless
      if (u && token) setUser(JSON.parse(u));
      else if (u) await AsyncStorage.removeItem(KEY_USER);
      setTimeout(() => setLoading(false), 1400); // keep splash visible briefly

      // refresh the profile in the background; a 401 here signs the user out through the handler above
      if (token) {
        try {
          await persist(mapUser(await authService.getProfile()));
        } catch {
          /* offline - keep the cached profile */
        }
      }
    })();
  }, []);

  const finishOnboarding = async () => {
    await AsyncStorage.setItem(KEY_ONB, '1');
    setOnboarded(true);
  };

  const startSession: Ctx['startSession'] = async ({ token, user: api }: Session) => {
    if (fromApiRole(api.role) !== 'user') {
      return { ok: false, message: 'This app is for pet owners. Please use the WON PET web portal for your doctor / store manager account.' };
    }
    await tokenStore.set(token);
    await persist(mapUser(api as ApiUser));
    return { ok: true };
  };

  const refreshUser = async () => {
    try {
      await persist(mapUser(await authService.getProfile()));
    } catch {
      /* ignore */
    }
  };

  const updateProfile: Ctx['updateProfile'] = async (patch) => {
    const cur = userRef.current;
    const updated = await authService.updateProfile({
      name: patch.name,
      gender: patch.gender ? toApiGender(patch.gender) : undefined,
      address: patch.location,
      imageUri: patch.imageUri,
    });
    await persist({ ...(cur as User), ...mapUser(updated) });
  };

  return (
    <AuthContext.Provider value={{ loading, onboarded, user, finishOnboarding, startSession, updateProfile, refreshUser, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

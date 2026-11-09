import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { io, Socket } from 'socket.io-client';
import { API_ORIGIN } from '../config/env';
import { tokenStore } from '../services/api';
import { notificationsService } from '../services/notifications.service';
import { DoctorProfile, DoctorStatus, doctorService } from '../services/doctor.service';
import { toast } from '../components/WonPetsAlert';
import { errorMessage } from '../services/api';
import { useAuth } from './AuthContext';

type Ctx = {
  profile: DoctorProfile | null;
  status: DoctorStatus;
  setStatus: (s: DoctorStatus) => Promise<void>;
  /** Unread notification count (header badge). */
  unread: number;
  /** Bumps whenever something changed on the server - screens pass it to useRemote as `quietKey` to refetch silently. */
  tick: number;
  syncNow: () => Promise<void>;
  refreshProfile: () => Promise<void>;
};

const DoctorContext = createContext<Ctx>({
  profile: null, status: 'available', setStatus: async () => {}, unread: 0, tick: 0, syncNow: async () => {}, refreshProfile: async () => {},
});
export const useDoctor = () => useContext(DoctorContext);

const POLL_MS = 20000;
const FULL_MS = 90000;
const EVENTS = [
  'notification', 'new_notification', 'notification:new', 'notification_created',
  'appointment_created', 'appointment_updated', 'appointment_cancelled', 'prescription:changed', 'new_message',
  'collaborator_invited', 'collaboration_invited', 'collaborator_updated', 'collaboration_updated',
  'collaborator_revoked', 'collaboration_revoked', 'collaboration_expired', 'invitation', 'invitation_updated',
];

/** Live data for the doctor role: profile + presence status, unread count and a refresh "tick" (socket push + polling). */
export function DoctorProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [profile, setProfile] = useState<DoctorProfile | null>(null);
  const [status, setStatusState] = useState<DoctorStatus>('available');
  const [unread, setUnread] = useState(0);
  const [tick, setTick] = useState(0);
  const lastUnread = useRef(0);
  const lastFull = useRef(0);
  const busy = useRef(false);

  const refreshProfile = useCallback(async () => {
    try { const p = await doctorService.profile(); setProfile(p); setStatusState(p.status); } catch { /* keep what we have */ }
  }, []);

  const setStatus = useCallback(async (s: DoctorStatus) => {
    const prev = status;
    setStatusState(s);
    try { await doctorService.setStatus(s); } catch (e) { setStatusState(prev); toast.error(errorMessage(e, 'Could not update your status.')); }
  }, [status]);

  const syncNow = useCallback(async () => {
    if (!user?.id) return;
    try { const n = await notificationsService.unreadCount(); setUnread(n); lastUnread.current = n; } catch { /* offline */ }
    lastFull.current = Date.now();
    setTick((t) => t + 1);
  }, [user?.id]);

  const poll = useCallback(async () => {
    if (!user?.id || busy.current) return;
    busy.current = true;
    try {
      const n = await notificationsService.unreadCount();
      setUnread(n);
      const changed = n !== lastUnread.current;
      lastUnread.current = n;
      if (changed || Date.now() - lastFull.current > FULL_MS) { lastFull.current = Date.now(); setTick((t) => t + 1); }
    } catch { /* try again next time */ } finally { busy.current = false; }
  }, [user?.id]);

  const syncRef = useRef(syncNow); syncRef.current = syncNow;
  const pollRef = useRef(poll); pollRef.current = poll;

  useEffect(() => {
    if (!user?.id) { setProfile(null); setUnread(0); return; }
    refreshProfile();
    pollRef.current();
    const socket: Socket = io(API_ORIGIN, { auth: { token: tokenStore.get() }, transports: ['websocket'], reconnection: true, reconnectionDelay: 1500 });
    EVENTS.forEach((e) => socket.on(e, () => syncRef.current()));
    socket.on('connect', () => pollRef.current());
    const timer = setInterval(() => { if (AppState.currentState === 'active') pollRef.current(); }, POLL_MS);
    const sub = AppState.addEventListener('change', (s) => { if (s === 'active') syncRef.current(); });
    return () => { socket.removeAllListeners(); socket.disconnect(); clearInterval(timer); sub.remove(); };
  }, [user?.id, refreshProfile]);

  const value = useMemo(() => ({ profile, status, setStatus, unread, tick, syncNow, refreshProfile }), [profile, status, setStatus, unread, tick, syncNow, refreshProfile]);
  return <DoctorContext.Provider value={value}>{children}</DoctorContext.Provider>;
}

export const STATUS_OPTIONS: { value: DoctorStatus; label: string; dot: string; hint: string }[] = [
  { value: 'available', label: 'Available', dot: '#16A34A', hint: 'Owners can book and message you' },
  { value: 'busy', label: 'Busy', dot: '#EF4444', hint: 'In a consultation' },
  { value: 'away', label: 'Away', dot: '#F5B301', hint: 'Back shortly' },
  { value: 'on_leave', label: 'On leave', dot: '#94A3B8', hint: 'Not taking visits' },
];

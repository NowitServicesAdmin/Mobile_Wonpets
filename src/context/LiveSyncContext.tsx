import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { io, Socket } from 'socket.io-client';
import { API_ORIGIN } from '../config/env';
import { tokenStore } from '../services/api';
import { notificationsService } from '../services/notifications.service';
import { useAuth } from './AuthContext';
import { useSettings } from './SettingsContext';
import { useManaged } from './ManagedContext';
import { usePets } from './PetsContext';
import { useCart } from './CartContext';
import { useChat } from './ChatContext';
import { useResell } from './ResellContext';

type Ctx = {
  /** Unread notification count (header badge). Updates live. */
  unread: number;
  /** Bumps every time a full refresh finishes - screens with their own local data can reload when it changes. */
  tick: number;
  /** Pull everything now. */
  syncNow: () => Promise<void>;
};

const LiveSyncContext = createContext<Ctx>({ unread: 0, tick: 0, syncNow: async () => {} });
export const useLiveSync = () => useContext(LiveSyncContext);

const POLL_MS = 20000;   // cheap check (unread count) - catches anything that creates a notification within ~20s
const FULL_MS = 90000;  // full refresh of every area even if nothing notified (catches silent changes)

// Server events that mean "something changed for this user". Unknown names are harmless.
const EVENTS = [
  'notification', 'new_notification', 'notification:new', 'notification_created',
  'collaborator_invited', 'collaboration_invited', 'collaborator_updated', 'collaboration_updated',
  'collaborator_revoked', 'collaboration_revoked', 'collaboration_expired', 'invitation', 'invitation_updated',
  'appointment_created', 'appointment_updated', 'appointment_cancelled',
  'order_created', 'order_updated', 'order_status', 'schedule_updated', 'pet_updated',
];

/** Lets a role that has no full LiveSyncProvider (the doctor) feed the shared "Shared With Me" screens their refresh tick. */
export function LiveSyncTickProvider({ tick, unread = 0, syncNow, children }: { tick: number; unread?: number; syncNow: () => Promise<void>; children: React.ReactNode }) {
  const value = useMemo(() => ({ unread, tick, syncNow }), [unread, tick, syncNow]);
  return <LiveSyncContext.Provider value={value}>{children}</LiveSyncContext.Provider>;
}

/**
 * Keeps the WHOLE app fresh without pull-to-refresh:
 *  1. socket.io push (instant, if the backend emits it)
 *  2. every 20s while the app is open: check the unread count - if it changed, refresh everything
 *  3. every 90s: refresh everything anyway
 *  4. coming back to the app: refresh everything
 * "Everything" = invitations, collaborators, shared accounts, pets, appointments, schedule,
 * orders, cart, wishlist, chat list and resell listings. All refreshes are silent (no spinners, no error toasts).
 */
export function LiveSyncProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const { refreshInvitations, refreshCollaborators } = useSettings();
  const { refreshAccounts } = useManaged();
  const { syncQuiet: syncPets } = usePets();
  const { refreshOrders, refreshCart, refreshWishlist } = useCart();
  const { refreshQuiet: syncChat } = useChat();
  const { refreshQuiet: syncResell } = useResell();

  const [unread, setUnread] = useState(0);
  const [tick, setTick] = useState(0);
  const lastUnread = useRef(0);
  const lastFull = useRef(0);
  const busy = useRef(false);

  const refreshData = useCallback(async () => {
    lastFull.current = Date.now();
    const quiet = (fn?: () => Promise<any>) => Promise.resolve(fn?.()).catch(() => {});
    await Promise.all([
      quiet(refreshInvitations), quiet(refreshCollaborators), quiet(refreshAccounts),
      quiet(syncPets), quiet(refreshOrders), quiet(refreshCart), quiet(refreshWishlist),
      quiet(syncChat), quiet(syncResell),
    ]);
    setTick((t) => t + 1);
  }, [refreshInvitations, refreshCollaborators, refreshAccounts, syncPets, refreshOrders, refreshCart, refreshWishlist, syncChat, syncResell]);

  // cheap periodic check; escalates to a full refresh when the unread count moved or 30s passed
  const syncNow = useCallback(async () => {
    if (!user?.id || busy.current) return;
    busy.current = true;
    try {
      const n = await notificationsService.unreadCount();
      setUnread(n);
      const changed = n !== lastUnread.current;
      lastUnread.current = n;
      if (changed || Date.now() - lastFull.current > FULL_MS) await refreshData();
    } catch { /* offline - try again next tick */ }
    finally { busy.current = false; }
  }, [user?.id, refreshData]);

  // a push from the server, or the app coming back to the foreground: refresh everything right away
  const syncAll = useCallback(async () => {
    if (!user?.id) return;
    try { const n = await notificationsService.unreadCount(); setUnread(n); lastUnread.current = n; } catch {}
    await refreshData();
  }, [user?.id, refreshData]);

  const syncAllRef = useRef(syncAll); syncAllRef.current = syncAll;
  const syncRef = useRef(syncNow); syncRef.current = syncNow;

  useEffect(() => {
    if (!user?.id) { setUnread(0); lastUnread.current = 0; return; }
    syncRef.current();

    const socket: Socket = io(API_ORIGIN, { auth: { token: tokenStore.get() }, transports: ['websocket'], reconnection: true, reconnectionDelay: 1500 });
    EVENTS.forEach((e) => socket.on(e, () => syncAllRef.current()));
    socket.on('connect', () => syncRef.current());

    const timer = setInterval(() => { if (AppState.currentState === 'active') syncRef.current(); }, POLL_MS);
    const sub = AppState.addEventListener('change', (s) => { if (s === 'active') syncAllRef.current(); });

    return () => { socket.removeAllListeners(); socket.disconnect(); clearInterval(timer); sub.remove(); };
  }, [user?.id]);

  const value = useMemo(() => ({ unread, tick, syncNow: syncAll }), [unread, tick, syncAll]);
  return <LiveSyncContext.Provider value={value}>{children}</LiveSyncContext.Provider>;
}

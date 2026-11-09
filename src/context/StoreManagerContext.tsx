import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { io, Socket } from 'socket.io-client';
import { API_ORIGIN } from '../config/env';
import { tokenStore } from '../services/api';
import { notificationsService } from '../services/notifications.service';
import { smService } from '../services/storeManager.service';
import { useAuth } from './AuthContext';

type Ctx = {
  /** Unread notification count (header bell). */
  unread: number;
  /** Orders waiting to be accepted (badge on the Orders tab). */
  pendingOrders: number;
  /** Bumps whenever something changed on the server - screens pass it to useRemote as `quietKey`. */
  tick: number;
  syncNow: () => Promise<void>;
};

const StoreManagerContext = createContext<Ctx>({ unread: 0, pendingOrders: 0, tick: 0, syncNow: async () => {} });
export const useStoreManager = () => useContext(StoreManagerContext);

const POLL_MS = 20000;
const FULL_MS = 90000;
const EVENTS = [
  'notification', 'new_notification', 'notification:new', 'notification_created',
  'order_created', 'order_updated', 'order:new', 'order:updated', 'new_order', 'order_status_updated',
  'review_created', 'product_question',
];

/** Live data for the store-manager role (same idea as DoctorContext): socket push + light polling. */
export function StoreManagerProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [unread, setUnread] = useState(0);
  const [pendingOrders, setPending] = useState(0);
  const [tick, setTick] = useState(0);
  const lastUnread = useRef(0);
  const lastFull = useRef(0);
  const busy = useRef(false);

  const readPending = useCallback(() => smService.orderSummary().then((s) => setPending(s.pending)).catch(() => {}), []);

  const syncNow = useCallback(async () => {
    if (!user?.id) return;
    try { const n = await notificationsService.unreadCount(); setUnread(n); lastUnread.current = n; } catch { /* offline */ }
    readPending();
    lastFull.current = Date.now();
    setTick((t) => t + 1);
  }, [user?.id, readPending]);

  const poll = useCallback(async () => {
    if (!user?.id || busy.current) return;
    busy.current = true;
    try {
      const n = await notificationsService.unreadCount();
      setUnread(n);
      const changed = n !== lastUnread.current;
      lastUnread.current = n;
      if (changed || Date.now() - lastFull.current > FULL_MS) {
        lastFull.current = Date.now();
        readPending();
        setTick((t) => t + 1);
      }
    } catch { /* try again next time */ } finally { busy.current = false; }
  }, [user?.id, readPending]);

  const syncRef = useRef(syncNow); syncRef.current = syncNow;
  const pollRef = useRef(poll); pollRef.current = poll;

  useEffect(() => {
    if (!user?.id) { setUnread(0); setPending(0); return; }
    readPending();
    pollRef.current();
    const socket: Socket = io(API_ORIGIN, { auth: { token: tokenStore.get() }, transports: ['websocket'], reconnection: true, reconnectionDelay: 1500 });
    EVENTS.forEach((e) => socket.on(e, () => syncRef.current()));
    socket.on('connect', () => pollRef.current());
    const timer = setInterval(() => { if (AppState.currentState === 'active') pollRef.current(); }, POLL_MS);
    const sub = AppState.addEventListener('change', (s) => { if (s === 'active') syncRef.current(); });
    return () => { socket.removeAllListeners(); socket.disconnect(); clearInterval(timer); sub.remove(); };
  }, [user?.id, readPending]);

  const value = useMemo(() => ({ unread, pendingOrders, tick, syncNow }), [unread, pendingOrders, tick, syncNow]);
  return <StoreManagerContext.Provider value={value}>{children}</StoreManagerContext.Provider>;
}

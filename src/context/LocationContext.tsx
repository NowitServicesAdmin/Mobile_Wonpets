import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Coords, getCurrentCoords, metresBetween } from '../utils/location';
import { PlaceDetails, locationService } from '../services/location.service';
import { useAuth } from './AuthContext';
import { askCallPermissionsOnce } from '../utils/permissions';

export type LivePlace = Pick<PlaceDetails, 'area' | 'city' | 'district' | 'state' | 'address'> & { lat: number; lng: number; at: number };
type Ctx = {
  /** Where the phone is right now (area / city). null until the first fix, or when location access is off. */
  place: LivePlace | null;
  /** True while the first fix is still being worked out. */
  detecting: boolean;
  refresh: (force?: boolean) => Promise<void>;
};
const LocationContext = createContext<Ctx>({ place: null, detecting: false, refresh: async () => {} });
export const useLiveLocation = () => useContext(LocationContext);

const KEY = 'wonpet:live-place';
const MOVED_METRES = 500;      // re-geocode only after moving this far
const MAX_AGE_MS = 15 * 60000; // ...or after this long

/**
 * Follows the user's current position (permission is already requested elsewhere in the app), so the header
 * shows where they are now - e.g. after travelling - instead of only the address saved in Settings.
 */
export function LocationProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [place, setPlace] = useState<LivePlace | null>(null);
  const [detecting, setDetecting] = useState(false);
  const busy = useRef(false);
  const last = useRef<LivePlace | null>(null);
  last.current = place;

  const refresh = useCallback(async (force = false) => {
    if (busy.current) return;
    busy.current = true;
    try {
      const coords: Coords | null = await getCurrentCoords({ fresh: true });
      if (!coords) return; // denied / unavailable: keep whatever we had
      const prev = last.current;
      if (!force && prev && Date.now() - prev.at < MAX_AGE_MS && metresBetween(coords, { lat: prev.lat, lng: prev.lng }) < MOVED_METRES) return;
      const d = await locationService.reverse(coords.lat, coords.lng);
      const next: LivePlace = { area: d.area, city: d.city, district: d.district, state: d.state, address: d.address, lat: coords.lat, lng: coords.lng, at: Date.now() };
      setPlace(next);
      AsyncStorage.setItem(KEY, JSON.stringify(next)).catch(() => {});
    } catch { /* offline / geocoder down - keep the last known place */ }
    finally { busy.current = false; setDetecting(false); }
  }, []);

  // show the last known place instantly, then update it
  useEffect(() => {
    if (!user?.id) { setPlace(null); return; }
    let live = true;
    setDetecting(true);
    AsyncStorage.getItem(KEY).then((raw) => { if (live && raw) { try { setPlace(JSON.parse(raw)); } catch { /* ignore */ } } }).catch(() => {}).finally(() => { refresh().finally(() => askCallPermissionsOnce()); });
    return () => { live = false; };
  }, [user?.id, refresh]);

  // coming back to the app after travelling
  useEffect(() => {
    if (!user?.id) return;
    const sub = AppState.addEventListener('change', (s) => { if (s === 'active') refresh(); });
    return () => sub.remove();
  }, [user?.id, refresh]);

  return <LocationContext.Provider value={{ place, detecting, refresh }}>{children}</LocationContext.Provider>;
}

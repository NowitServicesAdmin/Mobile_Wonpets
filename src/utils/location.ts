import * as Location from 'expo-location';

export type Coords = { lat: number; lng: number };

/** Current position (asks for permission once). Returns null when denied / unavailable. */
export async function getCurrentCoords(opts: { fresh?: boolean } = {}): Promise<Coords | null> {
  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') return null;
    // `fresh` skips the cached fix - needed to notice that the user has travelled
    const last = opts.fresh ? null : await Location.getLastKnownPositionAsync();
    const pos = last ?? (await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }));
    return { lat: pos.coords.latitude, lng: pos.coords.longitude };
  } catch {
    return null;
  }
}

/** "Street, Area, Nellore, Andhra Pradesh 524001, India" -> "Nellore, Andhra Pradesh" (same rule as the web navbar). */
export function formatLocation(address?: string | null): string {
  if (!address) return '';
  const parts = address.split(',').map((p) => p.trim()).filter(Boolean);
  if (parts.length < 3) return address;
  const state = parts[parts.length - 2].replace(/\d+/g, '').trim();
  const city = parts[parts.length - 3];
  return `${city}, ${state}`;
}

type LocationInfo = { city?: string; state?: string; formattedAddress?: string; location?: string; address?: string };

/**
 * What the app header shows as "your location". The source of truth is Settings > Additional Information
 * (the same data the location picker saves). The profile address is only a fallback for accounts that
 * haven't opened that section yet.
 */
export function headerLocation(info?: LocationInfo | null, profileAddress?: string | null): string {
  const city = info?.city?.trim();
  const state = info?.state?.trim();
  if (city && state) return `${city}, ${state}`;
  const full = info?.formattedAddress || info?.location || info?.address;
  if (full) return formatLocation(full);
  if (city || state) return (city || state) as string;
  return formatLocation(profileAddress);
}

/** Distance between two points in metres (haversine). */
export function metresBetween(a: Coords, b: Coords): number {
  const R = 6371000, rad = (d: number) => (d * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat), dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/** "Indiranagar, Bengaluru" - the short label for a place. */
export function areaCity(p?: { area?: string; city?: string; district?: string } | null): string {
  if (!p) return '';
  const parts = [p.area, p.city || p.district].map((x) => (x || '').trim()).filter(Boolean);
  return parts.filter((x, i) => parts.findIndex((y) => y.toLowerCase() === x.toLowerCase()) === i).join(', ');
}

import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { Listing } from '../data/resell';
import { toast } from '../components/WonPetsAlert';
import { useAuth } from './AuthContext';
import { errorMessage } from '../services/api';
import { ListingInput, resellService } from '../services/resell.service';

type Ctx = {
  /** Marketplace listings from other sellers + your own (yours have sellerId === 'me'). */
  listings: Listing[];
  favourites: string[];
  recent: string[];
  loading: boolean;
  refresh: () => Promise<void>;
  refreshQuiet: () => Promise<void>;
  /** Loads one listing in full (seller details, phone) and merges it into `listings`. */
  loadListing: (id: string) => Promise<void>;
  toggleFavourite: (id: string) => boolean;
  addRecent: (id: string) => void;
  /** Resolves to the new listing id, or null on failure (an error toast is shown). */
  createListing: (l: ListingInput) => Promise<string | null>;
  updateListing: (id: string, patch: Partial<ListingInput>) => Promise<boolean>;
  deleteListing: (id: string) => Promise<boolean>;
  markSold: (id: string) => Promise<boolean>;
  toggleActive: (id: string) => Promise<boolean>;
};
const ResellContext = createContext<Ctx>({} as Ctx);
export const useResell = () => useContext(ResellContext);

const merge = (list: Listing[], items: Listing[]) => {
  const map = new Map(list.map((l) => [l.id, l]));
  items.forEach((i) => map.set(i.id, { ...map.get(i.id), ...i }));
  return [...map.values()];
};

export function ResellProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const meId = user?.id ?? '';
  const [listings, setListings] = useState<Listing[]>([]);
  const [favourites, setFavourites] = useState<string[]>([]);
  const [recent, setRecent] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const loadedFor = useRef<string | null>(null);
  const patch = (id: string, p: Partial<Listing> | ((l: Listing) => Partial<Listing>)) =>
    setListings((all) => all.map((l) => (l.id === id ? { ...l, ...(typeof p === 'function' ? p(l) : p) } : l)));

  const load = useCallback(async (quiet = false) => {
    if (!meId) return;
    if (!quiet) setLoading(true);
    try {
      const [all, mine, favs] = await Promise.all([resellService.all(meId), resellService.mine(meId), resellService.favourites(meId)]);
      setListings(merge(all, mine));
      setFavourites(favs.map((f) => f.id));
    } catch (e) {
      if (!quiet) toast.error(errorMessage(e));
    } finally {
      if (!quiet) setLoading(false);
    }
  }, [meId]);
  const refresh = useCallback(() => load(false), [load]);
  /** Silent re-fetch of listings - used by live sync. */
  const refreshQuiet = useCallback(async () => { await load(true); }, [load]);

  useEffect(() => {
    if (!user) { loadedFor.current = null; setListings([]); setFavourites([]); setRecent([]); return; }
    if (loadedFor.current === user.id) return;
    loadedFor.current = user.id;
    refresh();
  }, [user, refresh]);

  const loadListing: Ctx['loadListing'] = async (id) => {
    try {
      const l = await resellService.get(id, meId);
      setListings((all) => merge(all, [l]));
    } catch { /* the cached copy (if any) is shown */ }
  };

  const toggleFavourite: Ctx['toggleFavourite'] = (id) => {
    const adding = !favourites.includes(id);
    setFavourites((f) => (adding ? [...f, id] : f.filter((x) => x !== id))); // optimistic
    patch(id, (l) => ({ favouritesCount: Math.max(0, l.favouritesCount + (adding ? 1 : -1)) }));
    resellService.toggleFavourite(id).then(
      (r) => { setFavourites((f) => (r.favourite ? [...new Set([...f, id])] : f.filter((x) => x !== id))); patch(id, { favouritesCount: r.total }); },
      (e) => {
        setFavourites((f) => (adding ? f.filter((x) => x !== id) : [...f, id]));
        patch(id, (l) => ({ favouritesCount: Math.max(0, l.favouritesCount + (adding ? -1 : 1)) }));
        toast.error(errorMessage(e));
      },
    );
    return adding;
  };

  const addRecent: Ctx['addRecent'] = (id) => {
    setRecent((r) => [id, ...r.filter((x) => x !== id)].slice(0, 8));
    patch(id, (l) => ({ views: l.views + 1 }));
    resellService.view(id).catch(() => {});
  };

  const createListing: Ctx['createListing'] = async (l) => {
    try {
      const created = await resellService.create(l, meId);
      setListings((all) => [created, ...all]);
      return created.id;
    } catch (e) {
      toast.error(errorMessage(e, 'Could not publish the listing.'));
      return null;
    }
  };
  const updateListing: Ctx['updateListing'] = async (id, p) => {
    try {
      const updated = await resellService.update(id, p, meId);
      patch(id, updated);
      return true;
    } catch (e) {
      toast.error(errorMessage(e, 'Could not update the listing.'));
      return false;
    }
  };
  const deleteListing: Ctx['deleteListing'] = async (id) => {
    try {
      await resellService.remove(id);
      setListings((all) => all.filter((l) => l.id !== id));
      return true;
    } catch (e) { toast.error(errorMessage(e)); return false; }
  };
  const markSold: Ctx['markSold'] = async (id) => {
    try { await resellService.markSold(id); patch(id, { status: 'Sold' }); return true; }
    catch (e) { toast.error(errorMessage(e)); return false; }
  };
  const toggleActive: Ctx['toggleActive'] = async (id) => {
    const cur = listings.find((l) => l.id === id);
    if (!cur) return false;
    return updateListing(id, { isActive: !cur.isActive });
  };

  return (
    <ResellContext.Provider value={{ listings, favourites, recent, loading, refresh, refreshQuiet, loadListing, toggleFavourite, addRecent, createListing, updateListing, deleteListing, markSold, toggleActive }}>
      {children}
    </ResellContext.Provider>
  );
}

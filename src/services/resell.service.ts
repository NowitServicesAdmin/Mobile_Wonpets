import { api, fileFromUri } from './api';
import { mapListing } from './mappers';
import type { Listing } from '../data/resell';

export type ListingInput = {
  listingType: 'Pet' | 'Product';
  title: string;
  category: string;
  customCategory?: string;
  breed?: string;
  age?: string;
  gender?: string;
  brand?: string;
  condition: string;
  price: number;
  originalPrice?: number;
  quantity: number;
  location: string;
  description: string;
  isFeatured?: boolean;
  isActive?: boolean;
  /** local file:// uris are uploaded; http(s) urls are kept as they are */
  photos: string[];
};

const toForm = (p: Partial<ListingInput>) => {
  const f = new FormData();
  (['title', 'category', 'customCategory', 'breed', 'age', 'gender', 'brand', 'condition', 'price', 'originalPrice', 'quantity', 'location', 'description'] as const).forEach((k) => {
    const v = p[k];
    if (v !== undefined && v !== null) f.append(k, String(v));
  });
  if (p.isFeatured !== undefined) f.append('isFeatured', String(p.isFeatured));
  if (p.isActive !== undefined) f.append('isActive', String(p.isActive));
  if (p.photos) {
    const remote = p.photos.filter((u) => /^https?:/i.test(u));
    p.photos.filter((u) => !/^https?:/i.test(u)).forEach((u) => f.append('images', fileFromUri(u, 'listing')));
    f.append('existingImages', JSON.stringify(remote));
  }
  return f;
};
const multipart = { headers: { 'Content-Type': 'multipart/form-data' }, timeout: 90000 };

export type ListingQuery = { page?: number; limit?: number; keyword?: string; category?: string; sort?: string };

export const resellService = {
  /** Every available listing (pages are merged - the marketplace screen filters and sorts on the device). */
  async all(meId: string, maxPages = 4): Promise<Listing[]> {
    const out: Listing[] = [];
    for (let page = 1; page <= maxPages; page++) {
      const { data } = await api.get('/resell', { params: { page, limit: 50 } });
      out.push(...(data.listings || []).map((l: any) => mapListing(l, meId)));
      if (page >= (data.pages || 1)) break;
    }
    return out;
  },
  async mine(meId: string): Promise<Listing[]> {
    const { data } = await api.get('/resell/my-listings');
    return (data.listings || []).map((l: any) => mapListing(l, meId));
  },
  async get(id: string, meId: string): Promise<Listing> {
    const { data } = await api.get(`/resell/${id}`);
    return mapListing(data.listing, meId);
  },
  async favourites(meId: string): Promise<Listing[]> {
    const { data } = await api.get('/resell/favourites');
    return (data.listings || []).map((l: any) => mapListing(l, meId));
  },
  async create(p: ListingInput, meId: string): Promise<Listing> {
    const { data } = await api.post('/resell', toForm(p), multipart);
    return mapListing(data.listing, meId);
  },
  async update(id: string, p: Partial<ListingInput>, meId: string): Promise<Listing> {
    const { data } = await api.put(`/resell/${id}`, toForm(p), multipart);
    return mapListing(data.listing, meId);
  },
  async remove(id: string) {
    await api.delete(`/resell/${id}`);
  },
  async markSold(id: string) {
    await api.patch(`/resell/${id}/sold`);
  },
  async toggleFavourite(id: string): Promise<{ favourite: boolean; total: number }> {
    const { data } = await api.patch(`/resell/${id}/favourite`);
    return { favourite: !!data.favourite, total: data.total ?? 0 };
  },
  async view(id: string) {
    await api.patch(`/resell/${id}/view`);
  },
  async summary(): Promise<{ petsAvailable: number; productsAvailable: number; sellers: number; newToday: number }> {
    const { data } = await api.get('/resell/dashboard/summary');
    return data.summary;
  },
};

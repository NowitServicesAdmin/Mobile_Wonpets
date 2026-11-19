import { api } from './api';

export type ClassifyResult = {
  type?: 'product' | 'disease' | 'animal' | string;
  confidence?: number;
  label?: string; breed?: string;
  productCategory?: string; targetAnimal?: string; usageInstructions?: string; dosageOrAmount?: string; safetyNotes?: string;
  affectedAnimal?: string; urgency?: string; visibleSymptoms?: string; possibleConditions?: string; generalCareAdvice?: string;
  vetDisclaimer?: string; careNotes?: string;
  details?: { description?: string };
  feedingGuide?: { foodType?: string; frequency?: string; notes?: string };
};

export type VisualSearchScope = 'store' | 'resell';
export type VisualSearchItem = {
  found: boolean;
  similar?: boolean;
  listingType: 'Pets' | 'Products';
  searchTerm: string;
  matchCount: number;
  identified: { kind: 'pet' | 'product'; label: string; brand: string; animalType: string; breed: string; confidence: number };
};
export type VisualSearchResult = {
  success: boolean;
  scope: VisualSearchScope;
  /** at least one real store product / resell listing matches `searchTerm` */
  found: boolean;
  /** nothing matched the exact item, but items of the same type did (e.g. "dog food") */
  similar?: boolean;
  listingType: 'Pets' | 'Products';
  searchTerm: string;
  matchCount: number;
  identified: { kind: 'pet' | 'product'; label: string; brand: string; animalType: string; breed: string; confidence: number };
  /** everything spotted in the photo (food, bowl, bed…); items that exist in inventory first, the first one is the main result */
  items?: VisualSearchItem[];
};

/** "Search by image" - same endpoint the web navbar camera uses. */
export const sharedService = {
  /** "Search by photo" for Store / Resell: returns a search term that really exists in that inventory. */
  async visualSearch(uri: string, scope: VisualSearchScope): Promise<VisualSearchResult> {
    const form = new FormData();
    const name = uri.split('/').pop() || 'photo.jpg';
    const ext = (name.split('.').pop() || 'jpg').toLowerCase();
    form.append('image', { uri, name, type: ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg' } as any);
    form.append('scope', scope);
    const { data } = await api.post('/shared/visual-search', form, { headers: { 'Content-Type': 'multipart/form-data' }, timeout: 60000 });
    return data;
  },

  async classify(uri: string): Promise<ClassifyResult> {
    const form = new FormData();
    const name = uri.split('/').pop() || 'photo.jpg';
    const ext = (name.split('.').pop() || 'jpg').toLowerCase();
    form.append('image', { uri, name, type: ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg' } as any);
    const { data } = await api.post('/shared/classify', form, { headers: { 'Content-Type': 'multipart/form-data' }, timeout: 60000 });
    return data;
  },
};
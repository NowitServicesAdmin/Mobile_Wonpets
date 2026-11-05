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

/** "Search by image" - same endpoint the web navbar camera uses. */
export const sharedService = {
  async classify(uri: string): Promise<ClassifyResult> {
    const form = new FormData();
    const name = uri.split('/').pop() || 'photo.jpg';
    const ext = (name.split('.').pop() || 'jpg').toLowerCase();
    form.append('image', { uri, name, type: ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg' } as any);
    const { data } = await api.post('/shared/classify', form, { headers: { 'Content-Type': 'multipart/form-data' }, timeout: 60000 });
    return data;
  },
};

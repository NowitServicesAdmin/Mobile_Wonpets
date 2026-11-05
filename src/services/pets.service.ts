import { api, fileFromUri } from './api';
import { mapPet, to24h } from './mappers';
import type { Pet } from '../data/mock';

export type PetInput = {
  name: string;
  animalType: string;
  breed: string;
  gender: string;
  dob: string; // YYYY-MM-DD
  weight: string | number;
  /** local file uri from the image picker - only sent when it changed */
  imageUri?: string;
};

const toForm = (p: Partial<PetInput>) => {
  const f = new FormData();
  (['name', 'animalType', 'breed', 'gender', 'dob', 'weight'] as const).forEach((k) => {
    if (p[k] !== undefined && p[k] !== '') f.append(k, String(p[k]));
  });
  if (p.imageUri) f.append('profileImage', fileFromUri(p.imageUri, 'pet'));
  return f;
};
const multipart = { headers: { 'Content-Type': 'multipart/form-data' } };

export const petsService = {
  async list(): Promise<Pet[]> {
    const { data } = await api.get('/pets');
    return (data.pets || []).map(mapPet);
  },
  async get(id: string): Promise<Pet & { healthBadge?: string; nextVisit?: string | null; lastCheckDate?: string | null }> {
    const { data } = await api.get(`/pets/${id}`);
    return { ...mapPet(data.pet), healthBadge: data.pet.healthBadge, nextVisit: data.pet.nextVisit, lastCheckDate: data.pet.lastCheckDate };
  },
  async create(p: PetInput): Promise<Pet> {
    const { data } = await api.post('/pets', toForm(p), multipart);
    return mapPet(data.pet);
  },
  async update(id: string, p: Partial<PetInput>): Promise<Pet> {
    const { data } = await api.put(`/pets/${id}`, toForm(p), multipart);
    return mapPet(data.pet);
  },
  async remove(id: string) {
    await api.delete(`/pets/${id}`);
  },
  async toggleFavorite(id: string): Promise<boolean> {
    const { data } = await api.put(`/pets/${id}/favorite`);
    return !!data.favorite;
  },
  async toggleMissing(id: string): Promise<{ isMissing: boolean; missingSince: string | null }> {
    const { data } = await api.put(`/pets/${id}/missing`);
    return { isMissing: !!data.isMissing, missingSince: data.missingSince };
  },
  async breeds(animal: string): Promise<string[]> {
    const { data } = await api.get(`/visit-types/breeds/${encodeURIComponent(animal)}`);
    return (data.breeds || []).map((b: any) => b.label || b.value).filter(Boolean);
  },
  async addBreed(animal: string, label: string) {
    await api.post(`/visit-types/breeds/${encodeURIComponent(animal)}`, { label, value: label });
  },
};

/* ----------------------- today's schedule + owner tasks ---------------------- */
export type RawSchedule = {
  _id: string;
  petId: { _id: string } | string;
  title: string;
  description?: string;
  time: string;
  status: string; // "upcoming" | "completed" | "pending"
  itemType?: 'daily-task' | 'custom-task' | 'medicine';
  templateId?: string;
  taskId?: string;
  prescriptionId?: string;
  medicineIndex?: number;
};

export const scheduleService = {
  async today(): Promise<RawSchedule[]> {
    const { data } = await api.get('/schedules/today');
    return data.schedules || [];
  },
  async createOneOff(p: { petId: string; title: string; description: string; date: string; time: string }) {
    await api.post('/schedules', { ...p, time: to24h(p.time) });
  },
  async completeOneOff(id: string) {
    await api.put(`/schedules/${id}/complete`);
  },
  async completeDaily(templateId: string, petId: string) {
    await api.put(`/schedules/daily/${templateId}/${petId}/complete`);
  },
  async completeOwnerTask(taskId: string, petId: string) {
    await api.put(`/schedules/owner-task/${taskId}/${petId}/complete`);
  },
  async completeMedicine(prescriptionId: string, medicineIndex: number, petId: string, time: string) {
    await api.put(`/schedules/medicine/${prescriptionId}/${medicineIndex}/${petId}/complete`, { time: to24h(time) });
  },

  async ownerTasks(): Promise<any[]> {
    const { data } = await api.get('/owner-tasks');
    return data.tasks || [];
  },
  async createOwnerTask(p: { petId: string; title: string; description: string; time: string; startDate: string; endDate: string | null }) {
    const { data } = await api.post('/owner-tasks', { ...p, time: to24h(p.time), recurrence: 'daily' });
    return data.task;
  },
  async updateOwnerTask(id: string, p: Record<string, any>) {
    const body = { ...p };
    if (body.time) body.time = to24h(body.time);
    const { data } = await api.put(`/owner-tasks/${id}`, body);
    return data.task;
  },
  async deleteOwnerTask(id: string) {
    await api.delete(`/owner-tasks/${id}`);
  },

  async dailyTasks(petId: string): Promise<{ _id: string; title: string; description: string; time: string; enabled: boolean }[]> {
    const { data } = await api.get('/owner-tasks/daily-tasks', { params: { petId } });
    return data.dailyTasks || [];
  },
  async setDailyEnabled(templateId: string, petId: string, enabled: boolean) {
    await api.put(`/owner-tasks/daily-tasks/${templateId}/preference`, { petId, enabled });
  },
};

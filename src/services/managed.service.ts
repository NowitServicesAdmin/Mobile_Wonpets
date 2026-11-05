import { api } from './api';
import { absUrl, mapAppointment, mapPet, to12h } from './mappers';
import type { Appointment, Pet } from '../data/mock';

/**
 * "Shared with me" data - the mobile twin of the web's collaboratorOverviewService.
 * Every call for another owner's data sends their id in the `x-managed-owner` header
 * (the backend then checks the accepted collaboration, its dates and the shared pets).
 */
const withOwner = (ownerId: string) => ({ headers: { 'x-managed-owner': ownerId } });
const idOf = (v: any): string => (v && typeof v === 'object' ? String(v._id ?? v.id ?? '') : String(v ?? ''));
const day = (d?: string | null) => (d ? String(d).slice(0, 10) : '');
const two = (n: number) => String(n).padStart(2, '0');
export const todayIso = () => {
  const d = new Date();
  return `${d.getFullYear()}-${two(d.getMonth() + 1)}-${two(d.getDate())}`;
};

export type ManagedAccount = {
  /** the collaboration record id */
  id: string;
  ownerId: string;
  ownerName: string;
  ownerPhoto?: string;
  ownerPhone?: string;
  ownerEmail?: string;
  ownerAddress?: string;
  petIds: string[];
  startDate: string;
  endDate: string;
};
export type SharedPet = Pet & { ownerId: string; ownerName: string; ownerPhone?: string; ownerEmail?: string; ownerAddress?: string };
export type SharedAppointment = Appointment & { ownerId: string; ownerName: string };
export type ManagedTask = {
  key: string;
  id: string;
  petId: string;
  ownerId: string;
  ownerName: string;
  time: string;
  rawTime: string;
  title: string;
  description: string;
  itemType: 'daily' | 'custom-task' | 'schedule' | 'medicine' | 'appointment';
  status: 'completed' | 'upcoming';
  taskId?: string;
  prescriptionId?: string;
  medicineIndex?: number;
  apptStatus?: string;
};
export type SharedVaccination = { id: string; name: string; givenOn: string; nextDue: string; vet?: string };
export type SharedNote = { id: string; text: string; authorName: string; mine: boolean; shared: boolean; createdAt: string };
export type SharedPrescription = {
  diagnosis?: string;
  symptoms?: string;
  instructions?: string;
  doctorName?: string;
  followUpDate?: string;
  createdAt?: string;
  medicines: { name: string; dosage: string; frequency: string; duration: string; notes?: string }[];
};

const mapAccount = (c: any): ManagedAccount => ({
  id: String(c._id),
  ownerId: idOf(c.owner),
  ownerName: c.owner?.name || 'Pet owner',
  ownerPhoto: absUrl(c.owner?.profileImage),
  ownerPhone: c.owner?.phone || undefined,
  ownerEmail: c.owner?.email || undefined,
  ownerAddress: typeof c.owner?.address === 'string' ? c.owner.address : undefined,
  petIds: (c.pets || []).map(idOf),
  startDate: day(c.startDate),
  endDate: day(c.endDate),
});

export const managedService = {
  /** Accepted collaborations that are active today (not upcoming, not expired). */
  async accounts(): Promise<ManagedAccount[]> {
    const { data } = await api.get('/collaborators/delegated');
    const today = todayIso();
    return (data.accounts || [])
      .map(mapAccount)
      .filter((a: ManagedAccount) => a.ownerId && !(a.startDate && today < a.startDate) && !(a.endDate && today > a.endDate));
  },

  async pets(accounts: ManagedAccount[]): Promise<SharedPet[]> {
    const lists = await Promise.all(
      accounts.map(async (a) => {
        try {
          const { data } = await api.get('/pets', withOwner(a.ownerId));
          return (data.pets || []).map((p: any) => ({
            ...mapPet(p),
            ownerId: a.ownerId,
            ownerName: a.ownerName,
            ownerPhone: a.ownerPhone,
            ownerEmail: a.ownerEmail,
            ownerAddress: a.ownerAddress,
          }));
        } catch {
          return [];
        }
      }),
    );
    return lists.flat();
  },

  async todaySchedule(accounts: ManagedAccount[]): Promise<ManagedTask[]> {
    const lists = await Promise.all(
      accounts.map(async (a) => {
        try {
          const { data } = await api.get('/schedules/today', withOwner(a.ownerId));
          return (data.schedules || []).map((s: any): ManagedTask => {
            const petId = idOf(s.petId);
            const base = {
              petId,
              ownerId: a.ownerId,
              ownerName: a.ownerName,
              time: to12h(s.time),
              rawTime: s.time || '',
              title: s.title || 'Task',
              description: s.description || '',
              status: (s.status === 'completed' ? 'completed' : 'upcoming') as ManagedTask['status'],
            };
            if (s.itemType === 'daily-task') {
              const id = String(s.templateId || s._id);
              return { ...base, key: `${a.ownerId}:d:${id}:${petId}:${s.time}`, id, itemType: 'daily' };
            }
            if (s.itemType === 'custom-task') {
              const id = String(s.taskId || s._id);
              return { ...base, key: `${a.ownerId}:c:${id}:${petId}:${s.time}`, id, taskId: id, itemType: 'custom-task' };
            }
            if (s.itemType === 'medicine') {
              return { ...base, key: `${a.ownerId}:m:${s._id}`, id: String(s._id), itemType: 'medicine', prescriptionId: String(s.prescriptionId), medicineIndex: s.medicineIndex };
            }
            return { ...base, key: `${a.ownerId}:s:${s._id}`, id: String(s._id), itemType: 'schedule' };
          });
        } catch {
          return [];
        }
      }),
    );
    return lists.flat();
  },

  /** Marks a task / dose as done on the owner's behalf (the only write a collaborator can make on schedules). */
  async completeTask(t: ManagedTask) {
    const h = withOwner(t.ownerId);
    if (t.itemType === 'medicine') return api.put(`/schedules/medicine/${t.prescriptionId}/${t.medicineIndex}/${t.petId}/complete`, { time: t.rawTime }, h);
    if (t.itemType === 'daily') return api.put(`/schedules/daily/${t.id}/${t.petId}/complete`, {}, h);
    if (t.itemType === 'custom-task') return api.put(`/schedules/owner-task/${t.taskId || t.id}/${t.petId}/complete`, {}, h);
    return api.put(`/schedules/${t.id}/complete`, {}, h);
  },

  async appointments(accounts: ManagedAccount[]): Promise<SharedAppointment[]> {
    const lists = await Promise.all(
      accounts.map(async (a) => {
        try {
          const { data } = await api.get('/appointments', withOwner(a.ownerId));
          return (data.appointments || []).map((x: any) => ({ ...mapAppointment(x), ownerId: a.ownerId, ownerName: a.ownerName }));
        } catch {
          return [];
        }
      }),
    );
    return lists.flat();
  },

  async vaccinations(petId: string, ownerId: string): Promise<SharedVaccination[]> {
    const { data } = await api.get(`/vaccinations/pet/${petId}`, withOwner(ownerId));
    return (data.vaccinations || []).map((v: any) => ({
      id: String(v._id),
      name: v.vaccineName || 'Vaccine',
      givenOn: day(v.vaccinationDate),
      nextDue: day(v.nextDueDate),
      vet: v.veterinarian || undefined,
    }));
  },

  /** Notes you wrote (private until you share them) plus the ones already shared with the owner. */
  async notes(petId: string, ownerId: string, meId: string): Promise<SharedNote[]> {
    const { data } = await api.get(`/pet-notes/pet/${petId}`, withOwner(ownerId));
    return (data.notes || []).map((n: any) => {
      const authorId = idOf(n.author);
      return { id: String(n._id), text: n.text || '', authorName: n.author?.name || (n.authorRole === 'owner' ? 'Owner' : 'Collaborator'), mine: authorId === meId, shared: !!n.sharedWithOwner, createdAt: day(n.createdAt) };
    });
  },
  async addNote(petId: string, ownerId: string, text: string, shared: boolean) {
    await api.post('/pet-notes', { petId, text, shared }, withOwner(ownerId));
  },
  async setNoteShared(noteId: string, ownerId: string, shared: boolean) {
    await api.put(`/pet-notes/${noteId}/share`, { shared }, withOwner(ownerId));
  },
  async deleteNote(noteId: string, ownerId: string) {
    await api.delete(`/pet-notes/${noteId}`, withOwner(ownerId));
  },

  /** The latest prescription and next visit come back with the pet detail. */
  async petDetail(petId: string, ownerId: string): Promise<{ prescription: SharedPrescription | null; nextVisit: string | null; healthBadge?: string }> {
    const { data } = await api.get(`/pets/${petId}`, withOwner(ownerId));
    const p = data.pet?.latestPrescription;
    return {
      prescription: p
        ? { diagnosis: p.diagnosis, symptoms: p.symptoms, instructions: p.instructions, doctorName: p.doctorName, followUpDate: day(p.followUpDate), createdAt: day(p.createdAt), medicines: p.medicines || [] }
        : null,
      nextVisit: data.pet?.nextVisit ? day(data.pet.nextVisit) : null,
      healthBadge: data.pet?.healthBadge,
    };
  },
};
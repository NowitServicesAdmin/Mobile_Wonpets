import { api } from './api';
import { absUrl } from './mappers';
import type { MedicalRecord, PetNote, Prescription, Vaccination } from '../data/petRecords';

/**
 * Real pet records for the Pet Profile screen. Same endpoints the web PetDetails page uses:
 *   GET /pets/:id                    -> nextVisit, lastCheckDate, latestPrescription
 *   GET /medical-records/pet/:id     -> { records }
 *   GET /vaccinations/pet/:id        -> { vaccinations }
 *   GET /pet-notes/pet/:id           -> { notes }
 */
const day = (v: any): string | undefined => (v ? String(v).slice(0, 10) : undefined);
const withDr = (n?: string) => (!n ? 'Doctor' : /^dr\.?\s/i.test(n) ? n : `Dr. ${n}`);

export type PetDetail = {
  nextVisit?: string;
  lastCheckDate?: string;
  prescription?: Prescription;
};

function mapPrescription(p: any, petId: string): Prescription {
  const doctorName = p.doctorName || p.doctorId?.name || p.doctor?.name;
  return {
    id: String(p._id),
    petId,
    doctor: withDr(doctorName),
    date: day(p.createdAt) || '',
    diagnosis: p.diagnosis || '',
    symptoms: p.symptoms || undefined,
    followUpDate: day(p.followUpDate),
    advice: p.instructions || undefined,
    prescriptionNo: p.prescriptionId || undefined,
    status: p.status || undefined,
    medicines: (p.medicines || []).map((m: any) => ({
      name: m.name || 'Medicine',
      dosage: m.dosage || '',
      frequency: m.frequency || '',
      duration: m.duration || '',
      instructions: m.notes || undefined,
      startDate: day(m.startDate),
      endDate: day(m.endDate),
      reminderTimes: Array.isArray(m.reminderTimes) ? m.reminderTimes : [],
    })),
  };
}

function mapRecord(r: any, petId: string): MedicalRecord {
  return {
    id: String(r._id),
    petId,
    visitDate: day(r.visitDate) || '',
    diagnosis: r.diagnosis || '',
    treatment: r.treatment || undefined,
    notes: r.notes || undefined,
    files: (r.files || []).map((f: any, i: number) => ({
      id: String(f._id || f.fileUrl || i),
      name: f.fileName || 'Attachment',
      kind: String(f.fileType || '').startsWith('image/') ? 'image' : f.fileType === 'application/pdf' ? 'pdf' : 'file',
      url: absUrl(f.fileUrl),
    })),
  };
}

function mapVaccination(v: any, petId: string): Vaccination {
  return {
    id: String(v._id),
    petId,
    name: v.vaccineName || 'Vaccine',
    givenOn: day(v.vaccinationDate) || '',
    nextDue: day(v.nextDueDate),
    vet: v.veterinarian || undefined,
    doseNumber: v.doseNumber || undefined,
    notes: v.notes || undefined,
  };
}

function mapNote(n: any, petId: string): PetNote {
  return {
    id: String(n._id),
    petId,
    author: n.authorRole === 'owner' ? 'You' : n.author?.name || 'Collaborator',
    date: day(n.createdAt) || '',
    text: n.text || '',
  };
}

export const petRecordsService = {
  async detail(petId: string): Promise<PetDetail> {
    const { data } = await api.get(`/pets/${petId}`);
    const p = data.pet || {};
    return {
      nextVisit: day(p.nextVisit),
      lastCheckDate: day(p.lastCheckDate),
      prescription: p.latestPrescription ? mapPrescription(p.latestPrescription, petId) : undefined,
    };
  },
  async medicalRecords(petId: string): Promise<MedicalRecord[]> {
    const { data } = await api.get(`/medical-records/pet/${petId}`);
    return (data.records || []).map((r: any) => mapRecord(r, petId));
  },
  async vaccinations(petId: string): Promise<Vaccination[]> {
    const { data } = await api.get(`/vaccinations/pet/${petId}`);
    return (data.vaccinations || []).map((v: any) => mapVaccination(v, petId));
  },
  async notes(petId: string): Promise<PetNote[]> {
    const { data } = await api.get(`/pet-notes/pet/${petId}`);
    return (data.notes || []).map((n: any) => mapNote(n, petId));
  },
};
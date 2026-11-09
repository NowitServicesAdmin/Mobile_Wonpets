/** Backend doctor documents -> the shapes the doctor screens use (reusing the owner-side Appointment type). */
import type { Appointment } from '../data/mock';
import { speciesEmoji } from '../data/mock';
import { absUrl, isoToDDMM, to12h, to24h } from './mappers';
import { formatAgeFromDob } from '../utils/petAge';

const idOf = (v: any): string => (v && typeof v === 'object' ? String(v._id ?? v.id ?? '') : String(v ?? ''));
const iso = (d?: string | null) => (d ? String(d).slice(0, 10) : '');
const cap = (s?: string) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : '');

/**
 * Doctor endpoints answer in two shapes: flat rows ({ pet, owner, image, … } from /today, /pending and the dashboard)
 * and raw populated documents ({ petId: {…}, ownerId: {…} } from /upcoming, /completed, /:id). Both end up the same.
 */
export function mapDoctorAppointment(a: any): Appointment {
  const petObj = a.petId && typeof a.petId === 'object' ? a.petId : null;
  const ownObj = a.ownerId && typeof a.ownerId === 'object' ? a.ownerId : null;
  const petName = petObj?.name ?? (typeof a.pet === 'string' ? a.pet : '') ?? '';
  const dob = petObj?.dob ? iso(petObj.dob) : undefined;
  const image = petObj?.image ?? a.image;
  const mode = (a.visitType === 'Emergency' ? 'Emergency' : a.appointmentType || a.mode || 'Clinic Visit') as Appointment['mode'];
  const status = (a.status === 'Upcoming' ? 'Confirmed' : a.status || 'Pending') as Appointment['status'];
  const hl = a.homeLocation;
  const lat = hl?.latitude, lng = hl?.longitude;
  return {
    id: idOf(a._id ?? a.id),
    appointmentNo: a.appointmentId,
    pet: petName || 'Pet',
    petId: petObj ? idOf(petObj) : idOf(a.petId) || undefined,
    emoji: speciesEmoji[petObj?.animalType] ?? '🐾',
    petImage: absUrl(image),
    age: (dob && formatAgeFromDob(dob)) || a.ageLabel || petObj?.ageLabel || (petObj?.age != null ? `${petObj.age} years` : a.age != null ? `${a.age} years` : ''),
    breed: petObj?.breed ?? a.breed,
    petGender: cap(petObj?.gender ?? a.gender),
    petWeight: (petObj?.weight ?? a.weight) ? `${petObj?.weight ?? a.weight} kg` : undefined,
    date: isoToDDMM(a.date),
    isoDate: iso(a.date),
    time: to12h(a.time),
    time24: to24h(a.time || ''),
    status,
    mode,
    fee: a.consultationFee,
    reason: a.reason || a.type || undefined,
    notes: a.notes || undefined,
    aiNote: a.aiNote || undefined,
    visitType: a.visitType,
    homeAddress: hl ? [hl.doorNo, hl.formattedAddress || [hl.area, hl.city].filter(Boolean).join(', ')].filter(Boolean).join(', ') : undefined,
    mapUrl: Number.isFinite(Number(lat)) && Number.isFinite(Number(lng)) && lat != null ? `https://www.google.com/maps/search/?api=1&query=${lat},${lng}` : undefined,
    attachments: (a.files || []).map((f: any) => f.fileUrl).filter(Boolean),
    meetingLink: a.meetingLink || a.meetLink,
    hasPrescription: !!a.prescriptionId,
    paymentStatus: a.paymentStatus,
    owner: ownObj?.name ?? (typeof a.owner === 'string' ? a.owner : undefined),
    ownerId: ownObj ? idOf(ownObj) : idOf(a.ownerId) || undefined,
    ownerPhone: ownObj?.phone ?? a.phone,
    ownerImage: absUrl(ownObj?.profileImage ?? a.ownerImage),
  };
}

export type DoctorPatient = {
  petId: string; ownerId?: string; appointmentId?: string;
  name: string; breed: string; age: string; gender: string; image?: string; emoji: string;
  owner: string; phone?: string; lastVisit?: string; nextVisit?: string; status?: string;
};

export function mapPatient(p: any): DoctorPatient {
  return {
    petId: idOf(p.petId ?? p._id),
    ownerId: idOf(p.ownerId) || undefined,
    appointmentId: p.appointmentId ? idOf(p.appointmentId) : undefined,
    name: p.pet || p.name || 'Pet',
    breed: p.breed || '',
    age: p.ageLabel || (p.dob ? formatAgeFromDob(iso(p.dob)) : '') || (p.age != null && p.age !== '' ? `${p.age} years` : ''),
    gender: cap(p.gender),
    image: absUrl(p.image),
    emoji: speciesEmoji[p.animalType] ?? '🐾',
    owner: p.owner || p.ownerId?.name || '',
    phone: p.phone || p.ownerId?.phone,
    lastVisit: iso(p.lastVisit) || undefined,
    nextVisit: iso(p.nextVisit) || undefined,
    status: p.status,
  };
}

export type FollowUp = {
  id: string; prescriptionNo?: string; appointmentId?: string; petId?: string;
  pet: string; breed: string; image?: string; owner: string; phone?: string; date: string; time?: string; status: string;
};
export function mapFollowUp(f: any): FollowUp {
  const pet = f.petId && typeof f.petId === 'object' ? f.petId : null;
  const owner = f.ownerId && typeof f.ownerId === 'object' ? f.ownerId : null;
  return {
    id: idOf(f._id ?? f.id),
    prescriptionNo: f.prescriptionId,
    appointmentId: f.appointmentId ? idOf(f.appointmentId) : undefined,
    petId: pet ? idOf(pet) : undefined,
    pet: f.pet ?? pet?.name ?? 'Pet',
    breed: f.breed ?? pet?.breed ?? '',
    image: absUrl(f.image ?? pet?.image),
    owner: f.owner ?? owner?.name ?? '',
    phone: f.phone ?? owner?.phone,
    date: iso(f.date ?? f.followUpDate),
    time: f.time ? to12h(f.time) : undefined,
    status: f.status || 'Scheduled',
  };
}

export type RxMedicine = { name: string; dosage: string; frequency: string; duration: string; notes?: string };
export type DoctorRx = {
  id: string; prescriptionNo?: string; appointmentId?: string; date: string;
  diagnosis: string; symptoms: string; instructions: string; followUpDate: string; status: string; medicines: RxMedicine[];
  pet?: string; petImage?: string; owner?: string; ownerPhone?: string; breed?: string; petId?: string;
};
export function mapRx(p: any): DoctorRx {
  const pet = p.petId && typeof p.petId === 'object' ? p.petId : null;
  const owner = p.ownerId && typeof p.ownerId === 'object' ? p.ownerId : null;
  return {
    id: idOf(p._id ?? p.id),
    prescriptionNo: p.prescriptionId,
    appointmentId: p.appointmentId ? idOf(p.appointmentId) : undefined,
    date: iso(p.createdAt ?? p.date),
    diagnosis: p.diagnosis || '',
    symptoms: p.symptoms || '',
    instructions: p.instructions || '',
    followUpDate: iso(p.followUpDate),
    status: p.status || 'Completed',
    medicines: (p.medicines || []).map((m: any) => ({ name: m.name || '', dosage: m.dosage || '', frequency: m.frequency || '', duration: m.duration || '', notes: m.notes || '' })),
    pet: p.pet ?? pet?.name, petImage: absUrl(p.image ?? pet?.image), breed: p.breed ?? pet?.breed, petId: pet ? idOf(pet) : undefined,
    owner: p.owner ?? owner?.name, ownerPhone: p.phone ?? owner?.phone,
  };
}

export type MedicalRecordView = {
  id: string; diagnosis: string; symptoms: string; treatment: string; visitType: string; notes: string; aiNote: string; visitDate?: string;
};
export const mapRecord = (r: any): MedicalRecordView => ({
  id: idOf(r._id ?? r.id), diagnosis: r.diagnosis || '', symptoms: r.symptoms || '', treatment: r.treatment || '',
  visitType: r.visitType || 'General', notes: r.notes || '', aiNote: r.aiNote || '', visitDate: iso(r.visitDate) || undefined,
});

export type HistoryEntry = {
  id: string; date: string; doctor?: string; diagnosis: string; symptoms: string; treatment: string; notes: string; prescription: string; followUpDate?: string;
};
export const mapHistory = (h: any): HistoryEntry => ({
  id: idOf(h._id), date: iso(h.visitDate), doctor: h.doctorId?.name, diagnosis: h.diagnosis || '', symptoms: h.symptoms || '',
  treatment: h.treatment || '', notes: h.notes || '', prescription: h.prescription && h.prescription !== '-' ? h.prescription : '', followUpDate: iso(h.followUpDate) || undefined,
});

export type VaccinationView = { id: string; name: string; date: string; nextDue?: string; vet?: string; notes?: string; status?: string };
export const mapVaccination = (v: any): VaccinationView => ({
  id: idOf(v._id), name: v.vaccineName || v.name || v.vaccine || 'Vaccination', date: iso(v.vaccinationDate ?? v.date),
  nextDue: iso(v.nextDueDate ?? v.nextDue) || undefined, vet: v.veterinarian?.name, notes: v.notes, status: v.status,
});

// Types + helpers for pet records. The data itself comes from services/petRecords.service.ts.
const pad = (n: number) => String(n).padStart(2, '0');
/** YYYY-MM-DD relative to today, so demo dates never go stale. */
export const daysFromNow = (days: number) => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

export type RecordFile = { id: string; name: string; kind: 'image' | 'pdf' | 'file'; url?: string };
export type MedicalRecord = { id: string; petId: string; visitDate: string; diagnosis: string; treatment?: string; notes?: string; files?: RecordFile[] };

export type Vaccination = { id: string; petId: string; name: string; givenOn: string; nextDue?: string; vet?: string; doseNumber?: number | string; notes?: string };

export type PrescribedMedicine = { name: string; dosage: string; frequency: string; duration: string; instructions?: string; startDate?: string; endDate?: string; reminderTimes?: string[] };
export type Prescription = {
  id: string; petId: string; doctor: string; date: string; diagnosis: string; medicines: PrescribedMedicine[]; advice?: string;
  /** Appointment this prescription was issued in. */
  appointmentId?: string; prescriptionNo?: string; symptoms?: string; followUpDate?: string; status?: string;
};

export type PetNote = { id: string; petId: string; author: string; date: string; text: string };
/** Notes added by a pet sitter / co-owner who handles the pet. */

export type VaccineStatus = 'Up to date' | 'Due soon' | 'Overdue';
export function vaccineStatus(nextDue?: string): VaccineStatus {
  if (!nextDue) return 'Up to date';
  const diff = (new Date(nextDue).getTime() - Date.now()) / 86400000;
  return diff < 0 ? 'Overdue' : diff <= 30 ? 'Due soon' : 'Up to date';
}
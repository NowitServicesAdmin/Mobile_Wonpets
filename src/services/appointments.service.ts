import { api, fileFromUri } from './api';
import { mapAppointment, mapDoctor } from './mappers';
import type { Appointment, Doctor } from '../data/mock';

export type Slot = { time: string; available: boolean; booked: boolean; isBreak: boolean };
export type SlotsResult = { slots: Slot[]; message?: string; isHoliday?: boolean; fee?: number };

export type BookingInput = {
  petId: string;
  doctorId: string;
  /** YYYY-MM-DD */
  date: string;
  /** HH:mm (24h) */
  time: string;
  /** UI mode - "Emergency" is sent as a clinic visit with visit type Emergency */
  mode: 'Clinic Visit' | 'Online' | 'Home Care' | 'Emergency';
  visitType: string;
  reason?: string;
  addressId?: string;
  photos?: string[];
  documents?: { uri: string; name: string; type: string }[];
};

export const appointmentsService = {
  async list(): Promise<Appointment[]> {
    const { data } = await api.get('/appointments');
    return (data.appointments || []).map(mapAppointment);
  },
  async get(id: string): Promise<Appointment> {
    const { data } = await api.get(`/appointments/${id}`);
    return mapAppointment(data.appointment);
  },

  /** Doctors near the given coordinates. If nobody is in range the API returns online-only doctors instead. */
  async doctors(lat: number, lng: number): Promise<{ doctors: Doctor[]; needsLocation: boolean; maxDistanceKm: number }> {
    const { data } = await api.get('/doctor/approved', { params: { lat, lng } });
    const near: Doctor[] = (data.doctors || []).map((d: any) => mapDoctor(d));
    const online: Doctor[] = (data.onlineDoctors || []).map((d: any) => mapDoctor(d, true));
    return { doctors: near.length ? near : online, needsLocation: !!data.needsLocation, maxDistanceKm: data.maxDistanceKm ?? 20 };
  },

  async visitTypes(): Promise<string[]> {
    const { data } = await api.get('/visit-types');
    return (data.visitTypes || []).map((v: any) => v.value || v.label).filter(Boolean);
  },

  async slots(doctorId: string, date: string): Promise<SlotsResult> {
    const { data } = await api.get(`/appointments/doctor/${doctorId}/slots`, { params: { date } });
    return { slots: data.slots || [], message: data.message, isHoliday: data.isHoliday, fee: data.fee };
  },

  /** Step 1 of booking: validates everything and creates the Razorpay order. */
  async initiatePayment(b: BookingInput) {
    const f = new FormData();
    f.append('petId', b.petId);
    f.append('doctorId', b.doctorId);
    f.append('date', b.date);
    f.append('time', b.time);
    f.append('appointmentType', b.mode === 'Emergency' ? 'Clinic Visit' : b.mode);
    f.append('visitType', b.mode === 'Emergency' ? 'Emergency' : b.visitType);
    if (b.reason) f.append('reason', b.reason);
    if (b.addressId) f.append('addressId', b.addressId);
    (b.photos || []).forEach((u) => f.append('files', fileFromUri(u, 'attachment')));
    (b.documents || []).forEach((d) => f.append('files', { uri: d.uri, name: d.name, type: d.type } as any));
    const { data } = await api.post('/appointments/payment/initiate', f, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 60000,
    });
    return data as { order: { id: string; amount: number; currency: string }; keyId: string };
  },

  /** Step 2: after Razorpay succeeds - the server checks the signature and books the slot. */
  async verifyPayment(p: { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string }): Promise<Appointment> {
    const { data } = await api.post('/appointments/payment/verify', p);
    return mapAppointment(data.appointment);
  },

  async reschedule(id: string, date: string, time: string): Promise<Appointment> {
    const { data } = await api.put(`/appointments/${id}/reschedule`, { date, time });
    return mapAppointment(data.appointment);
  },
  async cancel(id: string) {
    await api.put(`/appointments/${id}/cancel`);
  },
};

export type PrescriptionView = {
  id: string; doctor: string; date: string; diagnosis: string; prescriptionNo?: string; symptoms?: string; followUpDate?: string; advice?: string;
  medicines: { name: string; dosage: string; frequency: string; duration: string; instructions?: string }[];
};
export const prescriptionService = {
  /** Prescription the vet issued in an appointment (null when none). */
  async byAppointment(appointmentId: string): Promise<PrescriptionView | null> {
    try {
      const { data } = await api.get(`/doctor-prescriptions/appointment/${appointmentId}`);
      const p = data.prescription;
      return {
        id: String(p._id),
        doctor: p.doctorId?.name ? (/^dr\.?\s/i.test(p.doctorId.name) ? p.doctorId.name : `Dr. ${p.doctorId.name}`) : 'Doctor',
        date: String(p.createdAt || '').slice(0, 10),
        diagnosis: p.diagnosis || '',
        prescriptionNo: p.prescriptionId,
        symptoms: p.symptoms,
        followUpDate: p.followUpDate ? String(p.followUpDate).slice(0, 10) : undefined,
        advice: p.instructions,
        medicines: (p.medicines || []).map((m: any) => ({ name: m.name, dosage: m.dosage, frequency: m.frequency, duration: m.duration, instructions: m.notes })),
      };
    } catch (e: any) {
      if (e?.status === 404) return null;
      throw e;
    }
  },
};

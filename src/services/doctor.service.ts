import { api } from './api';
import { absUrl } from './mappers';
import type { Appointment } from '../data/mock';
import {
  DoctorPatient, DoctorRx, FollowUp, HistoryEntry, MedicalRecordView, RxMedicine, VaccinationView,
  mapDoctorAppointment, mapFollowUp, mapHistory, mapPatient, mapRecord, mapRx, mapVaccination,
} from './doctor.mappers';

export type MedicalRecordItem = {
  id: string; recordNo?: string; appointmentId?: string; pet: string; breed: string; image?: string; owner: string; phone?: string;
  diagnosis: string; symptoms: string; treatment: string; visitType: string; visitDate: string;
};
export type DoctorStatus = 'available' | 'busy' | 'away' | 'on_leave';
export type DashboardData = {
  stats: { total: number; today: number; pending: number; confirmed: number; inProgress: number; completed: number; cancelled: number; patients: number; completionRate: number };
  overview: { visits: number; revenue: number; newPatients: number; treatments: number };
  schedule: Appointment[]; recentPatients: DoctorPatient[]; followUps: FollowUp[];
};
export type EarningsData = {
  stats: { total: number; today: number; month: number; average: number; completed: number; appointments: number };
  daily: { label: string; value: number }[]; monthly: { label: string; value: number }[]; breakdown: { name: string; value: number; pct: string }[];
};
export type DoctorProfile = {
  id: string; name: string; email: string; phone: string; image?: string; status: DoctorStatus;
  specialization?: string; clinic?: string; experience?: string; fee?: number; about?: string;
};
export type DoctorSchedule = {
  startTime: string; endTime: string; workingDays: number[]; slotDuration: number; breaks: { name: string; startTime: string; endTime: string }[];
  fee: number; /** passed through untouched (each is { startDate, endDate, … }) */ holidays: any[]; capabilities: { clinicVisit: boolean; online: boolean; homeCare: boolean };
};

const n = (v: any) => (Number.isFinite(Number(v)) ? Number(v) : 0);
const list = <T,>(rows: any[] | undefined, f: (x: any) => T): T[] => (rows || []).map(f);

export const doctorService = {
  /* ------------------------------ dashboard ------------------------------ */
  async dashboard(): Promise<DashboardData> {
    const { data } = await api.get('/doctor-dashboard');
    const s = data.stats || {}, o = data.overview || {};
    return {
      stats: {
        total: n(s.totalAppointments), today: n(s.todayAppointments), pending: n(s.pendingAppointments), confirmed: n(s.confirmedAppointments),
        inProgress: n(s.inProgressAppointments), completed: n(s.completedAppointments), cancelled: n(s.cancelledAppointments), patients: n(s.totalPatients), completionRate: n(s.completionRate),
      },
      overview: { visits: n(o.visits), revenue: n(o.revenue), newPatients: n(o.newPatients), treatments: n(o.treatments) },
      schedule: list(data.schedule, mapDoctorAppointment),
      recentPatients: list(data.recentPatients, mapPatient),
      followUps: list(data.followUps, mapFollowUp),
    };
  },

  /* ---------------------------- appointments ----------------------------- */
  /** Everything booked for one day (YYYY-MM-DD), cancelled ones excluded by the server. */
  async day(date: string): Promise<Appointment[]> {
    const { data } = await api.get('/doctor-appointments/today', { params: { date } });
    return list(data.appointments, mapDoctorAppointment);
  },
  async pending(): Promise<Appointment[]> { return list((await api.get('/doctor-appointments/pending')).data.appointments, mapDoctorAppointment); },
  async upcoming(): Promise<Appointment[]> { return list((await api.get('/doctor-appointments/upcoming')).data.appointments, mapDoctorAppointment); },
  async completed(): Promise<Appointment[]> { return list((await api.get('/doctor-appointments/completed')).data.appointments, mapDoctorAppointment); },
  async cancelled(): Promise<Appointment[]> { return list((await api.get('/doctor-appointments/cancelled')).data.appointments, mapDoctorAppointment); },
  async appointment(id: string): Promise<Appointment> { return mapDoctorAppointment((await api.get(`/doctor-appointments/${id}`)).data.appointment); },

  async accept(id: string) { await api.patch(`/doctor-appointments/${id}/accept`); },
  async start(id: string) { await api.patch(`/doctor-appointments/${id}/start`); },
  async complete(id: string, body?: { notes?: string }) { await api.patch(`/doctor-appointments/${id}/complete`, body ?? {}); },
  /** NOTE: the backend router has to expose PATCH /doctor-appointments/:id/cancel (see the backend patch shipped with this change). */
  async decline(id: string) { await api.patch(`/doctor-appointments/${id}/cancel`); },
  async reschedule(id: string, date: string, time: string) { await api.patch(`/doctor-appointments/${id}/reschedule`, { date, time }); },
  async saveNotes(id: string, notes: string) { await api.patch(`/doctor-appointments/${id}/notes`, { notes }); },
  async setFee(id: string, consultationFee: number) { await api.patch(`/doctor-appointments/${id}/fee`, { consultationFee }); },
  /** 202 = the AI note is still being generated. */
  async aiNote(id: string): Promise<{ ready: boolean; note?: string }> {
    const r = await api.get(`/doctor-appointments/${id}/ai-note`, { validateStatus: (s) => s === 200 || s === 202 });
    return { ready: r.status === 200 && !!(r.data.aiNote ?? r.data.note), note: r.data.aiNote ?? r.data.note };
  },

  /* ------------------------------- patients ------------------------------ */
  async patients(): Promise<DoctorPatient[]> { return list((await api.get('/doctor-patients')).data.patients, mapPatient); },
  async patient(petId: string) {
    const [{ data: p }, { data: s }] = await Promise.all([api.get(`/doctor-patients/${petId}`), api.get(`/doctor-patients/${petId}/summary`)]);
    const pet = p.pet || {};
    const owner = pet.ownerId && typeof pet.ownerId === 'object' ? pet.ownerId : {};
    return {
      patient: mapPatient({ ...pet, petId: pet._id, pet: pet.name, owner: owner.name, phone: owner.phone }),
      ownerEmail: owner.email as string | undefined, ownerImage: absUrl(owner.profileImage), weight: pet.weight ? `${pet.weight} kg` : '',
      summary: { visits: n(s.summary?.totalVisits), completed: n(s.summary?.completedVisits), records: n(s.summary?.medicalRecords), vaccinations: n(s.summary?.vaccinations) },
    };
  },
  async patientVisits(petId: string): Promise<Appointment[]> { return list((await api.get(`/doctor-patients/${petId}/appointments`)).data.appointments, mapDoctorAppointment); },
  async patientHistory(petId: string): Promise<HistoryEntry[]> { return list((await api.get(`/doctor-patients/${petId}/medical-history`)).data.records, mapHistory); },
  async patientVaccinations(petId: string): Promise<VaccinationView[]> { return list((await api.get(`/doctor-patients/${petId}/vaccinations`)).data.vaccinations, mapVaccination); },

  /* ----------------------------- prescriptions --------------------------- */
  async prescriptions(): Promise<DoctorRx[]> { return list((await api.get('/doctor-prescriptions')).data.prescriptions, mapRx); },
  async followUps(): Promise<FollowUp[]> { return list((await api.get('/doctor-prescriptions/followups')).data.followUps, mapFollowUp); },
  async prescriptionFor(appointmentId: string): Promise<DoctorRx | null> {
    try { return mapRx((await api.get(`/doctor-prescriptions/appointment/${appointmentId}`)).data.prescription); }
    catch (e: any) { if (e?.status === 404) return null; throw e; }
  },
  async prescription(id: string): Promise<DoctorRx> { return mapRx((await api.get(`/doctor-prescriptions/${id}`)).data.prescription); },
  async createPrescription(b: { appointmentId: string; diagnosis: string; symptoms?: string; instructions?: string; followUpDate?: string; status?: string; medicines: RxMedicine[] }) {
    const { data } = await api.post('/doctor-prescriptions', { ...b, followUpDate: b.followUpDate || undefined, status: b.status || 'Completed' });
    return mapRx(data.prescription);
  },
  async updatePrescription(id: string, b: Partial<{ diagnosis: string; symptoms: string; instructions: string; followUpDate: string; status: string; medicines: RxMedicine[] }>) {
    const { data } = await api.put(`/doctor-prescriptions/${id}`, b);
    return mapRx(data.prescription);
  },

  /* ----------------------------- medical records ------------------------- */
  async recordFor(appointmentId: string): Promise<MedicalRecordView | null> {
    try { return mapRecord((await api.get(`/medical-records/appointment/${appointmentId}`)).data.medicalRecord); }
    catch (e: any) { if (e?.status === 404) return null; throw e; }
  },
  /** Every record this doctor has written, newest first (the web "Medical Records" page). */
  async records(): Promise<MedicalRecordItem[]> {
    const { data } = await api.get('/medical-records');
    return list(data.records, (r: any): MedicalRecordItem => ({
      id: String(r._id), recordNo: r.recordId, appointmentId: r.appointmentId ? String(r.appointmentId) : undefined,
      pet: r.pet || 'Pet', breed: r.breed || '', image: absUrl(r.image), owner: r.owner || '', phone: r.phone,
      diagnosis: r.diagnosis || '', symptoms: r.symptoms || '', treatment: r.treatment || '', visitType: r.visitType || 'General',
      visitDate: String(r.visitDate || r.createdAt || '').slice(0, 10),
    }));
  },
  async saveRecord(existingId: string | undefined, b: { appointmentId: string; diagnosis: string; symptoms: string; treatment: string; visitType: string; notes: string }) {
    if (existingId) await api.put(`/medical-records/${existingId}`, b);
    else await api.post('/medical-records', b);
  },

  /* ------------------------------- earnings ------------------------------ */
  async earnings(): Promise<EarningsData> {
    const { data } = await api.get('/doctor/earnings/dashboard');
    const s = data.stats || {};
    return {
      stats: { total: n(s.totalEarnings), today: n(s.todayEarnings), month: n(s.thisMonthEarnings), average: n(s.averageConsultationFee), completed: n(s.completedAppointments), appointments: n(s.totalAppointments) },
      daily: list(data.earningsOverview, (d) => ({ label: String(d.day), value: n(d.earnings) })),
      monthly: list(data.monthlyTrend, (d) => ({ label: String(d.month), value: n(d.earnings) })),
      breakdown: list(data.earningsSummary, (d) => ({ name: String(d.title), value: n(String(d.amount).replace(/[^\d.]/g, '')), pct: String(d.percentage) })),
    };
  },

  /* ----------------------------- profile / status ------------------------ */
  async profile(): Promise<DoctorProfile> {
    const { data } = await api.get('/doctor/profile');
    const u = data.user || {}, info = data.additionalInfo?.data || {};
    return {
      id: String(u._id), name: u.name || 'Doctor', email: u.email || '', phone: u.phone || '', image: absUrl(u.profileImage),
      status: ((u.manualStatus as DoctorStatus) || 'available'),
      specialization: info.specialization || u.specialization, clinic: info.clinicName || u.clinicName, experience: info.experience ? String(info.experience) : undefined,
      fee: info.consultationFee != null ? n(info.consultationFee) : undefined, about: info.about,
    };
  },
  async setStatus(status: DoctorStatus) { await api.patch('/doctor/status', { status }); },

  async schedule(): Promise<DoctorSchedule> {
    const { data } = await api.get('/doctor/schedule');
    const s = data.schedule || {};
    return {
      startTime: s.workingHours?.startTime || '10:00', endTime: s.workingHours?.endTime || '18:00',
      workingDays: s.workingDays || [0, 1, 2, 3, 4, 5, 6], slotDuration: n(s.slotDuration) || 30, breaks: s.breaks || [],
      fee: n(data.consultationFee), holidays: data.holidays || [],
      capabilities: { clinicVisit: !!data.capabilities?.clinicVisit, online: !!data.capabilities?.online, homeCare: !!data.capabilities?.homeCare },
    };
  },
  async saveSchedule(s: DoctorSchedule) {
    await api.put('/doctor/schedule', {
      workingHours: { startTime: s.startTime, endTime: s.endTime }, workingDays: s.workingDays, breaks: s.breaks,
      consultationFee: s.fee, holidays: s.holidays, capabilities: s.capabilities,
    });
  },
};

/** Video room: the appointment's own link when it has one, otherwise the same Jitsi room the web doctor console opens. */
export const callUrl = (a: Pick<Appointment, 'id' | 'meetingLink'>) => a.meetingLink || `https://meet.nowitservices.com/wonpet-${a.id}`;

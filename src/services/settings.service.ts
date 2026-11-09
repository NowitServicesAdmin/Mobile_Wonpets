import { api, fileFromUri } from './api';
import { absUrl } from './mappers';
import type { AdditionalInfo, Collaborator, DirectoryUser, SharedPet, Invitation, NotificationPrefs, Plan, SettingsDoc, Subscription } from '../data/settings';
import { defaultPrefs, emptyInfo } from '../data/settings';

const multipart = { headers: { 'Content-Type': 'multipart/form-data' } };
const isoDay = (d?: string | null) => (d ? String(d).slice(0, 10) : '');
const PLAN_COLORS: Record<string, string> = { blue: '#38BDF8', purple: '#7C3AED', orange: '#FF6B00', green: '#22C55E', pink: '#EC4899', teal: '#14B8A6', red: '#EF4444', indigo: '#6366F1', amber: '#F59E0B', cyan: '#06B6D4' };
const PET_EMOJI: Record<string, string> = { dog: '🐶', cat: '🐱', rabbit: '🐰', hamster: '🐹', parrot: '🦜', bird: '🐦', fish: '🐟' };
const mapSharedPet = (p: any): SharedPet => ({
  id: String(p?._id || p?.id || p || ''),
  name: p?.name || 'Pet',
  emoji: PET_EMOJI[String(p?.animalType || p?.type || '').toLowerCase()] || '🐾',
  image: absUrl(p?.image || p?.profileImage),
});

/* ---------------------------------- mappers --------------------------------- */
const mapCollaborator = (c: any): Collaborator => ({
  id: c._id,
  name: c.collaborator?.name || 'User',
  emoji: '🧑',
  photo: absUrl(c.collaborator?.profileImage),
  contact: c.collaborator?.email || c.collaborator?.phone || '',
  petIds: (c.pets || []).map((p: any) => String(p?._id || p)),
  pets: (c.pets || []).map(mapSharedPet),
  startDate: isoDay(c.startDate),
  endDate: isoDay(c.endDate),
  status: c.status,
});
const mapInvitation = (c: any, status: Invitation['status']): Invitation => ({
  id: c._id,
  ownerName: c.owner?.name || 'Pet owner',
  emoji: '🧑',
  photo: absUrl(c.owner?.profileImage),
    pets: (c.pets || []).map(mapSharedPet),
  startDate: isoDay(c.startDate),
  endDate: isoDay(c.endDate),
  status,
});
const mapDirectoryUser = (u: any): DirectoryUser => ({ id: u._id, name: u.name || 'User', emoji: '🧑', photo: absUrl(u.profileImage), email: u.email || '', phone: u.phone || '', role: u.role || 'user' });

/** Notification prefs: fill any missing key with `true` so every switch has a value. */
const mergePrefs = (server: any): NotificationPrefs => {
  const base = defaultPrefs() as any;
  for (const g of Object.keys(base)) base[g] = { ...base[g], ...(server?.[g] || {}) };
  return base;
};

export const settingsService = {
  /* ------------------------------ additional info ------------------------------ */
  async getInfo(): Promise<AdditionalInfo> {
    const { data } = await api.get('/settings/additional');
    return { ...emptyInfo, ...(data.data || {}) };
  },
  /** Doctors: once KYC is activated the clinic address is frozen server-side - this tells the form which fields to lock. */
  async getInfoLock(): Promise<{ locked: boolean; fields: string[] }> {
    const { data } = await api.get('/settings/additional');
    return { locked: !!data.lock?.locked, fields: data.lock?.fields || [] };
  },
  async saveInfo(info: AdditionalInfo): Promise<AdditionalInfo> {
    const { data } = await api.put('/settings/additional', info);
    return { ...emptyInfo, ...(data.info?.data || info) };
  },

  /* ------------------------------- notifications ------------------------------- */
  async getPrefs(): Promise<NotificationPrefs> {
    const { data } = await api.get('/settings/notifications');
    return mergePrefs(data.notification);
  },
  async savePrefs(p: NotificationPrefs): Promise<NotificationPrefs> {
    const { data } = await api.put('/settings/notifications', p);
    return mergePrefs(data.notification);
  },

  /* --------------------------------- documents --------------------------------- */
  async getDocuments(): Promise<Record<string, SettingsDoc & { id: string }>> {
    const { data } = await api.get('/documents/my-documents');
    const out: Record<string, SettingsDoc & { id: string }> = {};
    for (const d of data.documents || []) {
      out[d.documentType] = { id: d._id, type: d.documentType, name: d.fileName || 'Document', size: '', uri: absUrl(d.documentUrl) || '' };
    }
    return out;
  },
  /** Upload a new document, or replace the existing one when `existingId` is given. */
  async uploadDocument(type: string, file: { uri: string; name: string; mime?: string }, existingId?: string) {
    const f = new FormData();
    f.append('documentType', type);
    f.append('file', { uri: file.uri, name: file.name, type: file.mime || 'application/octet-stream' } as any);
    const { data } = existingId ? await api.put(`/documents/${existingId}`, f, multipart) : await api.post('/documents/upload', f, multipart);
    const d = data.document;
    return { id: d._id as string, type, name: d.fileName || file.name, uri: absUrl(d.documentUrl) || file.uri };
  },
  async deleteDocument(id: string) {
    await api.delete(`/documents/${id}`);
  },

  /* ------------------------------- subscription ------------------------------- */
  async getPlans(): Promise<{ plans: Plan[]; yearlySaving?: number }> {
    const { data } = await api.get('/subscriptions/plans', { params: { role: 'customer' } });
    return {
      yearlySaving: data.yearlySaving,
      plans: (data.plans || []).map((p: any): Plan => ({
        id: p.id, name: p.name, emoji: p.icon || '🐾', monthly: Number(p.monthlyPrice) || 0, features: p.features || [],
        color: PLAN_COLORS[p.button] || PLAN_COLORS[p.ribbon] || '#7C3AED', popular: !!p.popular,
      })),
    };
  },
  async getMySubscription(): Promise<(Subscription & { active: boolean }) | null> {
    const { data } = await api.get('/subscriptions/me');
    const s = data.subscription;
    if (!s || s.status !== 'active') return null;
    return { planId: s.planName, billing: s.billingCycle === 'yearly' ? 'yearly' : 'monthly', renewsOn: isoDay(s.endDate), cancelled: !!s.cancelRequested, active: !!s.isCurrentlyActive };
  },
  async cancelSubscription(reason = '') {
    await api.patch('/subscriptions/cancel', { reason });
  },
  async restoreSubscription() {
    await api.patch('/subscriptions/restore');
  },
  /** Step 1 of buying a paid plan. Ready for when the Razorpay checkout is switched on (then call activateSubscription). */
  async initiateSubscription(planName: string, billingCycle: 'monthly' | 'yearly') {
    const { data } = await api.post('/subscriptions/initiate', { planName, billingCycle });
    return data as { requiresPayment: boolean; order?: { id: string; amount: number }; keyId?: string };
  },
  async activateSubscription(p: { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string }) {
    await api.post('/subscriptions/activate', p);
  },

  /* ------------------------------- collaborators ------------------------------- */
  async searchUsers(query: string): Promise<DirectoryUser[]> {
    const { data } = await api.get('/collaborators/search-users', { params: { query } });
    return (data.users || []).map(mapDirectoryUser);
  },
  async listCollaborators(): Promise<Collaborator[]> {
    const { data } = await api.get('/collaborators/owned');
    return (data.collaborators || []).map(mapCollaborator);
  },
  async inviteCollaborator(p: { userId: string; petIds: string[]; startDate: string; endDate: string }) {
    await api.post('/collaborators', { collaboratorUserId: p.userId, petIds: p.petIds, startDate: p.startDate, endDate: p.endDate });
  },
  async updateCollaborator(id: string, p: { petIds: string[]; startDate: string; endDate: string }) {
    await api.put(`/collaborators/${id}`, p);
  },
  async revokeCollaborator(id: string) {
    await api.delete(`/collaborators/${id}`);
  },
  async listInvitations(): Promise<Invitation[]> {
    const [inv, acc] = await Promise.all([api.get('/collaborators/invitations'), api.get('/collaborators/delegated')]);
    return [
      ...(inv.data.invitations || []).map((c: any) => mapInvitation(c, 'pending')),
      ...(acc.data.accounts || []).map((c: any) => mapInvitation(c, 'accepted')),
    ];
  },
  async respondInvitation(id: string, accept: boolean) {
    await api.put(`/collaborators/${id}/respond`, { action: accept ? 'accept' : 'decline' });
  },

  /* ------------------------------- invite / help ------------------------------- */
  async sendInvite(email: string) {
    await api.post('/auth/send-invite', { email });
  },
  async getFaqs(): Promise<{ q: string; a: string }[]> {
    const { data } = await api.get('/settings/faqs');
    return (data.faqs || []).map((f: any) => ({ q: f.question || f.q, a: f.answer || f.a })).filter((f: any) => f.q && f.a);
  },
  async getContact(): Promise<{ email: string; phone: string; address: string } | null> {
    const { data } = await api.get('/settings/contact');
    const c = data.contact;
    return c ? { email: c.email || '', phone: c.phone || '', address: c.address || '' } : null;
  },
};

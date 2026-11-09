// Settings types + static copy. Live data comes from services/settings.service.ts via SettingsContext.

// ---------- notifications (same groups and categories as the web) ----------
export type PrefGroup = 'email' | 'notifications' | 'alerts';
export const NOTIFICATION_GROUPS: Record<PrefGroup, { label: string; title: string; description: string; categories: Record<string, { title: string; description: string }> }> = {
  email: { label: 'Email', title: 'Enable Email Notifications', description: 'Receive selected WONPET notifications in your email inbox.', categories: {
    appointments: { title: 'Appointments', description: 'Appointment confirmations, changes and updates.' },
    collaboration: { title: 'Collaboration', description: 'Invitations and shared-pet access updates.' },
    orders: { title: 'Orders', description: 'Order and delivery updates.' },
    medicalRecords: { title: 'Medical records', description: 'Prescription and vaccination updates.' },
    reminders: { title: 'Reminders', description: 'Appointment, medicine and vaccination reminders.' },
    importantAlerts: { title: 'Important alerts', description: 'Urgent or time-sensitive system alerts.' },
  } },
  notifications: { label: 'Notifications', title: 'Enable Notifications', description: 'Receive platform notifications and updates.', categories: {
    appointments: { title: 'Appointments', description: 'Confirmations, cancellations and reschedules.' },
    messages: { title: 'Messages', description: 'New chat messages from doctors and pet owners.' },
    collaboration: { title: 'Collaboration', description: 'Invitations and access changes for shared pets.' },
    orders: { title: 'Orders', description: 'Order confirmations, shipping and delivery updates.' },
    medicalRecords: { title: 'Medical Records', description: 'New prescriptions and vaccination record updates.' },
  } },
  alerts: { label: 'Alerts', title: 'Enable Alerts', description: 'Receive system alerts, reminders and warnings.', categories: {
    appointmentReminders: { title: 'Appointment reminders', description: 'A heads-up before an upcoming appointment.' },
    vaccinationReminders: { title: 'Vaccination reminders', description: 'Upcoming and overdue vaccination alerts.' },
    medicineReminders: { title: 'Medicine reminders', description: 'Prescription and medicine reminders.' },
    petCheckupReminders: { title: 'Pet checkup reminders', description: 'Upcoming and overdue pet visits and health checkups.' },
    collaborationReminders: { title: 'Collaboration reminders', description: 'Warnings when shared-pet access is about to expire.' },
    subscriptionReminders: { title: 'Subscription reminders', description: 'Upcoming and expired subscription alerts.' },
    dailyTaskReminders: { title: 'Daily pet-care reminders', description: 'Recurring daily care task reminders for your pets.' },
    importantAlerts: { title: 'Important alerts', description: 'Other urgent, time-sensitive alerts.' },
  } },
};
export type NotificationPrefs = Record<PrefGroup, Record<string, boolean>>;
export const defaultPrefs = (): NotificationPrefs =>
  Object.fromEntries(Object.entries(NOTIFICATION_GROUPS).map(([g, { categories }]) => [g, { enabled: true, ...Object.fromEntries(Object.keys(categories).map((k) => [k, true])) }])) as unknown as NotificationPrefs;

// ---------- documents (pet owners upload an identity proof) ----------
export const DOCUMENT_TYPES = [{ key: 'identity', title: 'Identity Proof', hint: 'Aadhaar, passport, driving licence or voter ID. PDF or image, up to 5 MB.' }];
export type DocType = { key: string; title: string; hint: string };
/** Doctors upload two documents (same two as the web Settings > Documents). */
export const DOCTOR_DOCUMENT_TYPES: DocType[] = [
  { key: 'medicalLicense', title: 'Medical License', hint: 'Your veterinary registration / licence. PDF or image, up to 5 MB.' },
  { key: 'identity', title: 'Identity Proof', hint: 'Aadhaar, passport, driving licence or voter ID. PDF or image, up to 5 MB.' },
];
/** Store managers upload three documents (same as the web Settings > Documents). */
export const STORE_DOCUMENT_TYPES: DocType[] = [
  { key: 'business', title: 'Business License', hint: 'Shop / trade licence or registration certificate. PDF or image, up to 5 MB.' },
  { key: 'gst', title: 'GST Certificate', hint: 'Your GST registration certificate. PDF or image, up to 5 MB.' },
  { key: 'identity', title: 'Identity Proof', hint: 'Aadhaar, passport, driving licence or voter ID. PDF or image, up to 5 MB.' },
];
/** Which notification switches a store manager sees (web NOTIFICATION_CATEGORIES_BY_ROLE['store manager']). */
export const STORE_NOTIFICATION_KEYS = { email: ['orders', 'importantAlerts'], notifications: ['orders'], alerts: ['subscriptionReminders', 'importantAlerts'] };
/** Store manager FAQs (shown when the server has none). */
export const STORE_FAQS = [
  { q: 'How do I add a product or a pet?', a: 'Open Manage > Products and tap Add Product. Choose Product or Pet, fill in the price and stock, add up to 4 photos and save.' },
  { q: 'What happens when I accept an order?', a: 'The order moves to Processing. If courier delivery is on, a shipment is created - print the label, pack the parcel and tap Request pickup.' },
  { q: 'Why are pets not delivered by courier?', a: 'Live pets are never shipped through the app. Buyers contact you by phone or email and you agree on delivery and payment together.' },
  { q: 'When is an item "Low stock"?', a: 'Anything with 50 units or fewer is low stock; 0 units is out of stock. Update stock from Manage > Inventory.' },
  { q: 'Why is my store address locked?', a: 'Once your KYC is activated and the courier pickup address is ready, the address is frozen. Contact support to change it.' },
];
export type SettingsDoc = { type: string; name: string; size: string; uri: string };

// ---------- additional information ----------
export type AdditionalInfo = {
  location: string; doorNo: string; address: string; city: string; district: string; state: string; country: string; pincode: string;
  /** Filled from the location picker (same fields the web sends) so the backend can geocode / find nearby vets. */
  placeId?: string; latitude?: number | string; longitude?: number | string; formattedAddress?: string;
  /** Doctor-only fields (same names the web Additional Information form sends for the doctor role). */
  clinicName?: string; specialization?: string; experience?: string | number; clinicAddress?: string;
  /** Store-manager-only fields (same names the web Additional Information form sends for the store manager role). */
  storeName?: string; storeCategory?: string; gstNumber?: string; storeAddress?: string;
};
export const emptyInfo: AdditionalInfo = { location: '', doorNo: '', address: '', city: '', district: '', state: '', country: '', pincode: '' };

// ---------- subscription ----------
/** Server-configured yearly discount on the web (monthly x 12 less this %). */
export const DEFAULT_YEARLY_SAVING = 17;
export type Plan = { id: string; name: string; emoji: string; monthly: number; features: string[]; color: string; popular?: boolean };
export type Subscription = { planId: string; billing: 'monthly' | 'yearly'; renewsOn: string; cancelled: boolean };

// ---------- collaborators (people you share your pets with) ----------
export type CollabStatus = 'pending' | 'accepted' | 'declined' | 'revoked' | 'expired';
/** A pet shown on a collaborator / invitation card (name + photo, emoji when there is no photo). */
export type SharedPet = { id: string; name: string; emoji: string; image?: string };
export type Collaborator = { id: string; name: string; emoji: string; photo?: string; contact: string; petIds: string[]; pets: SharedPet[]; startDate: string; endDate: string; status: CollabStatus };
export type DirectoryUser = { id: string; name: string; emoji: string; photo?: string; email: string; phone: string; /** 'doctor' / 'store manager' etc. - plain pet owners are 'user' */ role?: string };
const todayIso = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
export const collabIsExpired = (c: Pick<Collaborator, 'endDate'>) => !!c.endDate && c.endDate < todayIso();

// ---------- shared with me (other owners sharing their pets with you) ----------
export type Invitation = { id: string; ownerName: string; emoji: string; photo?: string; pets: SharedPet[]; startDate: string; endDate: string; status: 'pending' | 'accepted' };

// ---------- help ----------
export const FAQS = [
  { q: 'How do I book a vet appointment?', a: 'Open Appointments and tap Book Appointment. Choose the visit type, doctor, date and time, then pay to confirm.' },
  { q: 'How do I add a new pet?', a: 'On the Dashboard, tap Add New Pet in the My Pets section.' },
  { q: 'Can I change my phone number or email?', a: 'No. Your registered phone number and email cannot be changed.' },
  { q: 'How does a collaborator get access to my pet?', a: 'Go to Settings > Collaborators and add them. Once they accept, they can view the selected pets for the dates you choose.' },
  { q: 'How do I cancel or reschedule an order or appointment?', a: 'Open the order or appointment and use the Cancel or Reschedule button.' },
  { q: 'How does the pet QR code work?', a: "Every pet profile has a QR code. Anyone who scans it sees the pet's public profile, and your contact details if the pet is reported missing." },
];
export const CONTACT = { email: 'support@wonpet.com', phone: '+91 80 4000 1234', address: 'WONPET HQ, 4th Floor, Embassy Tech Square, Bengaluru, Karnataka 560103' };

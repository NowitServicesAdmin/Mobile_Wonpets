import { animalTypes as _animalTypes, breedsByType as _breedsByType, speciesEmoji as _speciesEmoji } from './animals';
const pad2 = (n: number) => String(n).padStart(2, '0');
/** DOB that always yields the given age today, so mock ages never go stale. */
const dobAgo = (years: number, months: number) => {
  const d = new Date();
  d.setDate(1);
  d.setMonth(d.getMonth() - (years * 12 + months));
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-01`;
};

export type Pet = {
  id: string; name: string; breed: string; emoji: string; gender: string; age: string; weight: string; favorite?: boolean;
  /** YYYY-MM-DD. When present the app derives the age label from it (like the web). */
  dob?: string; image?: string; animalType?: string; activity?: number;
  /** Health score 0-100 shown on the pet profile. */
  health?: number;
  /** Reported missing - the public QR page then shows the owner's contact info. */
  isMissing?: boolean; missingSince?: string;
  /** Token embedded in the QR code link. */
  qrToken?: string;
};
export const pets: Pet[] = [
  { id: '1', name: 'Bumpy', breed: 'European Rabbit', emoji: '🐰', gender: 'Female', age: '2 years 10 months', weight: '9 kg', favorite: true, dob: dobAgo(2, 10), animalType: 'Rabbit', activity: 80 },
  { id: '2', name: 'Chubby', breed: 'Syrian Hamster', emoji: '🐹', gender: 'Female', age: '4 years 5 months', weight: '1.4 kg', favorite: true, dob: dobAgo(4, 5), animalType: 'Hamster', activity: 65 },
  { id: '3', name: 'Pluffy', breed: 'Bobcat', emoji: '🐱', gender: 'Male', age: '3 years 11 months', weight: '20.7 kg', dob: dobAgo(3, 11), animalType: 'Cat', activity: 90 },
  { id: '4', name: 'Greeny', breed: 'Eclectus Parrot', emoji: '🦜', gender: 'Male', age: '3 years 4 months', weight: '0.4 kg', dob: dobAgo(3, 4), animalType: 'Parrot', activity: 75 },
  { id: '5', name: 'Rocky', breed: 'Golden Retriever', emoji: '🐶', gender: 'Male', age: '7 years 7 months', weight: '22.5 kg', favorite: true, dob: dobAgo(7, 7), animalType: 'Dog', activity: 100 },
];

export type Task = { id: string; time: string; title: string; subtitle: string; kind: 'water' | 'med' | 'meal' | 'check' };
export const schedule: Task[] = [
  { id: 't1', time: '09:00', title: 'Fresh Water', subtitle: 'Give your pet fresh, clean water for the day', kind: 'water' },
  { id: 't2', time: '10:00', title: 'Kiriki', subtitle: '250 · 3', kind: 'med' },
  { id: 't3', time: '13:00', title: 'Afternoon Meal', subtitle: 'Give your pet their afternoon meal', kind: 'meal' },
  { id: 't4', time: '14:00', title: 'Kiriki', subtitle: '250 · 3', kind: 'med' },
  { id: 't5', time: '18:00', title: 'Evening Meal', subtitle: 'Give your pet their evening meal', kind: 'meal' },
  { id: 't6', time: '21:00', title: 'Kiriki', subtitle: '250 · 3', kind: 'med' },
  { id: 't7', time: '22:00', title: 'Night Check', subtitle: 'Make sure your pet has food, water, and a comfortable place to rest', kind: 'check' },
];

export type AppointmentMode = 'Clinic Visit' | 'Online' | 'Home Care' | 'Emergency';
export type Appointment = {
  id: string; pet: string; emoji: string; age: string; date: string; time: string;
  status: 'Completed' | 'Pending' | 'Confirmed' | 'In Progress' | 'Cancelled'; mode: AppointmentMode; doctor?: string; notes?: string;
  // Added with the richer booking flow - all optional so older saved appointments still work.
  petId?: string; doctorId?: string; fee?: number; reason?: string; visitType?: string; isoDate?: string; homeAddress?: string; attachments?: string[];
  /** Filled in by the API mapper. */
  appointmentNo?: string; time24?: string; meetingLink?: string; hasPrescription?: boolean; paymentStatus?: string; doctorImage?: string; doctorSpec?: string; clinic?: string; petImage?: string;
  /** Filled in for the doctor role: who owns the pet being seen. */
  owner?: string; ownerId?: string; ownerPhone?: string; ownerImage?: string; breed?: string; petGender?: string; petWeight?: string; aiNote?: string; mapUrl?: string;
};
export const appointments: Appointment[] = [
  { id: 'a1', pet: 'Rocky', emoji: '🐶', age: '7 years 7 m…', date: '08/07', time: '7:00 pm', status: 'Completed', mode: 'Clinic Visit', doctor: 'Dr. Anitha Rao', doctorId: 'd1', fee: 400, visitType: 'Check-up', reason: 'Annual check-up and weight review.', notes: 'Mild skin allergy found. Prescription issued, review in 3 weeks.' },
  { id: 'a2', pet: 'Greeny', emoji: '🦜', age: '3 years 4 m…', date: '16/07', time: '6:02 pm', status: 'Completed', mode: 'Online', doctor: 'Dr. Meena Iyer', doctorId: 'd3', fee: 550, visitType: 'Behaviour', reason: 'Feather plucking over the last two weeks.' },
  { id: 'a3', pet: 'Greeny', emoji: '🦜', age: '3 years 4 m…', date: '17/07', time: '6:20 pm', status: 'Completed', mode: 'Online', doctor: 'Dr. Meena Iyer', doctorId: 'd3', fee: 550, visitType: 'Check-up', reason: 'Follow-up on diet change.' },
  { id: 'a4', pet: 'Pluffy', emoji: '🐱', age: '3 years 11 m…', date: '18/07', time: '12:30 pm', status: 'Completed', mode: 'Online', doctor: 'Dr. Anitha Rao', doctorId: 'd1', fee: 400, visitType: 'Digestive Issues', reason: 'Loose stool since yesterday.' },
  { id: 'a5', pet: 'Greeny', emoji: '🦜', age: '3 years 4 m…', date: '18/07', time: '1:30 pm', status: 'Completed', mode: 'Clinic Visit', doctor: 'Dr. Meena Iyer', doctorId: 'd3', fee: 550, visitType: 'Behaviour', reason: 'Stress related feather plucking.', notes: 'Enrichment toys and vitamin supplement advised.' },
  { id: 'a6', pet: 'Greeny', emoji: '🦜', age: '3 years 4 m…', date: '18/07', time: '2:30 pm', status: 'Completed', mode: 'Emergency', doctor: 'Dr. Suresh Kumar', doctorId: 'd2', fee: 650, visitType: 'Injury', reason: 'Wing injury after a fall.' },
  // Demo: an appointment for today so it shows up in Today's Schedule.
  { id: 'a7', pet: 'Rocky', emoji: '🐶', age: '7 years 7 m…', date: `${pad2(new Date().getDate())}/${pad2(new Date().getMonth() + 1)}`, time: '5:30 pm', status: 'Confirmed', mode: 'Clinic Visit', doctor: 'Dr. Anitha Rao', doctorId: 'd1', fee: 400, visitType: 'Vaccination', reason: 'Booster vaccination.' },
];

export type Product = {
  id: string; name: string; category: string; emoji: string; price: number; mrp: number; off: number; rating: number; reviews: number; source: string; stock: number; description: string;
  /** Set by the API mapper. */
  image?: string; images?: string[]; itemType?: 'pet' | 'product'; categoryId?: string; storeManagerId?: string; breed?: string; badge?: string;
};
export const products: Product[] = [
  { id: 'p1', name: 'Golden Retriever Dog Ag…', category: 'Pets', emoji: '🐕', price: 9200, mrp: 10000, off: 8, rating: 5.0, reviews: 1, source: 'Car pets', stock: 1, description: 'Healthy, vaccinated Golden Retriever.' },
  { id: 'p2', name: 'Pedigree', category: 'Food', emoji: '🥫', price: 704, mrp: 800, off: 12, rating: 4.5, reviews: 1, source: 'Car pets', stock: 120, description: 'Adult chicken & vegetables, complete and balanced nutrition.' },
  { id: 'p3', name: 'Cat bed', category: 'Accessories', emoji: '🛏️', price: 4750, mrp: 5000, off: 5, rating: 4.5, reviews: 1, source: 'WonPets Store', stock: 36, description: 'Soft star-print bed with cushion, machine washable.' },
  { id: 'p4', name: 'Pet Essentials Tick & Flea…', category: 'All', emoji: '🧴', price: 243.46, mrp: 292, off: 17, rating: 4.5, reviews: 1, source: 'Amazon.in', stock: 50, description: '2-in-1 tick and flea repellent spray.' },
  { id: 'p5', name: 'Neem Plus Shampoo Set', category: 'All', emoji: '🧼', price: 499, mrp: 601, off: 17, rating: 4.2, reviews: 3, source: 'PIL', stock: 20, description: 'Herbal pet shampoo set.' },
  { id: 'p6', name: 'Steel Water Bowl', category: 'Accessories', emoji: '🥣', price: 349, mrp: 420, off: 17, rating: 4.4, reviews: 2, source: 'Supertails', stock: 80, description: 'Non-slip stainless steel bowl.' },
];

export const plans = [
  { id: 'basic', name: 'Basic', emoji: '🦊', price: 'FREE', sub: 'Forever', color: '#38BDF8', features: ['Basic Dashboard Access', 'Basic Reports', 'Limited Document Storage', 'Community Support', 'Standard Support'] },
  { id: 'pro', name: 'Pro', emoji: '🐼', price: '₹299', sub: '/month', color: '#7C3AED', features: ['Up to 5 Pet Profiles', '5 Free Consultations / month', 'Advanced Health Records', 'More Document Storage', 'Priority Support'] },
  { id: 'premium', name: 'Premium', emoji: '🦄', price: '₹499', sub: '/month', color: '#FF6B00', features: ['Unlimited Pet Profiles', 'Unlimited Consultations', 'Complete Health Records', 'Unlimited Document Storage', 'Pet Resale Marketplace'] },
];

export const facts = [
  'Service dogs are recognized in the U.S. as "necessary medical equipment."',
  "Rabbits' teeth never stop growing, so they need hay to chew on.",
  'Cats spend about two thirds of their lives asleep.',
];

export const faqs = [
  { q: 'How do I book a vet appointment?', a: 'Open Appointments and tap Book Appointment.' },
  { q: 'How do I add a new pet?', a: 'On the Dashboard, tap Add New Pet in the My Pets section.' },
  { q: 'Can I change my phone number?', a: 'No. Your registered phone number and email cannot be changed.' },
];

export type Doctor = {
  id: string; name: string; spec: string; emoji: string; fee: number; rating?: number;
  clinic: string; experience: string; distanceKm: number; image?: string; onlineOnly?: boolean; status?: string;
  /** Which visit types this doctor accepts (clinic / online / home care). */
  capabilities: { clinic: boolean; online: boolean; home: boolean };
};
export const doctors: Doctor[] = [
  { id: 'd1', name: 'Dr. Anitha Rao', spec: 'General Veterinary', emoji: '👩‍⚕️', fee: 400, rating: 4.8, clinic: 'Paws & Care Clinic', experience: '9 yrs', distanceKm: 2.4, capabilities: { clinic: true, online: true, home: true } },
  { id: 'd2', name: 'Dr. Suresh Kumar', spec: 'Surgery & Orthopedics', emoji: '👨‍⚕️', fee: 650, rating: 4.7, clinic: 'City Pet Hospital', experience: '14 yrs', distanceKm: 5.1, capabilities: { clinic: true, online: false, home: false } },
  { id: 'd3', name: 'Dr. Meena Iyer', spec: 'Exotic Pets & Birds', emoji: '👩‍⚕️', fee: 550, rating: 4.9, clinic: 'Feather & Fur Vet Centre', experience: '11 yrs', distanceKm: 7.8, capabilities: { clinic: true, online: true, home: false } },
];
export const visitTypes = ['Check-up', 'Vaccination', 'Skin & Coat', 'Digestive Issues', 'Dental', 'Injury', 'Behaviour', 'Other'];
export const slots = ['09:00 am', '10:30 am', '12:00 pm', '02:00 pm', '04:30 pm', '06:00 pm'];
export const modes = ['Clinic Visit', 'Online', 'Home Care', 'Emergency'] as const;

/** ISO timestamp N days (and hours) ago, so demo orders never go stale. */
const isoAgo = (days: number, hour = 12) => { const d = new Date(); d.setDate(d.getDate() - days); d.setHours(hour, 0, 0, 0); return d.toISOString(); };

export type AddressType = 'Home' | 'Work' | 'Other';
export type Address = {
  id: string; fullName: string; phone: string; doorNo: string; area: string; landmark?: string; addressType: AddressType; isDefault: boolean;
  /** Required by the backend (filled from the location lookup). */
  formattedAddress?: string; city?: string; state?: string; pincode?: string; district?: string; country?: string; latitude?: number; longitude?: number; placeId?: string;
};
export const addressesSeed: Address[] = [
  { id: 'ad1', fullName: 'Pet Parent', phone: '+91 98765 43210', doorNo: '12/4, Lake View Apartments', area: 'Indiranagar, Bengaluru, Karnataka 560038', landmark: 'Near Metro Station', addressType: 'Home', isDefault: true },
  { id: 'ad2', fullName: 'Pet Parent', phone: '+91 98765 43210', doorNo: 'Floor 3, Tech Park', area: 'Whitefield, Bengaluru, Karnataka 560066', addressType: 'Work', isDefault: false },
];

export type Offer = {
  id: string; code: string; title: string; discountType: 'Percentage' | 'Flat'; discount: number; maximumDiscount?: number; minimumOrderAmount: number; endDate: string;
  /** Evaluated by the server for the current cart. */
  applicable?: boolean; reason?: string; discountAmount?: number; scopeLabel?: string; isBest?: boolean; description?: string;
};
export const offers: Offer[] = [
  { id: 'of1', code: 'WELCOME10', title: 'Welcome offer', discountType: 'Percentage', discount: 10, maximumDiscount: 200, minimumOrderAmount: 500, endDate: '2026-12-31' },
  { id: 'of2', code: 'PETLOVE150', title: 'Flat savings for pet parents', discountType: 'Flat', discount: 150, minimumOrderAmount: 1500, endDate: '2026-12-15' },
  { id: 'of3', code: 'COZY5', title: 'Cozy season sale', discountType: 'Percentage', discount: 5, minimumOrderAmount: 3000, endDate: '2026-11-30' },
];

export type OrderStatus = 'Pending' | 'Processing' | 'Shipped' | 'Delivered' | 'Cancelled';
export type PaymentMethod = 'Cash on Delivery' | 'Online Payment';
export type ShipmentActivity = { activity: string; location: string; time: string };
export type Courier = { name: string; awb: string; eta: string; trackUrl: string; status: string; activities: ShipmentActivity[] };
export type OrderItem = { productId: string; qty: number; name?: string; image?: string; price?: number };
export type Order = {
  /** Backend _id (used for navigation / API calls). `orderNo` is the human readable id (ORD-...). */
  id: string; orderNo?: string; date: string; createdAt: string; status: OrderStatus;
  items: OrderItem[];
  subtotal: number; shipping: number; discount: number; couponCode?: string; total: number;
  payment: PaymentMethod; paymentStatus?: string; address?: Address; courier?: Courier; etaDays?: number | null;
  /** When each stage was reached (ISO), used by the order timeline. */
  timestamps?: Partial<Record<Exclude<OrderStatus, 'Cancelled'>, string>>;
};
export const orders: Order[] = [
  { id: 'WP-10510', date: '25 Oct 2026', createdAt: isoAgo(2, 18), status: 'Pending', items: [{ productId: 'p5', qty: 1 }], subtotal: 499, shipping: 49, discount: 0, total: 548, payment: 'Cash on Delivery', address: addressesSeed[0], timestamps: { Pending: isoAgo(2, 18) } },
  { id: 'WP-10482', date: '12 Oct 2026', createdAt: isoAgo(15, 10), status: 'Shipped', items: [{ productId: 'p2', qty: 2 }], subtotal: 1408, shipping: 49, discount: 0, total: 1457, payment: 'Online Payment', address: addressesSeed[0],
    timestamps: { Pending: isoAgo(15, 10), Processing: isoAgo(14, 9), Shipped: isoAgo(13, 16) },
    courier: { name: 'Delhivery', awb: 'DL7782910344', eta: 'Expected in 2 days', trackUrl: 'https://www.delhivery.com/track', status: 'In transit', activities: [
      { activity: 'Shipment in transit', location: 'Bengaluru Hub', time: isoAgo(1, 8) },
      { activity: 'Picked up by courier', location: 'Seller warehouse', time: isoAgo(13, 17) },
      { activity: 'Shipment created', location: 'Seller warehouse', time: isoAgo(13, 16) },
    ] } },
  { id: 'WP-10391', date: '28 Sep 2026', createdAt: isoAgo(29, 11), status: 'Delivered', items: [{ productId: 'p3', qty: 1 }, { productId: 'p6', qty: 1 }], subtotal: 5099, shipping: 0, discount: 0, total: 5099, payment: 'Cash on Delivery', address: addressesSeed[1],
    timestamps: { Pending: isoAgo(29, 11), Processing: isoAgo(28, 10), Shipped: isoAgo(27, 15), Delivered: isoAgo(24, 13) } },
  { id: 'WP-10277', date: '03 Sep 2026', createdAt: isoAgo(54, 9), status: 'Delivered', items: [{ productId: 'p5', qty: 1 }], subtotal: 499, shipping: 0, discount: 0, total: 499, payment: 'Online Payment', address: addressesSeed[0],
    timestamps: { Pending: isoAgo(54, 9), Processing: isoAgo(53, 10), Shipped: isoAgo(52, 12), Delivered: isoAgo(49, 14) } },
];

export type Notice = { id: string; icon: string; title: string; body: string; time: string; unread?: boolean; createdAt?: string; type?: string; actionUrl?: string };
export const notices: Notice[] = [
  { id: 'n1', icon: 'calendar', title: 'Appointment completed', body: 'Greeny\'s emergency visit is marked completed.', time: '2h ago', unread: true },
  { id: 'n2', icon: 'bag-check', title: 'Order shipped', body: 'Your order WP-10482 is on the way.', time: '5h ago', unread: true },
  { id: 'n3', icon: 'medkit', title: 'Medication reminder', body: 'Kiriki 250 is due at 2:00 pm.', time: 'Yesterday' },
  { id: 'n4', icon: 'pricetag', title: 'Cozy season sale', body: 'Up to 17% off beds, bowls and more.', time: '2 days ago' },
];

export const documents = [
  { id: 'doc1', name: 'Rocky — Vaccination card.pdf', size: '1.2 MB' },
  { id: 'doc2', name: 'Greeny — Blood report.pdf', size: '640 KB' },
  { id: 'doc3', name: 'Bumpy — Insurance policy.pdf', size: '2.4 MB' },
];
export const collaborators = [
  { id: 'c1', name: 'Priya S.', role: 'Co-owner', emoji: '👩' },
  { id: 'c2', name: 'Ravi K.', role: 'Pet sitter', emoji: '👨' },
];
export const vetReplies = [
  'Hi! I\'m Dr. Anitha from WONPET. How can I help your pet today?',
  'Thanks for sharing. Could you tell me how long this has been going on?',
  'I\'d suggest booking a clinic visit so we can examine them. Shall I help you schedule one?',
];
export const species = ['Dog', 'Cat', 'Rabbit', 'Hamster', 'Bird', 'Other'] as const;
// Animal types, their emoji and breeds live in data/animals.ts (re-exported here so older imports keep working)
export const speciesEmoji = _speciesEmoji;
export const animalTypes = _animalTypes;
export const breedsByType = _breedsByType;
// ---- Schedule data (placeholder for the dashboard schedule API) ----
/** Set by the WonPet team; owners can switch each one off per pet. */
export type DailyTask = { id: string; time: string; title: string; description: string };
export const dailyTasks: DailyTask[] = [
  { id: 'dt1', time: '09:00 AM', title: 'Fresh Water', description: 'Give your pet fresh, clean water for the day' },
  { id: 'dt2', time: '01:00 PM', title: 'Afternoon Meal', description: 'Give your pet their afternoon meal' },
  { id: 'dt3', time: '06:00 PM', title: 'Evening Meal', description: 'Give your pet their evening meal' },
  { id: 'dt4', time: '10:00 PM', title: 'Night Check', description: 'Make sure your pet has food, water, and a comfortable place to rest' },
];
/** Prescribed doses - times are fixed by the doctor, owner marks each as given. */
export type Medicine = { id: string; petId: string; time: string; title: string; description: string };
export const medicines: Medicine[] = [
  { id: 'm1', petId: '5', time: '10:00 AM', title: 'Kiriki', description: '250 · 3' },
  { id: 'm2', petId: '5', time: '02:00 PM', title: 'Kiriki', description: '250 · 3' },
  { id: 'm3', petId: '5', time: '09:00 PM', title: 'Kiriki', description: '250 · 3' },
];
export type OwnerTask = { id: string; petId: string; title: string; description: string; time: string; startDate: string; endDate: string | null; status: 'Active' | 'Paused' };
export const ownerTasksSeed: OwnerTask[] = [
  { id: 'ot1', petId: '5', title: 'Evening Walk', description: '30 minute walk in the park', time: '06:30 PM', startDate: '2026-01-01', endDate: null, status: 'Active' },
];

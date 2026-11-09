/**
 * Converts backend documents to the shapes the screens already use (data/mock.ts types),
 * so the UI stays the same and only the data source changes.
 */
import { API_ORIGIN } from '../config/env';
import type { Address, Appointment, Doctor, Notice, Offer, Order, OrderStatus, Pet, Product } from '../data/mock';
import { speciesEmoji } from '../data/mock';
import { formatAgeFromDob } from '../utils/petAge';
import type { ApiUser } from './auth.service';

const pad = (n: number) => String(n).padStart(2, '0');
const num = (v: any, d = 0) => (Number.isFinite(Number(v)) ? Number(v) : d);
const round2 = (n: number) => Math.round(n * 100) / 100;

export const absUrl = (u?: string | null) => {
  if (!u) return undefined;
  // Android blocks plain-http images; Cloudinary (and most CDNs) serve https just as well
  if (/^http:\/\/res\.cloudinary\.com/i.test(u)) return u.replace(/^http:/i, 'https:');
  return /^https?:\/\//i.test(u) ? u : `${API_ORIGIN}${u.startsWith('/') ? '' : '/'}${u}`;
};
const idOf = (v: any): string => (v && typeof v === 'object' ? String(v._id ?? v.id ?? '') : String(v ?? ''));

/* ------------------------------ time helpers ------------------------------ */
/** "14:30" -> "2:30 pm". Already-formatted values ("10:00 AM") are normalised too. */
export const to12h = (t?: string) => {
  const m = /^(\d{1,2}):(\d{2})\s*([ap]m)?$/i.exec((t || '').trim());
  if (!m) return t || '';
  let h = Number(m[1]);
  const min = m[2];
  const mer = m[3]?.toLowerCase();
  if (mer) return `${h}:${min} ${mer}`;
  const out = h >= 12 ? 'pm' : 'am';
  h = h % 12 === 0 ? 12 : h % 12;
  return `${h}:${min} ${out}`;
};
/** "2:30 pm" / "02:30 PM" / "14:30" -> "14:30" (what the backend stores). */
export const to24h = (t: string) => {
  const m = /^(\d{1,2}):(\d{2})\s*([ap]m)?$/i.exec((t || '').trim());
  if (!m) return t;
  let h = Number(m[1]);
  const mer = m[3]?.toLowerCase();
  if (mer === 'pm' && h !== 12) h += 12;
  if (mer === 'am' && h === 12) h = 0;
  return `${pad(h)}:${m[2]}`;
};
/** ISO date -> "dd/MM" (appointment lists use this style). Backend dates are UTC midnight, so slice the string. */
export const isoToDDMM = (iso?: string) => {
  const d = (iso || '').slice(0, 10).split('-');
  return d.length === 3 ? `${d[2]}/${d[1]}` : '';
};
export const relativeTime = (iso?: string) => {
  if (!iso) return '';
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return 'Just now';
  if (min < 60) return `${min}m ago`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d === 1) return 'Yesterday';
  if (d < 7) return `${d} days ago`;
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
};

/* ---------------------------------- user ---------------------------------- */
export type AppRole = 'user' | 'store_manager' | 'doctor';
export const toApiRole = (r: AppRole) => (r === 'store_manager' ? 'store manager' : r);
export const fromApiRole = (r: string): AppRole | 'other' => (r === 'user' ? 'user' : r === 'doctor' ? 'doctor' : r === 'store manager' ? 'store_manager' : 'other');
export const toApiGender = (g: string) => (g === 'other' ? 'others' : g);

export function mapUser(u: ApiUser) {
  const role = fromApiRole(u.role);
  return {
    id: u._id,
    name: u.name || 'Customer',
    email: u.email || '',
    phone: u.phone || '',
    gender: (u.gender === 'others' ? 'other' : u.gender || 'female') as 'male' | 'female' | 'other',
    role: (role === 'other' ? 'user' : role) as AppRole,
    location: u.address || '',
    profileImage: absUrl(u.profileImage),
    createdAt: u.createdAt,
    isSubscribed: !!u.isSubscribed,
    subscriptionPlan: u.subscriptionPlan || '',
  };
}

/* ---------------------------------- pets ---------------------------------- */
export function mapPet(p: any): Pet {
  const dob = p.dob ? String(p.dob).slice(0, 10) : undefined;
  const w = num(p.weight, 0);
  return {
    id: idOf(p),
    name: p.name || '',
    breed: p.breed || '',
    animalType: p.animalType || undefined,
    emoji: speciesEmoji[p.animalType] ?? '🐾',
    gender: p.gender === 'others' ? 'Other' : p.gender || '',
    dob,
    age: (dob && formatAgeFromDob(dob)) || (p.age != null && p.age !== '' ? `${p.age} year${Number(p.age) === 1 ? '' : 's'}` : ''),
    weight: w ? `${w} kg` : '',
    image: absUrl(p.image),
    favorite: !!p.favorite,
    activity: p.activity ?? 100,
    health: p.health ?? 100,
    isMissing: !!p.isMissing,
    missingSince: p.missingSince || undefined,
    qrToken: p.qrToken || undefined,
  };
}

/* ------------------------------- appointments ------------------------------ */
const withDr = (n?: string) => (!n ? undefined : /^dr\.?\s/i.test(n) ? n : `Dr. ${n}`);

export function mapAppointment(a: any): Appointment {
  const pet = a.petId && typeof a.petId === 'object' ? a.petId : null;
  const doc = a.doctorId && typeof a.doctorId === 'object' ? a.doctorId : null;
  const dob = pet?.dob ? String(pet.dob).slice(0, 10) : undefined;
  const hl = a.homeLocation;
  const mode = (a.visitType === 'Emergency' ? 'Emergency' : a.appointmentType || 'Clinic Visit') as Appointment['mode'];
  const status = (a.status === 'Upcoming' ? 'Confirmed' : a.status || 'Pending') as Appointment['status'];
  const time24 = to24h(a.time || '');
  return {
    id: idOf(a),
    appointmentNo: a.appointmentId,
    pet: pet?.name || 'Pet',
    petId: pet ? idOf(pet) : idOf(a.petId) || undefined,
    emoji: speciesEmoji[pet?.animalType] ?? '🐾',
    petImage: absUrl(pet?.image),
    age: (dob && formatAgeFromDob(dob)) || (pet?.age != null ? `${pet.age} years` : ''),
    date: isoToDDMM(a.date),
    isoDate: String(a.date || '').slice(0, 10),
    time: to12h(a.time),
    time24,
    status,
    mode,
    doctor: withDr(doc?.name),
    doctorId: doc ? idOf(doc) : idOf(a.doctorId) || undefined,
    doctorImage: absUrl(doc?.profileImage),
    doctorSpec: doc?.specialization,
    clinic: doc?.clinicName,
    fee: a.consultationFee,
    reason: a.reason || undefined,
    notes: a.notes || undefined,
    visitType: a.visitType,
    homeAddress: hl ? [hl.doorNo, hl.formattedAddress || [hl.area, hl.city].filter(Boolean).join(', ')].filter(Boolean).join(', ') : undefined,
    attachments: (a.files || []).map((f: any) => f.fileUrl).filter(Boolean),
    meetingLink: a.meetingLink || a.meetLink,
    hasPrescription: !!a.prescriptionId,
    paymentStatus: a.paymentStatus,
  };
}

export function mapDoctor(d: any, onlineOnly = false): Doctor {
  const exp = String(d.experience ?? '').trim();
  const cap = d.capabilities || {};
  return {
    id: idOf(d),
    name: withDr(d.name) || 'Doctor',
    spec: d.specialization || 'Veterinary',
    emoji: '👩‍⚕️',
    image: absUrl(d.profileImage),
    fee: num(d.consultationFee, 0),
    clinic: d.clinicName || 'Clinic',
    experience: exp ? (/[a-z]/i.test(exp) ? exp : `${exp} yrs`) : '',
    distanceKm: d.distanceKm ?? 0,
    status: d.status,
    onlineOnly: onlineOnly || !!d.onlineOnly,
    capabilities: { clinic: !!cap.clinicVisit && !onlineOnly, online: !!cap.online, home: !!cap.homeCare && !onlineOnly },
  };
}

/* ----------------------------------- store --------------------------------- */
const catEmoji = (name = '') => {
  const n = name.toLowerCase();
  if (/food|treat|nutrition/.test(n)) return '🥫';
  if (/pet|dog|cat|bird|fish/.test(n)) return '🐾';
  if (/bed|toy|access/.test(n)) return '🛏️';
  if (/groom|shampoo|health|care/.test(n)) return '🧴';
  return '🛍️';
};

export function mapProduct(p: any): Product {
  const disc = num(p.discount, 0);
  const base = num(p.price, 0);
  const price = disc > 0 ? num(p.discountPrice, round2(base - (base * disc) / 100)) : base;
  const cat = p.category && typeof p.category === 'object' ? p.category : null;
  const images = (p.images || []).map(absUrl).filter(Boolean) as string[];
  return {
    id: idOf(p),
    name: p.name || '',
    category: cat?.name || (p.itemType === 'pet' ? 'Pets' : 'All'),
    categoryId: cat ? idOf(cat) : undefined,
    emoji: p.itemType === 'pet' ? '🐾' : catEmoji(cat?.name),
    price,
    mrp: base,
    off: disc > 0 ? Math.round(disc) : 0,
    rating: num(p.averageRating, 0),
    reviews: num(p.totalReviews, 0),
    source: p.storeName || 'WonPets Store',
    stock: num(p.stock, 0),
    description: p.description || '',
    image: images[0],
    images,
    itemType: p.itemType === 'pet' ? 'pet' : 'product',
    storeManagerId: idOf(p.storeManagerId) || undefined,
    breed: p.breed || undefined,
    badge: p.badge || undefined,
  };
}

export function mapAddress(a: any): Address {
  return {
    id: idOf(a),
    fullName: a.fullName || '',
    phone: a.phone || '',
    doorNo: a.doorNo || '',
    area: [a.area, a.city, [a.state, a.pincode].filter(Boolean).join(' ')].filter(Boolean).join(', ') || a.formattedAddress || '',
    landmark: a.landmark || undefined,
    addressType: a.addressType || 'Home',
    isDefault: !!a.isDefault,
    formattedAddress: a.formattedAddress,
    city: a.city,
    state: a.state,
    pincode: a.pincode,
    district: a.district,
    country: a.country,
    latitude: a.latitude,
    longitude: a.longitude,
    placeId: a.placeId,
  };
}

export function mapOffer(o: any): Offer {
  return {
    id: idOf(o),
    code: o.code,
    title: o.title || o.highlight || o.code,
    description: o.description,
    discountType: o.discountType === 'Flat' ? 'Flat' : 'Percentage',
    discount: num(o.discount),
    maximumDiscount: o.maximumDiscount || undefined,
    minimumOrderAmount: num(o.minimumOrderAmount),
    endDate: o.endDate,
    applicable: o.applicable,
    reason: o.reason,
    discountAmount: o.discountAmount,
    scopeLabel: o.scopeLabel,
    isBest: o.isBest,
  };
}

const prettyStatus = (s?: string | null) => (s ? s.replace(/_/g, ' ').replace(/^\w/, (c) => c.toUpperCase()) : '');

export function mapOrder(o: any): Order {
  const sh = o.shipping || {};
  const created = o.createdAt;
  const ts: Order['timestamps'] = { Pending: created };
  if (o.deliveredAt) ts.Delivered = o.deliveredAt;
  const addr = o.shippingAddress ? mapAddress({ ...o.shippingAddress, _id: 'shipping', isDefault: false }) : undefined;
  return {
    id: idOf(o),
    orderNo: o.orderId,
    date: created ? new Date(created).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '',
    createdAt: created,
    status: (o.status || 'Pending') as OrderStatus,
    items: (o.products || []).map((i: any) => {
      const p = i.productId && typeof i.productId === 'object' ? i.productId : null;
      return { productId: idOf(i.productId), qty: i.quantity, price: i.price, name: p?.name, image: absUrl(p?.primaryImage || p?.images?.[0]) };
    }),
    subtotal: num(o.subtotal),
    shipping: num(o.shippingCharge),
    discount: num(o.discount),
    couponCode: o.couponCode || undefined,
    total: num(o.totalAmount),
    payment: o.paymentMethod === 'Razorpay' ? 'Online Payment' : 'Cash on Delivery',
    paymentStatus: o.paymentStatus,
    address: addr,
    etaDays: sh.estimatedDeliveryDays ?? null,
    timestamps: ts,
    courier: sh.awbCode
      ? {
          name: sh.courierName || 'Courier',
          awb: sh.awbCode,
          eta: sh.estimatedDeliveryDays ? `Expected in ${sh.estimatedDeliveryDays} day${sh.estimatedDeliveryDays > 1 ? 's' : ''}` : sh.estimatedDelivery || 'Delivery date will be updated soon',
          trackUrl: sh.trackUrl || `https://shiprocket.co/tracking/${sh.awbCode}`,
          status: prettyStatus(sh.shiprocketStatus || sh.status),
          activities: [],
        }
      : undefined,
  };
}

/* ------------------------------- notifications ------------------------------ */
const noticeIcon: Record<string, string> = { Appointment: 'calendar', Order: 'bag-check', Reminder: 'medkit', Message: 'chatbubble', Collaboration: 'people', System: 'notifications' };
export function mapNotice(n: any): Notice {
return { id: idOf(n), icon: noticeIcon[n.type] || 'notifications', title: n.title, body: n.message, time: relativeTime(n.createdAt), unread: !n.isRead, createdAt: n.createdAt, type: n.type, actionUrl: n.actionUrl || undefined };
}

/* ---------------------------------- chat ----------------------------------- */
import type { ChatContact, ChatMessage, ChatKind, Conversation, PresenceStatus } from '../data/chat';
import type { Listing, Seller } from '../data/resell';
import { CATEGORY_EMOJI, PET_CATEGORIES } from '../data/resell';
import type { ProductQuestion, Review } from '../data/reviews';

export const kindFromApi = (t: string): ChatKind => (t === 'collaborator' ? 'collab' : t === 'resell' ? 'resell' : 'vet');
const KIND_EMOJI: Record<ChatKind, string> = { vet: '👩‍⚕️', collab: '🙂', resell: '🙂' };

export function mapMessage(m: any, meId: string): ChatMessage {
  return {
    id: idOf(m),
    conversationId: idOf(m.conversationId),
    from: idOf(m.sender) === meId ? 'me' : 'them',
    text: m.message,
    createdAt: m.createdAt,
    isRead: !!m.isRead,
    isEdited: !!m.isEdited,
    isDeleted: !!m.isDeleted,
    isAutoReply: !!m.isAutoReply,
  };
}

/** A server conversation -> the conversation, the other person as a contact, the unread count and the last message. */
/** `viewerRole`: when a doctor opens a vet chat, the other person is a pet owner (no "Dr." prefix, "Pet owner" subtitle). */
export function mapConversation(c: any, meId: string, viewerRole: AppRole = 'user') {
  const kind = kindFromApi(c.chatType);
  const other = (c.participants || []).find((p: any) => idOf(p) !== meId) || {};
  const l = c.listingId && typeof c.listingId === 'object' ? c.listingId : null;
  const contact: ChatContact = {
    id: idOf(other),
    kind,
    name: kind === 'vet' && viewerRole !== 'doctor' ? withDr(other.name) || 'Doctor' : other.name || 'User',
    emoji: kind === 'vet' && viewerRole === 'doctor' ? '🙂' : KIND_EMOJI[kind],
    image: absUrl(other.profileImage),
    subtitle: kind === 'vet' ? (viewerRole === 'doctor' ? 'Pet owner' : 'Veterinary') : kind === 'collab' ? 'Collaborator' : 'Seller',
    status: kind === 'resell' ? undefined : ((other.effectiveStatus || (other.isOnline ? 'online' : 'offline')) as PresenceStatus),
  };
  const conversation: Conversation = {
    id: idOf(c),
    kind,
    contactId: contact.id,
    listing: l ? { id: idOf(l), title: l.title, price: l.price, emoji: CATEGORY_EMOJI[l.category] ?? '📦', image: absUrl(l.images?.[0]) } : undefined,
  };
  const last = c.lastMessage && typeof c.lastMessage === 'object' ? mapMessage({ ...c.lastMessage, conversationId: c._id }, meId) : undefined;
  return { conversation, contact, unread: c.unread || 0, last };
}

/* --------------------------------- resell ---------------------------------- */
export function mapListing(l: any, meId: string): Listing {
  const seller = l.sellerId && typeof l.sellerId === 'object' ? l.sellerId : null;
  const sellerUserId = idOf(l.sellerId);
  const s: Seller | undefined = l.seller || seller
    ? {
        id: sellerUserId,
        name: (l.seller?.name || seller?.name || 'Seller'),
        emoji: '🙂',
        image: absUrl(l.seller?.profileImage || seller?.profileImage),
        phone: seller?.phone || '',
        since: l.seller?.memberSince ? String(l.seller.memberSince) : seller?.createdAt ? String(new Date(seller.createdAt).getFullYear()) : '',
        verified: !!l.seller?.verified,
        listingsCount: l.seller?.listingsCount,
        soldCount: l.seller?.soldCount,
      }
    : undefined;
  return {
    id: idOf(l),
    listingType: PET_CATEGORIES.includes(l.category) ? 'Pet' : 'Product',
    title: l.title,
    category: l.category,
    customCategory: l.customCategory || undefined,
    breed: l.breed || undefined,
    age: l.age || undefined,
    gender: l.gender || undefined,
    brand: l.brand || undefined,
    condition: l.condition,
    price: num(l.price),
    originalPrice: l.originalPrice ? num(l.originalPrice) : undefined,
    quantity: num(l.quantity, 1),
    location: l.location || '',
    description: l.description || '',
    emoji: CATEGORY_EMOJI[l.category] ?? '📦',
    photos: (l.images || []).map(absUrl).filter(Boolean) as string[],
    sellerId: sellerUserId === meId ? 'me' : sellerUserId,
    sellerUserId,
    seller: s,
    status: l.status || 'Available',
    isActive: l.isActive !== false,
    isFeatured: !!l.isFeatured,
    views: num(l.views),
    favouritesCount: Array.isArray(l.favourites) ? l.favourites.length : num(l.favouritesCount),
    createdAt: l.createdAt,
  };
}

/* ------------------------------ reviews / Q&A ------------------------------ */
export function mapReview(r: any, meId: string): Review {
  const c = r.customerId && typeof r.customerId === 'object' ? r.customerId : {};
  return { id: idOf(r), productId: idOf(r.productId), author: c.name || 'Customer', emoji: '🙂', isMe: idOf(r.customerId) === meId, rating: num(r.rating), review: r.review || '', createdAt: r.createdAt };
}
export function mapQuestion(q: any, meId: string): ProductQuestion {
  const c = q.customerId && typeof q.customerId === 'object' ? q.customerId : {};
  return {
    id: idOf(q), productId: idOf(q.productId), author: c.name || 'Customer', emoji: '🙂', isMe: idOf(q.customerId) === meId,
    question: q.question, status: q.status === 'Answered' ? 'Answered' : 'Pending', createdAt: q.createdAt,
    answer: q.status === 'Answered' && q.answer ? { text: q.answer, by: q.answeredBy?.name || 'Store team', at: q.answeredAt || q.updatedAt } : undefined,
  };
}

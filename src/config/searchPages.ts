import { Ionicons } from '@expo/vector-icons';

/** Where a search result opens. Same shape as navigation.navigate(name, params). */
export type SearchTarget = { name: string; params?: Record<string, any> };

/** Same role keys the web uses for its header search (collaborator = "Shared With Me" mode). */
export type SearchRole = 'user' | 'doctor' | 'store_manager' | 'collaborator';

export type SearchPage = {
  title: string;
  keywords: string;
  icon: keyof typeof Ionicons.glyphMap;
  go: SearchTarget;
};

/** Targets inside each role's bottom tabs / stack (the tab screens live under a parent route). */
export const ownerTab = (screen: string, params?: object): SearchTarget => ({ name: 'Main', params: { screen, ...(params ? { params } : {}) } });
export const doctorTab = (screen: string, params?: object): SearchTarget => ({ name: 'DoctorMain', params: { screen, ...(params ? { params } : {}) } });
export const smTab = (screen: string, params?: object): SearchTarget => ({ name: 'SMMain', params: { screen, ...(params ? { params } : {}) } });
export const sharedTab = (screen: string): SearchTarget => ({ name: 'SharedMain', params: { screen } });

/**
 * Quick page links shown in search - one list per role, mirroring the web's config/searchPages.js
 * and pointed at the matching mobile screens (typing "orders" shows "My Orders", etc.).
 * A role only ever sees (and can only search) its OWN pages.
 */
export const OWNER_PAGES: SearchPage[] = [
  { title: 'Dashboard', keywords: 'home pets my pets', icon: 'grid-outline', go: ownerTab('Dashboard') },
  { title: 'Appointments', keywords: 'vet visit booking consultation', icon: 'calendar-outline', go: ownerTab('Appointments') },
  { title: 'Book Appointment', keywords: 'new appointment schedule vet', icon: 'add-circle-outline', go: { name: 'BookAppointment' } },
  { title: 'Store', keywords: 'shop products food toys buy', icon: 'bag-handle-outline', go: ownerTab('Store') },
  { title: 'My Orders', keywords: 'orders track delivery purchases', icon: 'receipt-outline', go: { name: 'Orders' } },
  { title: 'Cart', keywords: 'checkout basket', icon: 'cart-outline', go: { name: 'Cart' } },
  { title: 'Wishlist', keywords: 'saved favourites favorites', icon: 'heart-outline', go: { name: 'Wishlist' } },
  { title: 'Resell', keywords: 'sell listing marketplace', icon: 'pricetag-outline', go: { name: 'Resell' } },
  { title: 'Chat', keywords: 'messages doctor', icon: 'chatbubble-outline', go: { name: 'Chat' } },
  { title: 'Notifications', keywords: 'alerts', icon: 'notifications-outline', go: { name: 'Notifications' } },
  { title: 'Settings', keywords: 'profile account subscription language', icon: 'person-outline', go: ownerTab('Settings') },
];

export const DOCTOR_PAGES: SearchPage[] = [
  { title: 'Dashboard', keywords: 'home overview', icon: 'grid-outline', go: doctorTab('DoctorHome') },
  { title: 'Patients', keywords: 'pets animals', icon: 'people-outline', go: doctorTab('DoctorPatients') },
  { title: 'Schedule', keywords: 'appointments calendar consultations', icon: 'calendar-outline', go: doctorTab('DoctorSchedule') },
  { title: 'Prescriptions', keywords: 'medicine medication', icon: 'document-text-outline', go: { name: 'Prescriptions' } },
  { title: 'Medical Records', keywords: 'history diagnosis', icon: 'flask-outline', go: { name: 'MedicalRecords' } },
  { title: 'Follow-ups', keywords: 'followup follow up', icon: 'calendar-number-outline', go: { name: 'FollowUps' } },
  { title: 'Availability', keywords: 'working hours slots', icon: 'time-outline', go: { name: 'Availability' } },
  { title: 'Earnings', keywords: 'income payout revenue', icon: 'trending-up-outline', go: { name: 'Earnings' } },
  { title: 'Chat', keywords: 'messages owners', icon: 'chatbubble-outline', go: { name: 'Chat' } },
  { title: 'Notifications', keywords: 'alerts', icon: 'notifications-outline', go: { name: 'Notifications' } },
  { title: 'Settings', keywords: 'profile account kyc', icon: 'person-outline', go: doctorTab('DoctorProfile') },
];

export const STORE_MANAGER_PAGES: SearchPage[] = [
  { title: 'Dashboard', keywords: 'home overview', icon: 'grid-outline', go: smTab('SMHome') },
  { title: 'Orders', keywords: 'shipments delivery customers order', icon: 'receipt-outline', go: smTab('SMOrders') },
  { title: 'Products', keywords: 'catalog items', icon: 'cube-outline', go: { name: 'SMProducts' } },
  { title: 'Categories', keywords: 'category', icon: 'albums-outline', go: { name: 'SMCategories' } },
  { title: 'Inventory', keywords: 'stock', icon: 'layers-outline', go: { name: 'SMInventory' } },
  { title: 'Customers', keywords: 'buyers', icon: 'people-outline', go: { name: 'SMCustomers' } },
  { title: 'Reviews', keywords: 'ratings feedback', icon: 'star-outline', go: { name: 'SMReviews' } },
  { title: 'Offers', keywords: 'coupons discounts', icon: 'pricetag-outline', go: { name: 'SMOffers' } },
  { title: 'Reports', keywords: 'analytics export', icon: 'bar-chart-outline', go: { name: 'SMReports' } },
  { title: 'Earnings', keywords: 'income payout revenue', icon: 'trending-up-outline', go: { name: 'SMEarnings' } },
  { title: 'Notifications', keywords: 'alerts', icon: 'notifications-outline', go: { name: 'Notifications' } },
  { title: 'Settings', keywords: 'profile account kyc pickup', icon: 'person-outline', go: smTab('SMProfile') },
];

/** "Shared With Me" mode - only the screens that mode actually has. */
export const COLLABORATOR_PAGES: SearchPage[] = [
  { title: 'Dashboard', keywords: 'home shared pets', icon: 'grid-outline', go: sharedTab('SharedHome') },
  { title: 'Overview', keywords: 'shared account details pets', icon: 'paw-outline', go: sharedTab('SharedPets') },
  { title: 'Chat', keywords: 'messages', icon: 'chatbubble-outline', go: { name: 'Chat', params: { tab: 'collab' } } },
];

const PAGES: Record<SearchRole, SearchPage[]> = {
  user: OWNER_PAGES,
  doctor: DOCTOR_PAGES,
  store_manager: STORE_MANAGER_PAGES,
  collaborator: COLLABORATOR_PAGES,
};

export const searchPages = (query: string, role: SearchRole = 'user'): SearchPage[] => {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  return (PAGES[role] ?? OWNER_PAGES).filter((p) => `${p.title} ${p.keywords}`.toLowerCase().includes(q)).slice(0, 4);
};

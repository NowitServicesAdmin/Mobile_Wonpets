import { Ionicons } from '@expo/vector-icons';

/** Where a search result opens. Same shape as navigation.navigate(name, params). */
export type SearchTarget = { name: string; params?: Record<string, any> };

export type SearchPage = {
  title: string;
  keywords: string;
  icon: keyof typeof Ionicons.glyphMap;
  go: SearchTarget;
};

const tab = (screen: string): SearchTarget => ({ name: 'Main', params: { screen } });

/**
 * Quick page links shown in search - the pet-owner list from the web's config/searchPages.js,
 * pointed at the matching mobile screens (typing "orders" shows "My Orders", etc.).
 */
export const OWNER_PAGES: SearchPage[] = [
  { title: 'Dashboard', keywords: 'home pets my pets', icon: 'grid-outline', go: tab('Dashboard') },
  { title: 'Appointments', keywords: 'vet visit booking consultation', icon: 'calendar-outline', go: tab('Appointments') },
  { title: 'Book Appointment', keywords: 'new appointment schedule vet', icon: 'add-circle-outline', go: { name: 'BookAppointment' } },
  { title: 'Store', keywords: 'shop products food toys buy', icon: 'bag-handle-outline', go: tab('Store') },
  { title: 'My Orders', keywords: 'orders track delivery purchases', icon: 'receipt-outline', go: { name: 'Orders' } },
  { title: 'Cart', keywords: 'checkout basket', icon: 'cart-outline', go: { name: 'Cart' } },
  { title: 'Wishlist', keywords: 'saved favourites favorites', icon: 'heart-outline', go: { name: 'Wishlist' } },
  { title: 'Resell', keywords: 'sell listing marketplace', icon: 'pricetag-outline', go: { name: 'Resell' } },
  { title: 'Chat', keywords: 'messages doctor', icon: 'chatbubble-outline', go: { name: 'Chat' } },
  { title: 'Notifications', keywords: 'alerts', icon: 'notifications-outline', go: { name: 'Notifications' } },
  { title: 'Settings', keywords: 'profile account subscription language', icon: 'person-outline', go: tab('Settings') },
];

export const searchPages = (query: string): SearchPage[] => {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  return OWNER_PAGES.filter((p) => `${p.title} ${p.keywords}`.toLowerCase().includes(q)).slice(0, 4);
};
import type { SearchTarget } from '../config/searchPages';

const tab = (screen: string): SearchTarget => ({ name: 'Main', params: { screen } });

const parseQuery = (qs: string) => {
  const out: Record<string, string> = {};
  qs.split('&').forEach((pair) => {
    if (!pair) return;
    const [k, v = ''] = pair.split('=');
    out[decodeURIComponent(k)] = decodeURIComponent(v);
  });
  return out;
};

/**
 * Search results come back from the server as WEB routes (e.g. /owner/store/product/123).
 * This turns one into the mobile screen that shows the same thing. Returns null when the web page has no mobile screen.
 */
export function resolveSearchTarget(path?: string): SearchTarget | null {
  if (!path) return null;
  const [rawPath, qs = ''] = path.split('#')[0].split('?');
  const p = rawPath.replace(/\/+$/, '');
  const q = parseQuery(qs);
  let m: RegExpMatchArray | null;

  if ((m = p.match(/^\/owner\/dashboard\/pets\/([^/]+)$/))) return { name: 'PetProfile', params: { id: m[1] } };
  if ((m = p.match(/^\/owner\/store\/product\/([^/]+)$/))) return { name: 'ProductDetail', params: { id: m[1] } };
  if ((m = p.match(/^\/owner\/store\/resell\/product\/([^/]+)$/))) return { name: 'ListingDetail', params: { id: m[1] } };
  if (p === '/owner/store/resell/mylisting') return { name: 'MyListings' };
  if (p === '/owner/store/resell') return { name: 'Resell' };
  if (p === '/owner/store/resell-chat') return { name: 'Chat', params: { tab: 'resell' } };
  if ((m = p.match(/^\/owner\/store\/orders\/([^/]+)$/))) return { name: 'OrderDetail', params: { id: m[1] } };
  if (p === '/owner/store/orders') return q.orderId ? { name: 'OrderDetail', params: { id: q.orderId } } : { name: 'Orders' };
  if (p === '/owner/store/wishlist') return { name: 'Wishlist' };
  if (p === '/owner/store/cart' || p === '/owner/store/checkout') return { name: 'Cart' };
  if (p === '/owner/store') return tab('Store');
  if (p === '/owner/appointments/book') return { name: 'BookAppointment' };
  if (p === '/owner/appointments') return q.appointmentId ? { name: 'AppointmentDetail', params: { id: q.appointmentId } } : tab('Appointments');
  if ((m = p.match(/^\/owner\/appointments\/call\/([^/]+)$/))) return { name: 'AppointmentDetail', params: { id: m[1] } };
  if (p === '/owner/dashboard/chat') return { name: 'Chat' };
  if (p === '/owner/notifications') return { name: 'Notifications' };
  if (p === '/owner/settings') {
    // web links like /owner/settings?tab=collaborators -> open that Profile section
    const hint = (q.tab || q.section || q.open || q.view || '').toLowerCase();
    const key = !hint ? null
      : hint.includes('shared') ? 'shared'
      : hint.includes('collab') ? 'collaborators'
      : hint.includes('subscri') || hint.includes('plan') || hint.includes('billing') ? 'subscription'
      : hint.includes('doc') ? 'documents'
      : hint.includes('notif') ? 'notifications'
      : hint.includes('invite') ? 'invite'
      : hint.includes('faq') ? 'faq'
      : hint.includes('support') || hint.includes('contact') ? 'support'
      : hint.includes('profile') ? 'profile' : null;
    return key ? { name: 'Main', params: { screen: 'Settings', params: { open: key, at: Date.now() } } } : tab('Settings');
  }
  if (p === '/owner/dashboard') return tab('Dashboard');
  return null;
}
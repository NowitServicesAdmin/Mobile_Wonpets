import type { SearchTarget } from '../config/searchPages';
import { resolveSearchTarget } from './searchTarget';

const ensureLeadingSlash = (url: string) => (url.startsWith('/') ? url : `/${url}`);
const getQuery = (url: string) => (url.includes('?') ? url.slice(url.indexOf('?')) : '');
const param = (url: string, key: string) => {
  const m = new RegExp(`[?&]${key}=([^&#]+)`).exec(url);
  return m ? decodeURIComponent(m[1]) : null;
};


export function getNotificationTarget(actionUrl?: string | null): SearchTarget | null {
  if (!actionUrl || /^https?:\/\//i.test(actionUrl)) return null;
  let url = ensureLeadingSlash(actionUrl);

  // Legacy scheduler link: appointments/:id
  const legacyAppt = /^\/appointments\/([^/?#]+)/i.exec(url);
  if (legacyAppt) url = `/owner/appointments?open=appointment&appointmentId=${legacyAppt[1]}`;

  // Legacy relative chat links ("dashboard/chat?..." / "chat?...") -> owner chat
  if (/^\/(dashboard\/chat|chat)(\?|$)/.test(url)) url = `/owner/dashboard/chat${getQuery(url)}`;

  // Legacy medicine-reminder link: no /owner/schedule page, it lives on the dashboard
  if (/^\/owner\/schedule(?=[?#]|$)/.test(url)) url = '/owner/dashboard';

  // Never send a pet owner to a store-manager page
  if (url.startsWith('/storemanager/')) {
    const orderId = param(url, 'orderId');
    url = orderId ? `/owner/store/orders/${orderId}` : '/owner/store/orders';
  }

  // Owner order notifications: open the order itself
  if (/^\/owner\/store\/orders\?/.test(url) && param(url, 'open') === 'order' && param(url, 'orderId')) {
    url = `/owner/store/orders/${param(url, 'orderId')}`;
  }

  return resolveSearchTarget(url);
}

/**
 * Where a notification opens: the page its actionUrl points to, or - when the server sent no usable link -
 * a sensible page for its type (collaboration -> Shared With Me / Collaborators, reminder -> Dashboard, ...).
 * Returns null for purely informational notifications.
 */
export function getNotificationTargetFor(n: { actionUrl?: string; type?: string; title?: string; body?: string }): SearchTarget | null {
  const direct = getNotificationTarget(n.actionUrl);
  if (direct) return direct;

  const settings = (open: string): SearchTarget => ({ name: 'Main', params: { screen: 'Settings', params: { open, at: Date.now() } } });
  const text = `${n.title ?? ''} ${n.body ?? ''}`.toLowerCase();
  switch (n.type) {
    case 'Collaboration':
      // you were invited / your access changed -> Shared With Me; someone answered YOUR invite -> Collaborators
      return /accepted|declined|rejected|joined|responded/.test(text) ? settings('collaborators') : settings('shared');
    case 'Appointment': return { name: 'Main', params: { screen: 'Appointments' } };
    case 'Order': return { name: 'Orders' };
    case 'Message': return { name: 'Chat' };
    case 'Reminder': return { name: 'Main', params: { screen: 'Dashboard' } };
    default: return null;
  }
}

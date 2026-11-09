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

export function getDoctorNotificationTarget(n: { actionUrl?: string; type?: string }): SearchTarget | null {
  const url = n.actionUrl && !/^https?:\/\//i.test(n.actionUrl) ? n.actionUrl : '';
  const appt = param(url, 'appointmentId');
  if (appt) return { name: 'DoctorAppointment', params: { id: appt } };
  if (/\/chat(\?|$)/.test(url)) return { name: 'Chat' };
  if (/\/doctor\/(schedule|dashboard)/.test(url)) return { name: 'DoctorMain', params: { screen: 'DoctorSchedule' } };
  switch (n.type) {
    case 'Appointment': return { name: 'DoctorMain', params: { screen: 'DoctorSchedule' } };
    case 'Message': return { name: 'Chat' };
    // an owner shared pets with this doctor -> Profile > Shared With Me
    case 'Collaboration': return { name: 'DoctorMain', params: { screen: 'DoctorProfile', params: { open: 'shared', at: Date.now() } } };
    default: return null;
  }
}


/** Store manager: order notifications open the order itself (web link /storemanager/management/orders?open=order&orderId=…). */
export function getStoreNotificationTarget(n: { actionUrl?: string; type?: string; title?: string; body?: string }): SearchTarget | null {
  const url = n.actionUrl && !/^https?:\/\//i.test(n.actionUrl) ? n.actionUrl : '';
  const orderId = param(url, 'orderId');
  if (orderId) return { name: 'SMOrderDetail', params: { id: orderId } };
  const tab = (screen: string, params?: object): SearchTarget => ({ name: 'SMMain', params: { screen, params } });
  if (/\/management\/orders/.test(url)) return tab('SMOrders');
  if (/\/management\/reviews/.test(url)) return { name: 'SMReviews' };
  if (/\/management\/inventory/.test(url)) return { name: 'SMInventory' };
  if (/\/management\/products/.test(url)) return { name: 'SMProducts' };
  if (/\/management\/offers/.test(url)) return { name: 'SMOffers' };
  if (/\/earnings/.test(url)) return { name: 'SMEarnings' };
  if (/\/settings/.test(url)) return tab('SMProfile', { open: /kyc/i.test(url) ? 'kyc' : /document/i.test(url) ? 'documents' : 'store', at: Date.now() });
  const text = `${n.title ?? ''} ${n.body ?? ''}`.toLowerCase();
  switch (n.type) {
    case 'Order': return tab('SMOrders');
    case 'System':
      if (/stock/.test(text)) return { name: 'SMInventory' };
      if (/review/.test(text)) return { name: 'SMReviews' };
      if (/kyc|payout/.test(text)) return tab('SMProfile', { open: 'kyc', at: Date.now() });
      return null;
    default: return null;
  }
}

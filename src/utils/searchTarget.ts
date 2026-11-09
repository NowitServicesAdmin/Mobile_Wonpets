import { SearchRole, SearchTarget, doctorTab, ownerTab, sharedTab, smTab } from '../config/searchPages';

const tab = (screen: string): SearchTarget => ownerTab(screen);

const parseQuery = (qs: string) => {
  const out: Record<string, string> = {};
  qs.split('&').forEach((pair) => {
    if (!pair) return;
    const [k, v = ''] = pair.split('=');
    out[decodeURIComponent(k)] = decodeURIComponent(v);
  });
  return out;
};

/** Owner (pet parent): web /owner/* routes. */
function resolveOwner(path?: string): SearchTarget | null {
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

/** Doctor: web /doctor/* routes (the server only returns the signed-in doctor's own pages and patients). */
function resolveDoctor(path?: string): SearchTarget | null {
  if (!path) return null;
  const [rawPath, qs = ''] = path.split('#')[0].split('?');
  const p = rawPath.replace(/\/+$/, '');
  const q = parseQuery(qs);
  let m: RegExpMatchArray | null;

  if ((m = p.match(/^\/doctor\/dashboard\/patients\/([^/]+)$/))) return { name: 'PatientDetail', params: { petId: m[1] } };
  // the mobile medical-records list has no per-pet filter, so a pet's records open on that patient
  if ((m = p.match(/^\/doctor\/dashboard\/medical-records\/([^/]+)$/))) return { name: 'PatientDetail', params: { petId: m[1] } };
  if ((m = p.match(/^\/doctor\/schedule\/call\/([^/]+)$/))) return { name: 'DoctorAppointment', params: { id: m[1] } };
  if (p === '/doctor/schedule') return q.appointmentId ? { name: 'DoctorAppointment', params: { id: q.appointmentId } } : doctorTab('DoctorSchedule');
  if (p === '/doctor/dashboard/patients') return doctorTab('DoctorPatients');
  if (p === '/doctor/dashboard/prescriptions') return { name: 'Prescriptions' };
  if (p === '/doctor/dashboard/medical-records') return { name: 'MedicalRecords' };
  if (p === '/doctor/dashboard/followups') return { name: 'FollowUps' };
  if (p === '/doctor/dashboard/availability-schedule') return { name: 'Availability' };
  if (p === '/doctor/earnings') return { name: 'Earnings' };
  if (p === '/doctor/chat' || p === '/doctor/dashboard/chat') return { name: 'Chat' };
  if (p === '/doctor/notifications') return { name: 'Notifications' };
  if (p === '/doctor/settings' || p === '/doctor/profile') return doctorTab('DoctorProfile');
  if (p === '/doctor/dashboard') return doctorTab('DoctorHome');
  return null;
}

/** Store manager: web /storemanager/* routes. */
function resolveStoreManager(path?: string): SearchTarget | null {
  if (!path) return null;
  const [rawPath, qs = ''] = path.split('#')[0].split('?');
  const p = rawPath.replace(/\/+$/, '');
  const q = parseQuery(qs);

  if (p === '/storemanager/management/orders') return q.orderId ? { name: 'SMOrderDetail', params: { id: q.orderId } } : smTab('SMOrders');
  if (p === '/storemanager/management/products') return q.productId ? { name: 'SMProductForm', params: { id: q.productId } } : { name: 'SMProducts' };
  if (p === '/storemanager/management/categories') return { name: 'SMCategories' };
  if (p === '/storemanager/management/inventory') return { name: 'SMInventory' };
  if (p === '/storemanager/management/customers') return { name: 'SMCustomers' };
  if (p === '/storemanager/management/reviews') return { name: 'SMReviews' };
  if (p === '/storemanager/management/offers') return { name: 'SMOffers' };
  if (p === '/storemanager/management/reports') return { name: 'SMReports' };
  if (p === '/storemanager/management') return smTab('SMManage');
  if (p === '/storemanager/earnings') return { name: 'SMEarnings' };
  if (p === '/storemanager/notifications') return { name: 'Notifications' };
  if (p === '/storemanager/settings') return smTab('SMProfile');
  if (p === '/storemanager/dashboard') return smTab('SMHome');
  return null;
}

/** Collaborator ("Shared With Me" mode): web /collaborator/* routes. */
function resolveCollaborator(path?: string): SearchTarget | null {
  if (!path) return null;
  const p = path.split('#')[0].split('?')[0].replace(/\/+$/, '');
  if (p === '/collaborator/dashboard') return sharedTab('SharedHome');
  if (p === '/collaborator/overview') return sharedTab('SharedPets');
  if (p === '/collaborator/chat') return { name: 'Chat', params: { tab: 'collab' } };
  return null;
}

/**
 * Search results come back from the server as WEB routes (e.g. /owner/store/product/123 or /doctor/dashboard/patients/42).
 * This turns one into the mobile screen that shows the same thing for the signed-in role.
 * Returns null when the web page has no mobile screen.
 */
export function resolveSearchTarget(path?: string, role: SearchRole = 'user'): SearchTarget | null {
  switch (role) {
    case 'doctor': return resolveDoctor(path);
    case 'store_manager': return resolveStoreManager(path);
    case 'collaborator': return resolveCollaborator(path);
    default: return resolveOwner(path);
  }
}

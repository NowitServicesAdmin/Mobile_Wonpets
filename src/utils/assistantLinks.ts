import type { AppRole } from '../services/mappers';

/**
 * The backend answers with web paths (e.g. "/owner/store/orders/123"). This turns one into the
 * matching mobile screen. Returns false when there is no mobile screen for the path.
 */
export function openAssistantPath(navigation: any, role: AppRole, rawPath: string): boolean {
  const [path, query = ''] = rawPath.split('?');
  const seg = (re: RegExp) => path.match(re)?.[1];
  const tab = (stack: string, screen: string) => { navigation.navigate(stack, { screen }); return true; };
  const go = (name: string, params?: object) => { navigation.navigate(name, params); return true; };

  if (role === 'doctor') {
    const pet = seg(/\/patients\/([^/]+)$/);
    if (pet) return go('PatientDetail', { petId: pet });
    if (path.includes('/patients')) return tab('DoctorMain', 'DoctorPatients');
    if (path.includes('/prescriptions')) return go('Prescriptions');
    if (path.includes('/followups')) return go('FollowUps');
    if (path.includes('/availability')) return go('Availability');
    if (path.includes('/earnings')) return go('Earnings');
    if (path.includes('/chat')) return go('Chat');
    if (path.includes('/schedule')) return tab('DoctorMain', 'DoctorSchedule');
    if (path.includes('/dashboard')) return tab('DoctorMain', 'DoctorHome');
    return false;
  }

  if (role === 'store_manager') {
    if (path.includes('/orders')) {
      const id = new URLSearchParams(query).get('orderId');
      return id ? go('SMOrderDetail', { id }) : go('SMOrders');
    }
    if (path.includes('/products')) return go('SMProducts');
    if (path.includes('/categories')) return go('SMCategories');
    if (path.includes('/inventory')) return go('SMInventory');
    if (path.includes('/customers')) return go('SMCustomers');
    if (path.includes('/reviews')) return go('SMReviews');
    if (path.includes('/offers')) return go('SMOffers');
    if (path.includes('/reports')) return go('SMReports');
    if (path.includes('/earnings')) return tab('SMMain', 'SMEarnings');
    if (path.includes('/dashboard')) return tab('SMMain', 'SMHome');
    return false;
  }

  // pet owner
  const productId = seg(/\/product\/([^/]+)$/);
  if (productId) return go('ProductDetail', { id: productId });
  const orderId = seg(/\/orders\/([^/]+)$/);
  if (orderId) return go('OrderDetail', { id: orderId });
  const petId = seg(/\/pets\/([^/]+)$/);
  if (petId) return go('PetProfile', { id: petId });
  if (path.includes('/appointments/book')) return go('BookAppointment');
  if (path.includes('/appointments')) return tab('Main', 'Appointments');
  if (path.includes('/store/cart')) return go('Cart');
  if (path.includes('/store/checkout')) return go('Checkout');
  if (path.includes('/store/wishlist')) return go('Wishlist');
  if (path.includes('/store/orders')) return go('Orders');
  if (path.includes('/resell/mylisting')) return go('MyListings');
  if (path.includes('/resell')) return go('Resell');
  if (path.includes('/chat')) return go('Chat');
  if (path.includes('/store')) return tab('Main', 'Store');
  if (path.includes('/dashboard')) return tab('Main', 'Dashboard');
  return false;
}
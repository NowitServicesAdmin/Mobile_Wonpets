import { api } from './api';
import { absUrl, mapAddress, mapOffer, mapOrder, mapProduct } from './mappers';
import type { Address, Offer, Order, Product } from '../data/mock';

export type Category = { id: string; name: string; parent?: string | null };
export type ProductQuery = { page?: number; limit?: number; search?: string; category?: string; sort?: string; onOffer?: boolean; maxPrice?: number; storeManagerId?: string };

/** One slide of the store's offer carousel (GET /offers/carousel). */
export type CarouselSlide = {
  id: string; title: string; highlight: string; description: string; offerText: string; image?: string; ctaText: string;
  features: string[]; theme: string; storeManagerId?: string;
  redirectType: 'store' | 'category' | 'product' | 'external' | string; redirectValue?: string;
  /** Hand-picked products for a "product" offer - the store manager can tick several. */
  redirectProducts: string[];
};
export type Paged<T> = { items: T[]; page: number; totalPages: number; total: number };

export type CartLine = { product: Product; qty: number };
export type CartPayload = { lines: CartLine[]; total: number };

export type CouponState = { appliedCode: string; couponDiscount: number; offers: Offer[]; removedReason: string };
export type Quote = { shippingCharge: number; discount: number; totalAmount: number; subtotal: number; etaDays: number | null; courierName: string | null; mode: string };

const couponState = (d: any): CouponState => ({
  appliedCode: d.appliedCode || '',
  couponDiscount: d.couponDiscount || 0,
  offers: (d.offers || []).map(mapOffer),
  removedReason: d.removedReason || '',
});

export const productsService = {
  async categories(): Promise<Category[]> {
    const { data } = await api.get('/categories');
    return (data.categories || []).map((c: any) => ({ id: String(c._id), name: c.name, parent: c.parent ? String(c.parent) : null }));
  },
  async list(q: ProductQuery = {}): Promise<Paged<Product>> {
    const { data } = await api.get('/products/store', {
      params: {
        page: q.page ?? 1, limit: q.limit ?? 12, search: q.search || undefined, category: q.category || undefined, sort: q.sort || undefined,
        maxPrice: q.maxPrice || undefined, storeManagerId: q.storeManagerId || undefined, onOffer: q.onOffer ? 'true' : undefined,
      },
    });
    const pg = data.pagination || {};
    return { items: (data.products || []).map(mapProduct), page: pg.currentPage ?? 1, totalPages: pg.totalPages ?? 1, total: pg.totalProducts ?? 0 };
  },
  async get(id: string): Promise<{ product: Product; related: Product[] }> {
    const { data } = await api.get(`/products/store/${id}`);
    return { product: mapProduct(data.product), related: (data.relatedProducts || []).map(mapProduct) };
  },
  /** Live pets are bought by contacting the store, not through the cart. */
  async petContact(id: string): Promise<{ petName: string; storeName: string; phone: string; email: string; petCount: number }> {
    const { data } = await api.get(`/products/store/${id}/contact`);
    return data.contact;
  },
};

export const offersService = {
  /** Banner offers shown at the top of the store. */
  async carousel(): Promise<CarouselSlide[]> {
    const { data } = await api.get('/offers/carousel');
    return (data.offers || []).map((o: any): CarouselSlide => ({
      id: String(o._id || o.id || o.title),
      title: o.title || '',
      highlight: o.highlight || '',
      description: o.description || '',
      offerText: o.offerText || '',
      image: absUrl(o.productImage),
      ctaText: o.buttonText || 'Explore Now',
      features: (o.features || []).map((f: any) => (typeof f === 'string' ? f : f?.text)).filter(Boolean),
      theme: o.theme || 'orange',
      storeManagerId: o.storeManagerId ? String(o.storeManagerId._id || o.storeManagerId) : undefined,
      redirectType: o.redirectType || 'store',
      redirectValue: o.redirectValue || undefined,
      // newer offers carry a list; older ones only have a single redirectValue
      redirectProducts: ((o.redirectProducts?.length ? o.redirectProducts : o.redirectType === 'product' && o.redirectValue ? [o.redirectValue] : []) as any[])
        .map((x) => String(x?._id ?? x?.id ?? x)).filter(Boolean),
    }));
  },
};

export const cartService = {
  async get(): Promise<CartPayload> {
    const { data } = await api.get('/cart');
    const lines: CartLine[] = (data.cart?.items || [])
      .filter((i: any) => i.productId && typeof i.productId === 'object')
      .map((i: any) => ({ product: mapProduct(i.productId), qty: i.quantity }));
    return { lines, total: data.totalAmount || 0 };
  },
  async add(productId: string, quantity = 1) {
    await api.post('/cart', { productId, quantity });
  },
  async setQty(productId: string, quantity: number) {
    await api.put(`/cart/${productId}`, { quantity });
  },
  async remove(productId: string) {
    await api.delete(`/cart/${productId}`);
  },
  async clear() {
    await api.delete('/cart');
  },

  /* coupons live on the cart on the server */
  async coupons(): Promise<CouponState> {
    const { data } = await api.get('/offers/cart');
    return couponState(data);
  },
  async applyCoupon(code: string): Promise<CouponState> {
    const { data } = await api.post('/offers/cart/apply', { code });
    return couponState(data);
  },
  async removeCoupon(): Promise<CouponState> {
    const { data } = await api.delete('/offers/cart/apply');
    return couponState(data);
  },
};

export const wishlistService = {
  async get(): Promise<Product[]> {
    const { data } = await api.get('/wishlist');
    return (data.wishlist?.products || []).filter(Boolean).map(mapProduct);
  },
  async add(productId: string) {
    await api.post('/wishlist', { productId });
  },
  async remove(productId: string) {
    await api.delete(`/wishlist/${productId}`);
  },
};

export type AddressInput = Omit<Address, 'id'> & { id?: string };
const toAddressBody = (a: AddressInput) => ({
  fullName: a.fullName, phone: a.phone, doorNo: a.doorNo, landmark: a.landmark || '',
  placeId: a.placeId || '', formattedAddress: a.formattedAddress, latitude: a.latitude, longitude: a.longitude,
  area: a.area, city: a.city, district: a.district || '', state: a.state, country: a.country || 'India',
  pincode: a.pincode, addressType: a.addressType, isDefault: a.isDefault,
});
export const addressService = {
  async list(): Promise<Address[]> {
    const { data } = await api.get('/addresses');
    return (data.addresses || []).map(mapAddress);
  },
  async save(a: AddressInput): Promise<Address> {
    const body = toAddressBody(a);
    const { data } = a.id ? await api.put(`/addresses/${a.id}`, body) : await api.post('/addresses', body);
    return mapAddress(data.address);
  },
  async remove(id: string) {
    await api.delete(`/addresses/${id}`);
  },
  async setDefault(id: string) {
    await api.patch(`/addresses/${id}/default`);
  },
};

export const ordersService = {
  async list(): Promise<Order[]> {
    const { data } = await api.get('/orders/my-orders');
    return (data.orders || []).map(mapOrder);
  },
  async get(id: string): Promise<Order> {
    const { data } = await api.get(`/orders/${id}`);
    const order = mapOrder(data.order);
    // /orders/:id also returns OrderItem snapshots (name + image) - use them so the screen never shows blanks
    const snap: Record<string, any> = {};
    (data.items || []).forEach((i: any) => (snap[String(i.productId)] = i));
    order.items = order.items.map((i) => ({ ...i, name: i.name || snap[i.productId]?.productName, image: i.image || snap[i.productId]?.productImage }));
    return order;
  },
  /** Delivery charge + total as the server will charge it - use this number on the checkout screen. */
  async quote(addressId: string, paymentMethod: 'Cash on Delivery' | 'Razorpay'): Promise<Quote> {
    const { data } = await api.get('/orders/delivery-quote', { params: { addressId, paymentMethod } });
    const q = data.quote;
    return { shippingCharge: q.shippingCharge, discount: q.discount, totalAmount: q.totalAmount, subtotal: q.subtotal, etaDays: q.estimatedDeliveryDays, courierName: q.courierName, mode: q.mode };
  },
  async placeCod(addressId: string, expectedTotal: number): Promise<Order> {
    const { data } = await api.post('/orders/place-order', { addressId, paymentMethod: 'Cash on Delivery', expectedTotal });
    return mapOrder(data.order);
  },
  async initiateOnline(addressId: string, expectedTotal: number) {
    const { data } = await api.post('/orders/payment/initiate', { addressId, expectedTotal }, { timeout: 40000 });
    return data as { order: { id: string; amount: number; currency: string }; keyId: string };
  },
  async verifyOnline(p: { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string }): Promise<Order> {
    const { data } = await api.post('/orders/payment/verify', p, { timeout: 40000 });
    return mapOrder(data.order);
  },
  async cancel(id: string) {
    await api.patch(`/orders/${id}/cancel`);
  },
  async tracking(id: string): Promise<{ status: string; activities: { activity: string; location: string; time: string }[] }> {
    const { data } = await api.get(`/orders/${id}/tracking`);
    return {
      status: data.status,
      activities: (data.activities || []).map((a: any) => ({
        activity: a.activity || a.status || a['sr-status-label'] || 'Update',
        location: a.location || '',
        time: a.date || a.time || '',
      })),
    };
  },
};

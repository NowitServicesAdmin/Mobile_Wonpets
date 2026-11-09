/**
 * Every store-manager endpoint the web portal uses (services/storeManage/* on the web), with the
 * responses turned into small typed shapes for the mobile screens.
 */
import { api, fileFromUri } from './api';
import { absUrl } from './mappers';

const num = (v: any, d = 0) => (Number.isFinite(Number(v)) ? Number(v) : d);
const idOf = (v: any): string => (v && typeof v === 'object' ? String(v._id ?? v.id ?? '') : String(v ?? ''));
const multipart = { headers: { 'Content-Type': 'multipart/form-data' }, timeout: 90000 };
/** One failing widget must never blank the whole dashboard. */
const soft = <T,>(p: Promise<T>): Promise<T | null> => p.catch(() => null);

/* ================================ products ================================ */
export type StockStatus = 'In Stock' | 'Low Stock' | 'Out Of Stock';
/** Same rule as the web: 0 = out, 1-50 = low, above 50 = in stock. */
export const LOW_STOCK_LIMIT = 50;
export const stockStatus = (stock: number): StockStatus => (stock <= 0 ? 'Out Of Stock' : stock <= LOW_STOCK_LIMIT ? 'Low Stock' : 'In Stock');

export type SMProduct = {
  id: string; productId?: string; name: string; itemType: 'product' | 'pet';
  categoryId: string; categoryName: string;
  price: number; discount: number; finalPrice: number; stock: number; weight: number;
  status: 'Active' | 'Inactive'; description: string;
  breed: string; age: string; gender: string;
  images: string[]; rating: number; reviews: number; createdAt?: string;
};
export function mapSMProduct(p: any): SMProduct {
  const cat = p.category && typeof p.category === 'object' ? p.category : null;
  const price = num(p.price);
  const discount = num(p.discount);
  return {
    id: idOf(p), productId: p.productId, name: p.name || '', itemType: p.itemType === 'pet' ? 'pet' : 'product',
    categoryId: cat ? idOf(cat) : String(p.category || ''), categoryName: p.categoryName || cat?.name || '',
    price, discount, finalPrice: discount > 0 ? num(p.discountPrice, price - (price * discount) / 100) : price,
    stock: num(p.stock), weight: num(p.weight), status: p.status === 'Inactive' ? 'Inactive' : 'Active',
    description: p.description || '', breed: p.breed || '', age: p.age ? String(p.age) : '', gender: p.gender || '',
    images: (p.images || []).map(absUrl).filter(Boolean) as string[],
    rating: num(p.averageRating), reviews: num(p.totalReviews), createdAt: p.createdAt,
  };
}
export type ProductInput = {
  itemType: 'product' | 'pet'; name: string; category: string; price: string; discount: string; stock: string;
  weight: string; status: 'Active' | 'Inactive'; description: string; breed: string; age: string; gender: string;
};
export const emptyProduct: ProductInput = { itemType: 'product', name: '', category: '', price: '', discount: '', stock: '', weight: '', status: 'Active', description: '', breed: '', age: '', gender: '' };

const productForm = (p: ProductInput, newImages: string[]) => {
  const f = new FormData();
  f.append('itemType', p.itemType);
  f.append('name', p.name.trim());
  f.append('category', p.category);
  f.append('price', p.price);
  f.append('discount', p.discount || '0');
  f.append('stock', p.stock);
  f.append('weight', p.weight || '0');
  f.append('status', p.status);
  f.append('description', p.description);
  if (p.itemType === 'pet') { f.append('breed', p.breed.trim()); f.append('age', p.age.trim()); f.append('gender', p.gender); }
  newImages.forEach((uri, i) => f.append('images', fileFromUri(uri, `product-${i + 1}`)));
  return f;
};

/* =============================== categories =============================== */
export type SMCategory = { id: string; name: string; description: string; type: 'pet' | 'product'; parent: string; products: number; subcategoryCount: number };
const mapCategory = (c: any): SMCategory => ({
  id: idOf(c), name: c.name || '', description: c.description || '', type: c.type === 'pet' ? 'pet' : 'product',
  parent: c.parent ? idOf(c.parent) : '', products: num(c.productCount), subcategoryCount: num(c.subcategoryCount),
});
export type CategoryInput = { name: string; description: string; type: 'pet' | 'product'; parent: string };

/* ================================= orders ================================= */
export type SMOrderStatus = 'Pending' | 'Processing' | 'Shipped' | 'Delivered' | 'Cancelled';
export type SMShipping = {
  mode?: string; status?: string; awbCode?: string; courierName?: string; shiprocketStatus?: string; trackUrl?: string;
  remarks?: string; pickupScheduled?: boolean; pickupSource?: string; sandbox?: boolean; distanceKm?: number | null;
};
export type SMOrder = {
  id: string; orderId: string; status: SMOrderStatus; createdAt: string;
  customer: { name: string; email: string; phone: string; image?: string };
  items: { id: string; name: string; image?: string; qty: number; price: number }[];
  subtotal: number; deliveryCharge: number; shippingCharge: number; discount: number; total: number;
  paymentMethod: string; paymentStatus: string; couponCode?: string;
  address?: { fullName: string; phone: string; doorNo: string; formattedAddress: string; landmark?: string };
  shipping: SMShipping | null;
};
export function mapSMOrder(o: any): SMOrder {
  const c = o.customerId && typeof o.customerId === 'object' ? o.customerId : {};
  const a = o.shippingAddress;
  return {
    id: idOf(o), orderId: o.orderId || idOf(o).slice(-6).toUpperCase(), status: (o.status || 'Pending') as SMOrderStatus, createdAt: o.createdAt,
    customer: { name: c.name || 'Customer', email: c.email || '', phone: c.phone || '', image: absUrl(c.profileImage) },
    items: (o.products || []).map((i: any, k: number) => {
      const p = i.productId && typeof i.productId === 'object' ? i.productId : null;
      return { id: i._id || `${k}`, name: p?.name || 'Product', image: absUrl(p?.primaryImage || p?.images?.[0]), qty: num(i.quantity, 1), price: num(i.price) };
    }),
    subtotal: num(o.subtotal), deliveryCharge: num(o.deliveryCharge), shippingCharge: num(o.shippingCharge), discount: num(o.discount), total: num(o.totalAmount),
    paymentMethod: o.paymentMethod === 'Razorpay' ? 'Online payment' : o.paymentMethod ? (o.paymentMethod === 'COD' ? 'Cash on delivery' : o.paymentMethod) : 'Cash on delivery',
    paymentStatus: o.paymentStatus || '', couponCode: o.couponCode || undefined,
    address: a ? { fullName: a.fullName || '', phone: a.phone || '', doorNo: a.doorNo || '', formattedAddress: a.formattedAddress || [a.area, a.city, a.state, a.pincode].filter(Boolean).join(', '), landmark: a.landmark || undefined } : undefined,
    shipping: o.shipping || null,
  };
}
export type OrderSummary = { totalOrders: number; pending: number; processing: number; delivered: number; cancelled: number; revenue: number };
export type OrderAction = 'accept' | 'ship' | 'deliver' | 'cancel';
/** True when the courier (not the store) will move this order from Shipped to Delivered. */
export const courierHandles = (o: SMOrder) => o.shipping?.mode === 'shiprocket' && !!o.shipping?.awbCode && !o.shipping?.sandbox;

/* ================================= offers ================================= */
export type OfferStatus = 'Active' | 'Scheduled' | 'Expired' | 'Disabled';
export type SMOffer = {
  id: string; title: string; highlight: string; description: string; code: string;
  discountType: 'Percentage' | 'Flat'; discount: number; minimumOrderAmount: number; maximumDiscount: number;
  startDate: string; endDate: string; maxUsage: number; usagePerUser: number; usedCount: number;
  theme: string; offerText: string; buttonText: string; redirectType: string; redirectValue: string; redirectProducts: string[];
  features: string[]; productImage?: string; isActive: boolean; status: OfferStatus;
};
/** Same rule as the web page (getCouponStatus). */
export const offerStatus = (o: { isActive: boolean; startDate: string; endDate: string }): OfferStatus => {
  if (!o.isActive) return 'Disabled';
  const now = new Date();
  if (o.startDate && now < new Date(o.startDate)) return 'Scheduled';
  if (o.endDate && now > new Date(o.endDate)) return 'Expired';
  return 'Active';
};
const mapOffer = (o: any): SMOffer => {
  const base = {
    id: idOf(o), title: o.title || '', highlight: o.highlight || '', description: o.description || '', code: o.code || '',
    discountType: (o.discountType === 'Flat' ? 'Flat' : 'Percentage') as SMOffer['discountType'], discount: num(o.discount),
    minimumOrderAmount: num(o.minimumOrderAmount), maximumDiscount: num(o.maximumDiscount),
    startDate: o.startDate || '', endDate: o.endDate || '', maxUsage: num(o.maxUsage), usagePerUser: num(o.usagePerUser), usedCount: num(o.usedCount),
    theme: o.theme || 'orange', offerText: o.offerText || '', buttonText: o.buttonText || 'Shop Now',
    redirectType: o.redirectType || 'store', redirectValue: o.redirectValue || '',
    redirectProducts: (o.redirectProducts || []).map(idOf), features: Array.isArray(o.features) ? o.features : [],
    productImage: absUrl(o.productImage), isActive: o.isActive !== false,
  };
  return { ...base, status: offerStatus(base) };
};
export type OfferInput = {
  title: string; highlight: string; description: string; code: string; discountType: 'Percentage' | 'Flat'; discount: string;
  minimumOrderAmount: string; maximumDiscount: string; startDate: string; endDate: string; maxUsage: string; usagePerUser: string;
  theme: string; offerText: string; buttonText: string; redirectType: string; redirectValue: string; redirectProducts: string[];
  features: string; isActive: boolean;
};
export const emptyOffer: OfferInput = {
  title: '', highlight: '', description: '', code: '', discountType: 'Percentage', discount: '', minimumOrderAmount: '', maximumDiscount: '',
  startDate: '', endDate: '', maxUsage: '', usagePerUser: '', theme: 'orange', offerText: '', buttonText: 'Shop Now',
  redirectType: 'store', redirectValue: '', redirectProducts: [], features: '', isActive: true,
};
export const offerToInput = (o: SMOffer): OfferInput => ({
  title: o.title, highlight: o.highlight, description: o.description, code: o.code, discountType: o.discountType,
  discount: o.discount ? String(o.discount) : '', minimumOrderAmount: o.minimumOrderAmount ? String(o.minimumOrderAmount) : '',
  maximumDiscount: o.maximumDiscount ? String(o.maximumDiscount) : '', startDate: o.startDate?.split('T')[0] || '', endDate: o.endDate?.split('T')[0] || '',
  maxUsage: o.maxUsage ? String(o.maxUsage) : '', usagePerUser: o.usagePerUser ? String(o.usagePerUser) : '', theme: o.theme, offerText: o.offerText,
  buttonText: o.buttonText, redirectType: o.redirectType, redirectValue: o.redirectValue,
  // older offers only have a single redirectValue
  redirectProducts: o.redirectProducts.length ? o.redirectProducts : o.redirectType === 'product' && o.redirectValue ? [o.redirectValue] : [],
  features: o.features.join(', '), isActive: o.isActive,
});
const offerForm = (o: OfferInput, imageUri?: string) => {
  const f = new FormData();
  (Object.keys(o) as (keyof OfferInput)[]).forEach((k) => {
    const v = o[k];
    if (k === 'redirectProducts') f.append(k, JSON.stringify(o.redirectType === 'product' ? v : []));
    else if (k === 'redirectValue' && o.redirectType === 'product') f.append(k, o.redirectProducts[0] || '');
    else if (k === 'features') f.append(k, JSON.stringify(String(v).split(',').map((s) => s.trim()).filter(Boolean)));
    else f.append(k, String(v));
  });
  if (imageUri) f.append('productImage', fileFromUri(imageUri, 'offer'));
  return f;
};

/* ============================ dashboard / reports ============================ */
export type SMDashboard = {
  stats: { revenue: number; totalOrders: number; totalProducts: number; totalCustomers: number };
  recentOrders: SMOrder[];
  inventory: { inStock: number; lowStock: number; outOfStock: number };
  orderStatus: { pending: number; processing: number; shipped: number; delivered: number };
  revenue: { label: string; value: number }[];
  topProducts: { id: string; name: string; price: number; sold: number; revenue: number }[];
  lowStock: SMProduct[];
  offerStats: { total: number; active: number; scheduled: number; expired: number; usage: number };
  topOffers: SMOffer[];
};
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
export type Overview = { products: number; categories: number; inventory: number; orders: number; customers: number; reviews: number; offers: number };

export type ReportMonth = { month: string; revenue: number; orders: number; products: number; customers: number };
export type Reports = {
  summary: { revenue: number; orders: number; productsSold: number; customers: number };
  monthly: ReportMonth[];
  topProducts: { id: string; name: string; sold: number; revenue: number }[];
};

export type EarningsStat = { value: number; change: number | null; spark: number[] };
export type Earnings = {
  stats: Record<'revenue' | 'orders' | 'net' | 'payouts' | 'pending', EarningsStat>;
  trend: { data: { label: string; value: number }[]; periodTotal: number; change: number | null; average: number; peak: number };
  breakdown: { name: string; value: number; color: string }[];
  summary: { totalRevenue: number; netEarnings: number; totalPayouts: number; pendingPayout: number; platformFees: number; codCollected: number };
  successRate: number;
  weekly: { revenue: number; change: number | null };
  transactions: { orderId: string; date: string; status: string; paymentMethod: string; paymentStatus: string; gross: number; platformFee: number; net: number; payoutStatus: string }[];
};
const stat = (s: any): EarningsStat => ({ value: num(s?.value), change: s?.change ?? null, spark: (s?.spark || []).map((x: any) => num(x)) });

export type Customer = { id: string; name: string; email: string; image?: string; orders: number; totalSpent: number; status: string; joinedAt?: string };
export type SMReview = { id: string; customer: string; product: string; rating: number; text: string; status: 'Pending' | 'Approved' | 'Rejected'; createdAt: string };
export type Pickup = {
  status: 'not_set' | 'not_synced' | 'pending_verification' | 'active' | 'failed';
  shippingEnabled: boolean; addressComplete: boolean;
  contact?: string; lines?: string; lastError?: string;
};
const mapPickup = (d: any): Pickup => {
  const p = d?.pickupLocation;
  return {
    status: p?.status || 'not_set', shippingEnabled: d?.shippingEnabled !== false, addressComplete: d?.addressComplete !== false,
    contact: p ? [p.contactName, p.phone].filter(Boolean).join(' · ') : undefined,
    lines: p ? [p.address, p.address2, [p.city, p.state].filter(Boolean).join(', '), p.pincode].filter(Boolean).join(', ') : undefined,
    lastError: p?.lastError,
  };
};

/* ================================== API =================================== */
export const smService = {
  /* ---- dashboard ---- */
  async dashboard(): Promise<SMDashboard> {
    const [d, rev, top, low, os, to] = await Promise.all([
      api.get('/stores/dashboard').then((r) => r.data), // the main card must load - let this one throw
      soft(api.get('/stores/monthly-revenue').then((r) => r.data)),
      soft(api.get('/stores/top-products').then((r) => r.data)),
      soft(api.get('/stores/low-stock').then((r) => r.data)),
      soft(api.get('/offers/stats').then((r) => r.data)),
      soft(api.get('/offers/top').then((r) => r.data)),
    ]);
    const s = d?.stats || {};
    return {
      stats: { revenue: num(s.revenue), totalOrders: num(s.totalOrders), totalProducts: num(s.totalProducts), totalCustomers: num(s.totalCustomers) },
      recentOrders: (d?.recentOrders || []).map(mapSMOrder),
      inventory: { inStock: num(d?.inventory?.inStock), lowStock: num(d?.inventory?.lowStock), outOfStock: num(d?.inventory?.outOfStock) },
      orderStatus: { pending: num(d?.orderStatus?.pending), processing: num(d?.orderStatus?.processing), shipped: num(d?.orderStatus?.shipped), delivered: num(d?.orderStatus?.delivered) },
      revenue: (rev?.revenue || []).map((r: any) => ({ label: MONTHS[num(r.month, 1) - 1] || String(r.month), value: num(r.revenue) })),
      topProducts: (top?.products || []).filter((t: any) => t.product).map((t: any) => ({ id: idOf(t.product), name: t.product.name || 'Product', price: num(t.product.price), sold: num(t.totalSold), revenue: num(t.revenue) })),
      lowStock: (low?.products || []).map(mapSMProduct),
      offerStats: { total: num(os?.totalOffers), active: num(os?.activeOffers), scheduled: num(os?.scheduledOffers), expired: num(os?.expiredOffers), usage: num(os?.totalUsage) },
      topOffers: (to?.offers || []).map(mapOffer),
    };
  },
  async overview(): Promise<Overview> {
    const { data } = await api.get('/stores/management-overview');
    const o = data.overview || {};
    return { products: num(o.products), categories: num(o.categories), inventory: num(o.inventory), orders: num(o.orders), customers: num(o.customers), reviews: num(o.reviews), offers: num(o.offers) };
  },

  /* ---- products / inventory ---- */
  async products(): Promise<SMProduct[]> {
    // the backend pages by 10 by default - ask for everything like the web Products page does
    const { data } = await api.get('/products', { params: { limit: 1000 } });
    return (data.products || []).map(mapSMProduct);
  },
  async product(id: string): Promise<SMProduct> {
    const { data } = await api.get(`/products/${id}`);
    return mapSMProduct(data.product);
  },
  async createProduct(p: ProductInput, images: string[]) {
    const { data } = await api.post('/products', productForm(p, images), multipart);
    return data as { message?: string };
  },
  async updateProduct(id: string, p: ProductInput, newImages: string[]) {
    const { data } = await api.put(`/products/${id}`, productForm(p, newImages), multipart);
    return data as { message?: string };
  },
  async deleteProduct(id: string) {
    const { data } = await api.delete(`/products/${id}`);
    return data as { message?: string };
  },
  async updateStock(id: string, stock: number, status: 'Active' | 'Inactive') {
    const { data } = await api.patch(`/products/${id}/stock`, { stock, status });
    return data as { message?: string };
  },

  /* ---- categories ---- */
  async categories(): Promise<SMCategory[]> {
    const { data } = await api.get('/categories');
    return (data.categories || []).map(mapCategory);
  },
  async createCategory(c: CategoryInput) {
    const { data } = await api.post('/categories', { ...c, name: c.name.trim(), parent: c.type === 'pet' ? c.parent : '' });
    return data as { message?: string; category?: any };
  },
  async updateCategory(id: string, c: CategoryInput) {
    const { data } = await api.put(`/categories/${id}`, { ...c, name: c.name.trim(), parent: c.type === 'pet' ? c.parent : '' });
    return data as { message?: string };
  },
  async deleteCategory(id: string) {
    const { data } = await api.delete(`/categories/${id}`);
    return data as { message?: string };
  },

  /* ---- orders ---- */
  async orders(): Promise<SMOrder[]> {
    const { data } = await api.get('/store-orders');
    return (data.orders || []).map(mapSMOrder);
  },
  async orderSummary(): Promise<OrderSummary> {
    const { data } = await api.get('/store-orders/dashboard');
    const d = data.dashboard || {};
    return { totalOrders: num(d.totalOrders), pending: num(d.pending), processing: num(d.processing), delivered: num(d.delivered), cancelled: num(d.cancelled), revenue: num(d.revenue) };
  },
  async order(id: string): Promise<SMOrder> {
    const { data } = await api.get(`/store-orders/${id}`);
    return mapSMOrder(data.order);
  },
  /** accept / ship (request pickup) / deliver / cancel. `warning` = e.g. accepted but the courier shipment needs attention. */
  async orderAction(id: string, action: OrderAction): Promise<{ message?: string; warning?: string }> {
    const { data } = await api.patch(`/store-orders/${id}/${action}`);
    return data;
  },
  async retryShipment(id: string): Promise<{ success: boolean; message?: string }> {
    const { data } = await api.post(`/store-orders/${id}/shipment/retry`);
    return data;
  },
  async shipmentLabel(id: string): Promise<{ labelUrl?: string; message?: string }> {
    const { data } = await api.get(`/store-orders/${id}/label`);
    return data;
  },
  async refreshTracking(id: string) {
    const { data } = await api.get(`/store-orders/${id}/tracking`);
    return data;
  },

  /* ---- customers / reviews ---- */
  async customers(): Promise<{ customers: Customer[]; stats: { total: number; active: number; newThisMonth: number; returning: number } }> {
    const { data } = await api.get('/stores/customers');
    const s = data.stats || {};
    return {
      customers: (data.customers || []).map((c: any) => ({ id: idOf(c), name: c.name || 'Customer', email: c.email || '', image: absUrl(c.profileImage), orders: num(c.orders), totalSpent: num(c.totalSpent), status: c.status || 'Active', joinedAt: c.joinedAt })),
      stats: { total: num(s.totalCustomers), active: num(s.activeCustomers), newThisMonth: num(s.newThisMonth), returning: num(s.returningCustomers) },
    };
  },
  async reviews(): Promise<{ reviews: SMReview[]; stats: { average: number; pending: number; approved: number; rejected: number; total: number } }> {
    const { data } = await api.get('/reviews/store-manager');
    const s = data.stats || {};
    return {
      reviews: (data.reviews || []).map((r: any) => ({ id: idOf(r), customer: r.customerId?.name || 'Customer', product: r.productId?.name || 'Product', rating: num(r.rating), text: r.review || '', status: r.status || 'Pending', createdAt: r.createdAt })),
      stats: { average: Math.round(num(s.averageRating) * 10) / 10, pending: num(s.pending), approved: num(s.approved), rejected: num(s.rejected), total: num(s.total) },
    };
  },
  approveReview: (id: string) => api.patch(`/reviews/approve/${id}`).then((r) => r.data),
  rejectReview: (id: string) => api.patch(`/reviews/reject/${id}`).then((r) => r.data),

  /* ---- offers ---- */
  async offers(): Promise<SMOffer[]> {
    const { data } = await api.get('/offers');
    return (data.offers || []).map(mapOffer);
  },
  async offerStats() {
    const { data } = await api.get('/offers/stats');
    return { active: num(data.activeOffers), scheduled: num(data.scheduledOffers), expired: num(data.expiredOffers), usage: num(data.totalUsage), total: num(data.totalOffers) };
  },
  async offer(id: string): Promise<SMOffer> {
    const { data } = await api.get(`/offers/${id}`);
    return mapOffer(data.offer || data);
  },
  async createOffer(o: OfferInput, imageUri?: string) {
    const { data } = await api.post('/offers', offerForm(o, imageUri), multipart);
    return data as { message?: string };
  },
  async updateOffer(id: string, o: OfferInput, imageUri?: string) {
    const { data } = await api.put(`/offers/${id}`, offerForm(o, imageUri), multipart);
    return data as { message?: string };
  },
  deleteOffer: (id: string) => api.delete(`/offers/${id}`).then((r) => r.data),
  toggleOffer: (id: string) => api.patch(`/offers/${id}/status`).then((r) => r.data),

  /* ---- reports / earnings ---- */
  async reports(): Promise<Reports> {
    const [s, c, t] = await Promise.all([
      api.get('/store-orders/report-summary').then((r) => r.data),
      soft(api.get('/store-orders/report-chart').then((r) => r.data)),
      soft(api.get('/store-orders/report-top-products').then((r) => r.data)),
    ]);
    const sum = s?.summary || {};
    return {
      summary: { revenue: num(sum.revenue), orders: num(sum.orders), productsSold: num(sum.productsSold), customers: num(sum.customers) },
      monthly: (c?.data || []).map((m: any) => ({ month: String(m.month), revenue: num(m.revenue), orders: num(m.orders), products: num(m.products), customers: num(m.customers) })),
      topProducts: (t?.products || []).map((p: any, i: number) => ({ id: idOf(p.product) || `${i}`, name: p.product?.name || 'Product deleted', sold: num(p.sold), revenue: num(p.revenue) })),
    };
  },
  async earnings(range: 7 | 30 | 90): Promise<Earnings> {
    const { data } = await api.get('/stores/earnings', { params: { range } });
    const s = data.stats || {};
    const t = data.revenueTrend || {};
    const sm = data.summary || {};
    return {
      stats: { revenue: stat(s.revenue), orders: stat(s.orders), net: stat(s.net), payouts: stat(s.payouts), pending: stat(s.pending) },
      trend: { data: (t.data || []).map((d: any) => ({ label: String(d.name ?? ''), value: num(d.value) })), periodTotal: num(t.periodTotal), change: t.change ?? null, average: num(t.average), peak: num(t.peak) },
      breakdown: (data.breakdown || []).map((b: any) => ({ name: b.name, value: num(b.value), color: b.color || '#F97316' })),
      summary: { totalRevenue: num(sm.totalRevenue), netEarnings: num(sm.netEarnings), totalPayouts: num(sm.totalPayouts), pendingPayout: num(sm.pendingPayout), platformFees: num(sm.platformFees), codCollected: num(sm.codCollected) },
      successRate: num(data.successRate),
      weekly: { revenue: num(data.weekly?.revenue), change: data.weekly?.change ?? null },
      transactions: (data.transactions || []).map((r: any) => ({ orderId: r.orderId, date: r.date, status: r.status, paymentMethod: r.paymentMethod, paymentStatus: r.paymentStatus, gross: num(r.gross), platformFee: num(r.platformFee), net: num(r.net), payoutStatus: r.payoutStatus })),
    };
  },

  /* ---- courier pickup (address itself comes from Additional Information) ---- */
  async pickup(): Promise<Pickup> { const { data } = await api.get('/stores/pickup-location'); return mapPickup(data); },
  async syncPickup(): Promise<Pickup> { const { data } = await api.post('/stores/pickup-location/sync'); return mapPickup(data); },
};

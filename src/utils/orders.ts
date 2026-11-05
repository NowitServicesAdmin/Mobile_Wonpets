import type { Offer, OrderStatus } from '../data/mock';
import type { Tone } from '../components/ui';

/** Only a fallback label - the real delivery charge and ETA come from the server quote at checkout. */
export const DELIVERY_ETA = 'Delivery time is confirmed at checkout';

export const inr = (n: number) => `₹${Number(n.toFixed(2)).toLocaleString('en-IN')}`;

export const statusTone: Record<OrderStatus, Tone> = { Pending: 'orange', Processing: 'blue', Shipped: 'purple', Delivered: 'green', Cancelled: 'red' };

export const fmtDateTime = (iso?: string) =>
  iso ? new Date(iso).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '';

export const fmtShortDate = (iso: string) => new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });

export const describeOffer = (o: Offer) => {
  const value = o.discountType === 'Percentage' ? `${o.discount}% off${o.maximumDiscount ? ` (up to ${inr(o.maximumDiscount)})` : ''}` : `${inr(o.discount)} off`;
  return o.minimumOrderAmount > 0 ? `${value} on orders of ${inr(o.minimumOrderAmount)} or more` : value;
};

/** Is the coupon usable for this subtotal, and how much would it save? */
export function evaluateOffer(o: Offer, subtotal: number) {
  if (new Date(o.endDate).getTime() < Date.now()) return { applicable: false, discountAmount: 0, reason: 'This offer has expired' };
  if (subtotal < o.minimumOrderAmount) return { applicable: false, discountAmount: 0, reason: `Add ${inr(o.minimumOrderAmount - subtotal)} more to use this offer` };
  let amount = o.discountType === 'Percentage' ? (subtotal * o.discount) / 100 : o.discount;
  if (o.discountType === 'Percentage' && o.maximumDiscount) amount = Math.min(amount, o.maximumDiscount);
  return { applicable: true, discountAmount: Math.min(Math.round(amount), subtotal), reason: '' };
}

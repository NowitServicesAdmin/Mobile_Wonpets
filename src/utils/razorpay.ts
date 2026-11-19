import { NativeModules, TurboModuleRegistry } from 'react-native';

export type RazorpayResult = { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string };

export class PaymentCancelled extends Error {
  constructor() { super('Payment was cancelled.'); }
}

export type RazorpayOptions = {
  keyId: string;
  orderId: string;
  amountPaise: number;
  title: string;
  description: string;
  prefill?: { name?: string; email?: string; contact?: string };
};

/** True only when the native Razorpay module is actually present in this binary. */
function hasNativeRazorpay(): boolean {
  try {
    if (NativeModules?.RNRazorpayCheckout) return true;
    const t: any = (TurboModuleRegistry as any)?.get?.('RNRazorpayCheckout');
    return !!t;
  } catch {
    return false;
  }
}

type WebRequest = { opts: RazorpayOptions; resolve: (r: RazorpayResult) => void; reject: (e: Error) => void };
let webHandler: ((req: WebRequest) => void) | null = null;
export function registerRazorpayWebHost(fn: ((req: WebRequest) => void) | null) {
  webHandler = fn;
}

async function payNative(opts: RazorpayOptions): Promise<RazorpayResult> {
  const Checkout: any = require('react-native-razorpay').default;
  return Checkout.open({
    key: opts.keyId,
    order_id: opts.orderId,
    amount: opts.amountPaise,
    currency: 'INR',
    name: 'WON PET PRO',
    description: opts.description,
    prefill: opts.prefill,
    theme: { color: '#FF6B00' },
  });
}

function payWeb(opts: RazorpayOptions): Promise<RazorpayResult> {
  return new Promise((resolve, reject) => {
    if (!webHandler) {
      reject(new Error('Payment screen is not ready. Please restart the app and try again.'));
      return;
    }
    webHandler({ opts, resolve, reject });
  });
}

export async function payWithRazorpay(opts: RazorpayOptions): Promise<RazorpayResult> {
  try {
    if (hasNativeRazorpay()) return await payNative(opts);
    return await payWeb(opts);
  } catch (e: any) {
    if (e instanceof PaymentCancelled) throw e;
    if (e?.code === 0 || e?.code === 2 || /cancel/i.test(e?.description || '')) throw new PaymentCancelled();
    throw new Error(e?.description || e?.message || 'Payment failed. Please try again.');
  }
}
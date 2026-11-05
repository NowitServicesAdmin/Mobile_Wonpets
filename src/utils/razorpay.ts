/**
 * Razorpay checkout for appointments and store orders.
 *
 * Needs the native `react-native-razorpay` module, so it works in a development build / release build
 * (`npx expo prebuild` + `npx expo run:android`) - NOT in Expo Go. In Expo Go this throws a clear message.
 */
export type RazorpayResult = { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string };

export class PaymentCancelled extends Error {
  constructor() {
    super('Payment was cancelled.');
  }
}

export async function payWithRazorpay(opts: {
  keyId: string;
  orderId: string;
  amountPaise: number;
  title: string;
  description: string;
  prefill?: { name?: string; email?: string; contact?: string };
}): Promise<RazorpayResult> {
  let Checkout: any;
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    Checkout = require('react-native-razorpay').default;
  } catch {
    Checkout = null;
  }
  if (!Checkout?.open) {
    throw new Error('Online payment needs the full app build (not Expo Go). Run `npx expo run:android` / `run:ios`, or choose Cash on Delivery.');
  }
  try {
    return await Checkout.open({
      key: opts.keyId,
      order_id: opts.orderId,
      amount: opts.amountPaise,
      currency: 'INR',
      name: 'WON PET PRO',
      description: opts.description,
      prefill: opts.prefill,
      theme: { color: '#FF6B00' },
    });
  } catch (e: any) {
    // code 0 = user closed the sheet
    if (e?.code === 0 || e?.code === 2 || /cancel/i.test(e?.description || '')) throw new PaymentCancelled();
    throw new Error(e?.description || e?.message || 'Payment failed. Please try again.');
  }
}

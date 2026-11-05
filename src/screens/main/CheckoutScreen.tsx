import React, { useEffect, useState } from 'react';
import { Image, Pressable, ScrollView, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme';
import { Button, Card, Chip, Empty, T, cn } from '../../components/ui';
import AddressSheet from '../../components/store/AddressSheet';
import { toast } from '../../components/WonPetsAlert';
import { Address, PaymentMethod } from '../../data/mock';
import { useCart } from '../../context/CartContext';
import { inr } from '../../utils/orders';
import { ordersService, Quote } from '../../services/store.service';
import { errorMessage } from '../../services/api';
import { PaymentCancelled } from '../../utils/razorpay';
import { FormSkeleton } from '../../components/Skeletons';

const VISIBLE = 3;
const typeIcon = { Home: 'home', Work: 'briefcase', Other: 'location' } as const;
const payments: { id: PaymentMethod; title: string; desc: string; icon: React.ComponentProps<typeof Ionicons>['name']; badge?: string }[] = [
  { id: 'Online Payment', title: 'Online Payment', desc: 'UPI, Cards, Netbanking or Wallets', icon: 'phone-portrait', badge: 'Recommended' },
  { id: 'Cash on Delivery', title: 'Cash on Delivery', desc: 'Pay when your order arrives', icon: 'cash' },
];

function StepHeader({ n, title, subtitle, right }: { n: number; title: string; subtitle: string; right?: React.ReactNode }) {
  return (
    <View className="flex-row items-center gap-3 mb-3">
      <View className="w-8 h-8 rounded-full bg-primary items-center justify-center"><Text className="text-white font-bold">{n}</Text></View>
      <View className="flex-1"><Text className={T.h2}>{title}</Text><Text className={T.small}>{subtitle}</Text></View>
      {right}
    </View>
  );
}

const Radio = ({ on }: { on: boolean }) => (
  <View className={cn('w-5 h-5 rounded-full border-2 items-center justify-center', on ? 'border-primary' : 'border-gray-300')}>{on && <View className="w-2.5 h-2.5 rounded-full bg-primary" />}</View>
);

export default function CheckoutScreen({ navigation }: any) {
  const { cartItems, cartTotal, discount, couponCode, addresses, selectedAddressId, setSelectedAddressId, saveAddress, placeOrder, loaded } = useCart();
  const [quote, setQuote] = useState<Quote | null>(null);
  const [quoteError, setQuoteError] = useState('');
  const [payment, setPayment] = useState<PaymentMethod>('Online Payment');
  const [expanded, setExpanded] = useState(false);
  const [sheet, setSheet] = useState<{ open: boolean; address?: Address | null }>({ open: false });
  const [placing, setPlacing] = useState(false);

  const items = cartItems.map(({ product, qty }) => ({ p: product, qty }));
  const method = payment === 'Cash on Delivery' ? 'Cash on Delivery' : 'Razorpay';

  // delivery charge + total are decided by the server for this address and payment method
  useEffect(() => {
    if (!selectedAddressId || !cartItems.length) { setQuote(null); return; }
    let live = true;
    setQuote(null); setQuoteError('');
    ordersService.quote(selectedAddressId, method).then((q) => live && setQuote(q), (e) => live && setQuoteError(errorMessage(e)));
    return () => { live = false; };
  }, [selectedAddressId, method, cartItems.length, couponCode]);
  const total = quote?.totalAmount ?? cartTotal - discount;
  const ordered = expanded ? addresses : [...addresses].sort((a, b) => Number(b.id === selectedAddressId) - Number(a.id === selectedAddressId));
  const visible = expanded ? ordered : ordered.slice(0, VISIBLE);

  if (!items.length && !placing) return <View className="flex-1 bg-cream justify-center"><Empty emoji="🛒" title="Nothing to check out" body="Add something to your cart first." /></View>;

  const onPlace = async () => {
    if (!selectedAddressId) return toast.error('Please select a delivery address.');
    if (!quote) return toast.error(quoteError || 'Calculating delivery charges - please wait.');
    if (placing) return;
    setPlacing(true);
    try {
      const order = await placeOrder({ addressId: selectedAddressId, payment, expectedTotal: quote.totalAmount });
      navigation.replace('OrderSuccess', { orderId: order.id });
    } catch (e) {
      setPlacing(false);
      if (e instanceof PaymentCancelled) toast.info('Payment cancelled - your order was not placed.');
      else toast.error(errorMessage(e, 'Failed to place order.'));
    }
  };

  return (
    <View className="flex-1 bg-cream">
      <ScrollView contentContainerClassName="p-4 gap-4 pb-6" keyboardShouldPersistTaps="handled">
        <View><Text className={T.h1}>Checkout</Text><Text className={T.body}>Review your details and place your order.</Text></View>

        {/* 1. Address */}
        <Card>
          <StepHeader n={1} title="Delivery Address" subtitle="Where should we deliver your order?"
            right={<Pressable onPress={() => setSheet({ open: true, address: null })} className="flex-row items-center gap-1 bg-primary-soft rounded-lg px-3 py-2"><Ionicons name="add" size={14} color={colors.primary} /><Text className="text-primary font-bold text-xs">Add</Text></Pressable>} />
          {!loaded.addresses ? <FormSkeleton fields={2} /> : addresses.length === 0 ? (
            <View className="border border-dashed border-line rounded-2xl p-6 items-center gap-2">
              <Ionicons name="location" size={26} color={colors.primary} />
              <Text className={T.h3}>No address added yet</Text><Text className={T.small}>Add a delivery address to continue.</Text>
              <Button title="Add Address" onPress={() => setSheet({ open: true, address: null })} />
            </View>
          ) : (
            <View className="gap-2.5">
              {visible.map((a) => {
                const on = a.id === selectedAddressId;
                return (
                  <Pressable key={a.id} onPress={() => setSelectedAddressId(a.id)} className={cn('flex-row gap-3 rounded-2xl border p-3.5', on ? 'border-primary bg-primary-soft/60' : 'border-line bg-white')}>
                    <View className="mt-0.5"><Radio on={on} /></View>
                    <View className="flex-1 gap-1">
                      <View className="flex-row items-center gap-2 flex-wrap">
                        <Text className={T.h3}>{a.fullName}</Text>
                        <View className="flex-row items-center gap-1 bg-cream rounded px-1.5 py-0.5"><Ionicons name={typeIcon[a.addressType]} size={9} color={colors.muted} /><Text className="text-[10px] font-bold text-muted uppercase">{a.addressType}</Text></View>
                        {a.isDefault && <Chip label="Default" tone="green" />}
                      </View>
                      <Text className="text-sm text-ink leading-5">{a.doorNo}, {a.area}</Text>
                      {!!a.landmark && <Text className={T.small}>Landmark: {a.landmark}</Text>}
                      <Text className={T.small}>📞 {a.phone}</Text>
                    </View>
                    <Pressable onPress={() => setSheet({ open: true, address: a })} hitSlop={10}><Ionicons name="create-outline" size={18} color={colors.muted} /></Pressable>
                  </Pressable>
                );
              })}
              {addresses.length > VISIBLE && (
                <Pressable onPress={() => setExpanded((e) => !e)} className="flex-row items-center justify-center gap-1 py-1.5">
                  <Text className="text-primary font-bold text-sm">{expanded ? 'Show less' : `Show ${addresses.length - VISIBLE} more`}</Text>
                  <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={14} color={colors.primary} />
                </Pressable>
              )}
            </View>
          )}
        </Card>

        {/* 2. Payment */}
        <Card>
          <StepHeader n={2} title="Payment Method" subtitle="Choose how you'd like to pay." />
          <View className="gap-3">
            {payments.map((o) => {
              const on = payment === o.id;
              return (
                <Pressable key={o.id} onPress={() => setPayment(o.id)} className={cn('flex-row items-center gap-3 p-3.5 rounded-2xl border-2', on ? 'border-primary bg-primary-soft/60' : 'border-line bg-white')}>
                  <View className={cn('w-11 h-11 rounded-xl items-center justify-center', on ? 'bg-primary' : 'bg-cream')}><Ionicons name={o.icon} size={19} color={on ? '#fff' : colors.muted} /></View>
                  <View className="flex-1">
                    <View className="flex-row items-center gap-2 flex-wrap"><Text className={T.h3}>{o.title}</Text>{!!o.badge && <Chip label={o.badge} tone="green" />}</View>
                    <Text className={T.small}>{o.desc}</Text>
                  </View>
                  <Radio on={on} />
                </Pressable>
              );
            })}
          </View>
          <View className="flex-row items-center gap-2 mt-3"><Ionicons name="shield-checkmark" size={15} color={colors.green} /><Text className={T.small + ' flex-1'}>Your card and bank details are never stored on WonPet.</Text></View>
        </Card>

        {/* 3. Summary */}
        <Card className="gap-2.5">
          <StepHeader n={3} title="Order Summary" subtitle={`${items.length} item${items.length > 1 ? 's' : ''} in your order`} />
          {items.map(({ p, qty }) => (
            <View key={p.id} className="flex-row items-center gap-3 bg-cream rounded-2xl p-2.5">
              {p.image ? <Image source={{ uri: p.image }} className="w-10 h-10 rounded-lg" /> : <Text className="text-3xl">{p.emoji}</Text>}
              <View className="flex-1"><Text className={T.h3} numberOfLines={1}>{p.name}</Text><Text className={T.small}>Qty {qty}</Text></View>
              <Text className="font-bold text-ink">{inr(p.price * qty)}</Text>
            </View>
          ))}
          <View className="flex-row justify-between mt-1"><Text className={T.body}>Subtotal</Text><Text className={T.h3}>{inr(cartTotal)}</Text></View>
          {discount > 0 && <View className="flex-row justify-between"><Text className="text-green font-semibold">Coupon ({couponCode})</Text><Text className="text-green font-bold">-{inr(discount)}</Text></View>}
          <View className="flex-row justify-between"><Text className={T.body}>Delivery</Text><Text className={T.h3}>{quote ? inr(quote.shippingCharge) : quoteError ? '—' : 'Calculating…'}</Text></View>
          {!!quoteError && <Text className="text-red text-xs font-semibold">{quoteError}</Text>}
          {!!quote?.etaDays && <View className="flex-row items-center gap-1.5"><Ionicons name="time-outline" size={14} color={colors.muted} /><Text className={T.small}>Delivery in about {quote.etaDays} day{quote.etaDays > 1 ? 's' : ''}{quote.courierName ? ` · ${quote.courierName}` : ''}</Text></View>}
          <View className="flex-row justify-between pt-2.5 border-t border-orange-100"><Text className={T.h3}>Total</Text><Text className="text-xl font-black text-primary-dark">{inr(total)}</Text></View>
        </Card>
      </ScrollView>

      <View className="p-4 bg-white border-t border-line">
        <Button disabled={placing || !quote} title={placing ? 'Placing order…' : payment === 'Cash on Delivery' ? `Place order · ${inr(total)}` : `Pay & place order · ${inr(total)}`} onPress={onPlace} />
      </View>

      <AddressSheet visible={sheet.open} address={sheet.address} onClose={() => setSheet({ open: false })} onSave={saveAddress} />
    </View>
  );
}

import React from 'react';
import { Image, Pressable, ScrollView, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme';
import { Button, Card, Empty, T } from '../../components/ui';
import CartOffers from '../../components/store/CartOffers';
import { toast } from '../../components/WonPetsAlert';
import { useCart } from '../../context/CartContext';
import { inr } from '../../utils/orders';
import { CartSkeleton } from '../../components/Skeletons';

export default function CartScreen({ navigation }: any) {
  const { cartItems, setQty, removeFromCart, clearCart, cartTotal, couponCode, offers, applyCoupon, removeCoupon, discount, loaded } = useCart();
  const items = cartItems.map(({ product, qty }) => ({ p: product, qty }));
  const savings = items.reduce((s, { p, qty }) => s + (p.mrp - p.price) * qty, 0) + discount;
  const total = cartTotal - discount; // delivery is added at checkout, once the address is known

  if (!loaded.cart) return <CartSkeleton />;

  if (!items.length) return (
    <View className="flex-1 bg-cream justify-center"><Empty emoji="🛒" title="Your cart is empty" body="Add food, toys and accessories for your pets." />
      <View className="px-10"><Button title="Browse store" onPress={() => navigation.navigate('Main', { screen: 'Store' })} /></View></View>
  );

  return (
    <View className="flex-1 bg-cream">
      <ScrollView contentContainerClassName="p-4 gap-3 pb-6">
        {items.map(({ p, qty }) => (
          <Card key={p.id} className="flex-row gap-3 items-center">
            <View className="w-20 h-20 rounded-2xl bg-[#FBF3EA] items-center justify-center overflow-hidden">{p.image ? <Image source={{ uri: p.image }} className="w-20 h-20" /> : <Text className="text-[40px]">{p.emoji}</Text>}</View>
            <View className="flex-1 gap-1">
              <Text className={T.h3} numberOfLines={1}>{p.name}</Text>
              <View className="flex-row items-center gap-2">
                <Text className="text-primary-dark font-black">{inr(p.price * qty)}</Text>
                {p.mrp > p.price && <Text className="text-xs text-muted line-through">{inr(p.mrp * qty)}</Text>}
              </View>
              <View className="flex-row items-center gap-3">
                <Pressable onPress={() => setQty(p.id, qty - 1)} className="w-7 h-7 rounded-full border border-line items-center justify-center"><Ionicons name="remove" size={16} color={colors.text} /></Pressable>
                <Text className="font-extrabold">{qty}</Text>
                <Pressable onPress={() => qty >= p.stock ? toast.error(`Only ${p.stock} in stock`) : setQty(p.id, qty + 1)} className="w-7 h-7 rounded-full border border-line items-center justify-center"><Ionicons name="add" size={16} color={colors.text} /></Pressable>
              </View>
            </View>
            <Pressable onPress={() => removeFromCart(p.id)}><Ionicons name="trash-outline" size={20} color={colors.red} /></Pressable>
          </Card>
        ))}

        <CartOffers offers={offers} appliedCode={couponCode}
          onApply={async (code) => { const err = await applyCoupon(code); if (err) toast.error(err); else toast.success(`${code} applied`); }}
          onRemove={removeCoupon} />

        <Card className="gap-2">
          <Text className={T.h2}>Order summary</Text>
          <View className="flex-row justify-between"><Text className={T.body}>Subtotal</Text><Text className={T.h3}>{inr(cartTotal)}</Text></View>
          {discount > 0 && <View className="flex-row justify-between"><Text className="text-green font-semibold">Coupon ({couponCode})</Text><Text className="text-green font-bold">-{inr(discount)}</Text></View>}
          <View className="flex-row justify-between"><Text className={T.body}>Delivery</Text><Text className={T.small}>Calculated at checkout</Text></View>
          <View className="flex-row justify-between pt-2 border-t border-orange-100"><Text className={T.h3}>Total</Text><Text className="text-xl font-black text-primary-dark">{inr(total)}</Text></View>
          {savings > 0 && (
            <View className="flex-row items-center gap-2 bg-green-soft rounded-xl px-3 py-2 mt-1"><Ionicons name="happy" size={16} color={colors.green} /><Text className="text-green font-bold text-xs flex-1">You are saving {inr(Math.round(savings))} on this order</Text></View>
          )}
        </Card>
        <Pressable onPress={clearCart}><Text className="text-center text-muted font-semibold">Clear cart</Text></Pressable>
      </ScrollView>
      <View className="p-4 bg-white border-t border-line">
        <Button title={`Proceed to checkout · ${inr(total)}+`} onPress={() => navigation.navigate('Checkout')} />
      </View>
    </View>
  );
}

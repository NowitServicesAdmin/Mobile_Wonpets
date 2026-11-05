import React from 'react';
import { ScrollView, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../../theme';
import { Button, T, cn } from '../../components/ui';
import { useCart } from '../../context/CartContext';
import { fmtDateTime } from '../../utils/orders';

const steps = [
  { icon: 'cube', title: 'Order Confirmed', desc: 'Your order has been received.', done: true },
  { icon: 'bicycle', title: 'Preparing Shipment', desc: 'Seller will dispatch it soon.', done: false },
  { icon: 'home', title: 'Home Delivery', desc: 'Track your order anytime.', done: false },
] as const;

export default function OrderSuccessScreen({ route, navigation }: any) {
  const insets = useSafeAreaInsets();
  const { orders } = useCart();
  const order = orders.find((o) => o.id === route.params?.orderId);

  return (
    <ScrollView className="flex-1 bg-cream" contentContainerClassName="p-5 items-center justify-center flex-grow" style={{ paddingTop: insets.top + 12, paddingBottom: insets.bottom + 12 }}>
      <View className="bg-white rounded-[28px] border border-line p-6 items-center gap-3 self-stretch">
        <View className="w-20 h-20 rounded-full bg-green-soft items-center justify-center"><Ionicons name="checkmark" size={38} color={colors.green} /></View>
        <Text className="text-2xl font-black text-ink text-center">Order Placed <Text className="text-green">Successfully!</Text></Text>
        <Text className={T.body + ' text-center'}>Thank you for shopping with <Text className="text-primary font-bold">WonPets</Text>. We've received your order and our verified store partner will start preparing it shortly.</Text>

        {!!order && (
          <View className="flex-row bg-primary-soft/70 border border-line rounded-2xl p-3.5 self-stretch gap-3">
            <View className="flex-1"><Text className="text-[11px] text-muted">Order ID</Text><Text className="font-bold text-primary" numberOfLines={1}>{order.orderNo ?? order.id}</Text></View>
            <View className="w-px bg-line" />
            <View className="flex-1"><Text className="text-[11px] text-muted">Order date</Text><Text className="font-bold text-ink text-xs" numberOfLines={2}>{fmtDateTime(order.createdAt)}</Text></View>
          </View>
        )}

        <View className="bg-green-soft/60 border border-green/20 rounded-2xl p-4 self-stretch gap-3.5">
          {steps.map((s) => (
            <View key={s.title} className="flex-row items-center gap-3">
              <View className={cn('w-11 h-11 rounded-full items-center justify-center', s.done ? 'bg-white border-2 border-green' : 'bg-white border-2 border-line')}>
                <Ionicons name={s.icon} size={17} color={s.done ? colors.green : colors.primary} />
              </View>
              <View className="flex-1"><Text className={T.h3}>{s.title}</Text><Text className={T.small}>{s.desc}</Text></View>
              {s.done && <Ionicons name="checkmark-circle" size={20} color={colors.green} />}
            </View>
          ))}
        </View>

        <View className="self-stretch gap-2.5 mt-1">
          {!!order && <Button title="Track my order" onPress={() => navigation.reset({ index: 1, routes: [{ name: 'Main' }, { name: 'OrderDetail', params: { id: order.id } }] })} />}
          <Button variant="outline" title="View all orders" onPress={() => navigation.reset({ index: 1, routes: [{ name: 'Main' }, { name: 'Orders' }] })} />
          <Button variant="neutral" title="Continue shopping" onPress={() => navigation.reset({ index: 0, routes: [{ name: 'Main', params: { screen: 'Store' } }] })} />
        </View>
      </View>
    </ScrollView>
  );
}

import { useLiveSync } from '../../context/LiveSyncContext';
import React, { useEffect, useState } from 'react';
import { Image, ScrollView, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme';
import { Button, Card, Chip, Empty, T } from '../../components/ui';
import { OrderDetailSkeleton } from '../../components/Skeletons';
import OrderTimeline from '../../components/store/OrderTimeline';
import ShipmentTracking from '../../components/store/ShipmentTracking';
import { WonPetsAlert, toast } from '../../components/WonPetsAlert';
import { ordersService } from '../../services/store.service';
import { useCart } from '../../context/CartContext';
import { fmtDateTime, inr, statusTone } from '../../utils/orders';

export default function OrderDetailScreen({ route, navigation }: any) {
  const { orders, cancelOrder, upsertOrder } = useCart();
  const order = orders.find((o) => o.id === route.params.id);
  const [fetched, setFetched] = useState(false);
  const { tick } = useLiveSync();

  // load the full order (item snapshots) and live courier activity
  useEffect(() => {
    const id = route.params.id;
    (async () => {
      try {
        const full = await ordersService.get(id);
        const base = { ...full };
        if (full.courier) {
          try { base.courier = { ...full.courier, activities: (await ordersService.tracking(id)).activities }; } catch { /* tracking is optional */ }
        }
        upsertOrder(base);
      } catch { /* keep what the list already has */ }
      finally { setFetched(true); }
    })();
  }, [route.params.id, tick]); // tick: live sync re-fetches the order so status / courier updates appear on their own
  if (!order) return fetched ? <View className="flex-1 bg-cream justify-center"><Empty emoji="📦" title="Order not found" body="We couldn't load this order. Pull back and try again." /></View> : <OrderDetailSkeleton />;
  const canCancel = order.status === 'Pending' || order.status === 'Processing';

  const onCancel = async () => {
    const r = await WonPetsAlert.confirm('Cancel this order?', 'The store will stop preparing it. This cannot be undone.', { confirmText: 'Yes, cancel', cancelText: 'Keep order' });
    if (!r.isConfirmed) return;
    if (await cancelOrder(order.id)) toast.success('Order cancelled');
  };

  return (
    <ScrollView className="flex-1 bg-cream" contentContainerClassName="p-4 gap-3.5 pb-10">
      <Card className="gap-1.5">
        <View className="flex-row justify-between items-center"><Text className={T.h1}>{order.orderNo ?? order.id}</Text><Chip label={order.status} tone={statusTone[order.status]} /></View>
        <Text className={T.small}>Placed on {fmtDateTime(order.createdAt)}</Text>
      </Card>

      <Card className="gap-3"><Text className={T.h2}>Order status</Text><OrderTimeline order={order} /></Card>

      <ShipmentTracking order={order} />

      <Card className="gap-2.5">
        <Text className={T.h2}>Items</Text>
        {order.items.map((i) => {
          return (
            <View key={i.productId} className="flex-row items-center gap-3 bg-cream rounded-2xl p-2.5">
              {i.image ? <Image source={{ uri: i.image }} className="w-10 h-10 rounded-lg" /> : <Text className="text-3xl">🛍️</Text>}
              <View className="flex-1"><Text className={T.h3} numberOfLines={1}>{i.name ?? 'Product'}</Text><Text className={T.small}>Qty {i.qty}</Text></View>
              <Text className="font-bold text-ink">{inr((i.price ?? 0) * i.qty)}</Text>
            </View>
          );
        })}
      </Card>

      {!!order.address && (
        <Card className="gap-1.5">
          <View className="flex-row items-center gap-2"><Ionicons name="location" size={17} color={colors.primary} /><Text className={T.h2}>Delivery address</Text></View>
          <Text className={T.h3}>{order.address.fullName} · {order.address.addressType}</Text>
          <Text className="text-sm text-ink leading-5">{order.address.doorNo}, {order.address.area}</Text>
          <Text className={T.small}>📞 {order.address.phone}</Text>
        </Card>
      )}

      <Card className="gap-2">
        <Text className={T.h2}>Payment</Text>
        <View className="flex-row justify-between"><Text className={T.body}>Method</Text><Text className={T.h3}>{order.payment}</Text></View>
        <View className="flex-row justify-between"><Text className={T.body}>Subtotal</Text><Text className={T.h3}>{inr(order.subtotal)}</Text></View>
        {order.discount > 0 && <View className="flex-row justify-between"><Text className="text-green font-semibold">Coupon{order.couponCode ? ` (${order.couponCode})` : ''}</Text><Text className="text-green font-bold">-{inr(order.discount)}</Text></View>}
        <View className="flex-row justify-between"><Text className={T.body}>Delivery</Text><Text className={T.h3}>{order.shipping ? inr(order.shipping) : 'FREE'}</Text></View>
        <View className="flex-row justify-between pt-2 border-t border-orange-100"><Text className={T.h3}>Total</Text><Text className="text-xl font-black text-primary-dark">{inr(order.total)}</Text></View>
      </Card>

      <View className="gap-2.5">
        <Button variant="outline" title="Need help? Chat with us" icon={<Ionicons name="chatbubble-ellipses-outline" size={18} color={colors.primary} />} onPress={() => navigation.navigate('Chat')} />
        {canCancel && <Button variant="neutral" title="Cancel order" onPress={onCancel} />}
      </View>
    </ScrollView>
  );
}

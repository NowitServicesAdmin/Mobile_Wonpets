import React, { useState } from 'react';
import { FlatList, Image, Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme';
import { Card, Chip, Empty, T, cn } from '../../components/ui';
import { useCart } from '../../context/CartContext';
import { inr, statusTone } from '../../utils/orders';
import { OrdersSkeleton } from '../../components/Skeletons';

const filters = ['All', 'Pending', 'Processing', 'Shipped', 'Delivered', 'Cancelled'];

export default function OrdersScreen({ route, navigation }: any) {
  const { orders, refreshOrders, loaded } = useCart();
  const [refreshing, setRefreshing] = useState(false);
  const [f, setF] = useState<string>(route.params?.filter ?? 'All');
  // Dashboard groups Shipped under "Processing"
  const list = orders.filter((o) => f === 'All' || o.status === f || (f === 'Processing' && o.status === 'Shipped' && route.params?.filter === 'Processing'));
  if (!loaded.orders) return <OrdersSkeleton />;
  return (
    <FlatList className="flex-1 bg-cream" contentContainerClassName="p-4 gap-3 pb-8" data={list} keyExtractor={(o) => o.id} refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await refreshOrders(); setRefreshing(false); }}
      ListHeaderComponent={
        <View className="flex-row flex-wrap gap-2 mb-3">
          {filters.map((x) => (
            <Pressable key={x} onPress={() => setF(x)} className={cn('px-3.5 py-2 rounded-full border', f === x ? 'bg-primary border-primary' : 'bg-white border-line')}>
              <Text className={cn('font-bold text-xs', f === x ? 'text-white' : 'text-ink')}>{x}</Text>
            </Pressable>
          ))}
        </View>
      }
      ListEmptyComponent={<Empty emoji="📦" title="No orders" body="Orders in this status will show up here." />}
      renderItem={({ item }) => (
        <Pressable onPress={() => navigation.navigate('OrderDetail', { id: item.id })} className="active:opacity-90">
          <Card className="gap-2.5">
            <View className="flex-row justify-between items-center"><Text className={T.h3}>{item.orderNo ?? item.id}</Text><Chip label={item.status} tone={statusTone[item.status]} /></View>
            <Text className={T.small}>{item.date} · {item.payment}</Text>
            {item.items.map((i) => {
              return (
                <View key={i.productId} className="flex-row items-center gap-3 bg-cream rounded-2xl p-2.5">
                  {i.image ? <Image source={{ uri: i.image }} className="w-10 h-10 rounded-lg" /> : <Text className="text-3xl">🛍️</Text>}
                  <View className="flex-1"><Text className={T.h3} numberOfLines={1}>{i.name ?? 'Product'}</Text><Text className={T.small}>Qty {i.qty}</Text></View>
                </View>
              );
            })}
            <View className="flex-row justify-between items-center pt-2 border-t border-orange-100">
              <View><Text className={T.small}>Total</Text><Text className="font-black text-primary-dark">{inr(item.total)}</Text></View>
              <View className="flex-row items-center gap-1"><Text className="text-primary font-bold text-sm">{['Pending', 'Processing', 'Shipped'].includes(item.status) ? 'Track order' : 'View details'}</Text><Ionicons name="chevron-forward" size={15} color={colors.primary} /></View>
            </View>
          </Card>
        </Pressable>
      )}
    />
  );
}

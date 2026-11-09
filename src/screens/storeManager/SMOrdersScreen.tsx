import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme';
import { Empty, cn } from '../../components/ui';
import { OrdersSkeleton } from '../../components/Skeletons';
import SearchBar from '../../components/common/SearchBar';
import FilterChips from '../../components/common/FilterChips';
import LoadMoreFooter from '../../components/LoadMoreFooter';
import { TONES, DTone } from '../../components/doctor/DoctorUI';
import { LoadError, ORDER_COLOR, OrderBadge, inr0, inrShort, palette } from '../../components/storeManager/SMUI';
import { useRemote } from '../../hooks/useRemote';
import { useInfiniteSlice } from '../../hooks/useInfiniteSlice';
import { actionsFor, useSMOrderActions } from '../../hooks/useSMOrderActions';
import { SMOrder, SMOrderStatus, courierHandles, smService } from '../../services/storeManager.service';
import { useStoreManager } from '../../context/StoreManagerContext';

type Icon = keyof typeof Ionicons.glyphMap;
const STATUSES: SMOrderStatus[] = ['Pending', 'Processing', 'Shipped', 'Delivered', 'Cancelled'];

/** Orders tab: summary tiles, search + status filter, and order cards with the next action right on the card. */
export default function SMOrdersScreen({ navigation, route }: any) {
  const { tick } = useStoreManager();
  const data = useRemote(async () => {
    const [orders, summary] = await Promise.all([smService.orders(), smService.orderSummary()]);
    return { orders, summary };
  }, [], tick);
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState<string[]>(route.params?.status ? [route.params.status] : []);
  const act = useSMOrderActions(data.reloadQuiet);

  // another screen (dashboard tile, notification) can ask for a status
  useEffect(() => { if (route.params?.status) setFilter([route.params.status]); }, [route.params?.status, route.params?.at]);

  const orders = data.data?.orders ?? [];
  const s = data.data?.summary;
  const counts = useMemo(() => Object.fromEntries(STATUSES.map((k) => [k, orders.filter((o) => o.status === k).length])), [orders]);
  const list = useMemo(() => {
    const k = q.trim().toLowerCase();
    return orders.filter((o) =>
      (!filter.length || filter.includes(o.status)) &&
      (!k || o.orderId.toLowerCase().includes(k) || o.customer.name.toLowerCase().includes(k) || o.customer.phone.includes(k)));
  }, [orders, q, filter]);
  const page = useInfiniteSlice(list, 10, `${q}|${filter.join(',')}`);

  if (data.loading && !data.data) return <OrdersSkeleton />;
  if (data.error && !data.data) return <LoadError message={data.error} onRetry={data.reload} />;

  const tiles: { label: string; value: string | number; icon: Icon; tone: DTone; status?: SMOrderStatus }[] = [
    { label: 'Pending', value: s?.pending ?? 0, icon: 'time', tone: 'orange', status: 'Pending' },
    { label: 'Processing', value: s?.processing ?? 0, icon: 'clipboard', tone: 'purple', status: 'Processing' },
    { label: 'Delivered', value: s?.delivered ?? 0, icon: 'checkmark-circle', tone: 'green', status: 'Delivered' },
    { label: 'Cancelled', value: s?.cancelled ?? 0, icon: 'close-circle', tone: 'red', status: 'Cancelled' },
    { label: 'Revenue', value: inrShort(s?.revenue ?? 0), icon: 'cash', tone: 'blue' },
    { label: 'Total', value: s?.totalOrders ?? 0, icon: 'albums', tone: 'amber' },
  ];

  const header = (
    <View className="gap-3.5 mb-1">
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="gap-2.5 pr-2">
        {tiles.map((t) => (
          <Pressable key={t.label} disabled={!t.status} onPress={() => t.status && setFilter([t.status])} accessibilityRole="button"
            className="w-[108px] bg-white rounded-2xl border border-orange-100 p-3 active:bg-orange-50">
            <View className={cn('w-9 h-9 rounded-xl items-center justify-center mb-1.5', TONES[t.tone].soft)}><Ionicons name={t.icon} size={17} color={TONES[t.tone].fg} /></View>
            <Text className="text-[20px] font-black text-slate-800" numberOfLines={1} adjustsFontSizeToFit>{t.value}</Text>
            <Text className="text-[11px] text-slate-500">{t.label}</Text>
          </Pressable>
        ))}
      </ScrollView>
      <SearchBar value={q} onChangeText={setQ} placeholder="Search by order ID, customer or phone" />
      <FilterChips
        allLabel="All Orders" allCount={orders.length} active={filter} onChange={setFilter}
        options={STATUSES.map((k) => ({ key: k, label: k, count: counts[k], color: palette(ORDER_COLOR[k]).fg, soft: palette(ORDER_COLOR[k]).soft }))}
      />
    </View>
  );

  return (
    <FlatList
      className="flex-1 bg-cream" contentContainerClassName="p-4 gap-3 pb-10"
      data={page.items} keyExtractor={(o) => o.id}
      ListHeaderComponent={header}
      refreshControl={<RefreshControl refreshing={data.refreshing} onRefresh={data.reload} tintColor={colors.primary} />}
      onEndReached={page.loadMore} onEndReachedThreshold={0.4}
      ListEmptyComponent={<Empty emoji="📭" title={orders.length ? 'No matching orders' : 'No orders yet'} body={orders.length ? 'Try another search or status.' : 'When customers buy from your store, orders show up here.'} />}
      ListFooterComponent={list.length ? <LoadMoreFooter hasMore={page.hasMore} total={page.total} noun="orders" /> : undefined}
      renderItem={({ item }) => <OrderCard o={item} onOpen={() => navigation.navigate('SMOrderDetail', { id: item.id })} act={act} />}
    />
  );
}

function OrderCard({ o, onOpen, act }: { o: SMOrder; onOpen: () => void; act: ReturnType<typeof useSMOrderActions> }) {
  const actions = actionsFor(o);
  const withCourier = o.status === 'Shipped' && courierHandles(o);
  return (
    <Pressable onPress={onOpen} accessibilityRole="button" accessibilityLabel={`Order ${o.orderId}`} className="bg-white rounded-3xl border border-orange-100 p-3.5 active:bg-orange-50/40">
      <View className="flex-row items-center gap-2">
        <Text className="flex-1 font-extrabold text-slate-800" numberOfLines={1}>{o.orderId}</Text>
        <OrderBadge status={o.status} />
      </View>
      <View className="flex-row items-center gap-3 mt-2.5">
        <View className="w-10 h-10 rounded-full bg-orange-100 items-center justify-center"><Text className="text-orange-500 font-bold">{o.customer.name.charAt(0).toUpperCase()}</Text></View>
        <View className="flex-1">
          <Text className="font-semibold text-slate-800" numberOfLines={1}>{o.customer.name}</Text>
          <Text className="text-xs text-slate-500" numberOfLines={1}>{[o.customer.phone, `${o.items.length} item${o.items.length === 1 ? '' : 's'}`].filter(Boolean).join(' · ')}</Text>
        </View>
        <View className="items-end">
          <Text className="font-extrabold text-green-600">{inr0(o.total)}</Text>
          <Text className="text-[11px] text-slate-400">{new Date(o.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</Text>
        </View>
      </View>
      {(actions.length > 0 || withCourier) && (
        <View className="flex-row gap-2 mt-3 pt-3 border-t border-slate-100">
          {withCourier && (
            <View className="flex-1 flex-row items-center justify-center gap-1.5 h-10 rounded-xl bg-slate-100">
              <Ionicons name="car-outline" size={15} color="#475569" /><Text className="text-slate-600 font-semibold text-[13px]">With courier</Text>
            </View>
          )}
          {actions.map((a) => {
            const p = palette(a.tone);
            const busy = act.isBusy(o, a.action);
            return (
              <Pressable key={a.action} disabled={!!act.busy} onPress={() => act.run(o, a.action)} accessibilityRole="button" accessibilityLabel={a.label}
                style={{ backgroundColor: p.soft }} className={cn('flex-1 flex-row items-center justify-center gap-1.5 h-10 rounded-xl active:opacity-70', !!act.busy && !busy && 'opacity-50')}>
                {busy ? <ActivityIndicator size="small" color={p.fg} /> : <Ionicons name={a.icon as Icon} size={15} color={p.fg} />}
                <Text style={{ color: p.fg }} className="font-bold text-[13px]">{a.label}</Text>
              </Pressable>
            );
          })}
        </View>
      )}
    </Pressable>
  );
}

import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, RefreshControl, Share, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme';
import { Empty, cn } from '../../components/ui';
import { OrdersSkeleton } from '../../components/Skeletons';
import { toast } from '../../components/WonPetsAlert';
import SearchBar from '../../components/common/SearchBar';
import CustomDropdown from '../../components/CustomDropdown';
import DateFields from '../../components/DateFields';
import LoadMoreFooter from '../../components/LoadMoreFooter';
import { LoadError, OrderBadge, SMStat, SMStatGrid, SM_PAD, SM_TINT, fmtDayMonth, inrShort, numShort, palette } from '../../components/storeManager/SMUI';
import { useRemote } from '../../hooks/useRemote';
import { useInfiniteSlice } from '../../hooks/useInfiniteSlice';
import { actionsFor, useSMOrderActions } from '../../hooks/useSMOrderActions';
import { SMOrder, courierHandles, smService } from '../../services/storeManager.service';
import { useStoreManager } from '../../context/StoreManagerContext';

type Icon = keyof typeof Ionicons.glyphMap;
const DAY = 24 * 60 * 60 * 1000;

/** Same options as the web Orders filters. */
const STATUS_OPTIONS = ['All Orders', 'Pending', 'Processing', 'Shipped', 'Delivered', 'Cancelled'].map((l) => ({ label: l, value: l === 'All Orders' ? 'All' : l }));
const DATE_PRESETS = [
  { value: 'all', label: 'All time' }, { value: 'today', label: 'Today' }, { value: '7d', label: 'Last 7 days' },
  { value: '30d', label: 'Last 30 days' }, { value: '90d', label: 'Last 90 days' }, { value: 'custom', label: 'Custom range' },
];
type DateRange = { preset: string; from: string; to: string };

const startOfToday = () => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; };
const bounds = ({ preset, from, to }: DateRange): [Date | null, Date | null] => {
  if (preset === 'today') return [startOfToday(), null];
  const m = /^(\d+)d$/.exec(preset);
  if (m) return [new Date(startOfToday().getTime() - (Number(m[1]) - 1) * DAY), null];
  if (preset === 'custom') return [from ? new Date(`${from}T00:00:00`) : null, to ? new Date(`${to}T23:59:59.999`) : null];
  return [null, null];
};
const csv = (v: unknown) => { const s = String(v ?? ''); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };

/** Orders (web OrdersPage): summary tiles, status + date filters, search, export, and each order with its next action. */
export default function SMOrdersScreen({ navigation, route }: any) {
  const { tick } = useStoreManager();
  const data = useRemote(async () => {
    const [orders, summary] = await Promise.all([smService.orders(), smService.orderSummary()]);
    return { orders, summary };
  }, [], tick);
  const [q, setQ] = useState('');
  const [status, setStatus] = useState<string>(route.params?.status ?? 'All');
  const [range, setRange] = useState<DateRange>({ preset: 'all', from: '', to: '' });
  const act = useSMOrderActions(data.reloadQuiet);

  // another screen (notification, search) can ask for a status
  useEffect(() => { if (route.params?.status) setStatus(route.params.status); }, [route.params?.status, route.params?.at]);

  const orders = data.data?.orders ?? [];
  const s = data.data?.summary;
  const list = useMemo(() => {
    const k = q.trim().toLowerCase();
    const [start, end] = bounds(range);
    return orders.filter((o) => {
      const t = new Date(o.createdAt).getTime();
      return (status === 'All' || o.status === status)
        && (!start || t >= start.getTime()) && (!end || t <= end.getTime())
        && (!k || o.orderId.toLowerCase().includes(k) || o.customer.name.toLowerCase().includes(k));
    });
  }, [orders, q, status, range]);
  const page = useInfiniteSlice(list, 10, `${q}|${status}|${range.preset}|${range.from}|${range.to}`);

  const exportCsv = async () => {
    if (!list.length) return toast.error('No orders to export yet.');
    const header = ['Order ID', 'Customer', 'Phone', 'Status', 'Date', 'Subtotal', 'Delivery', 'Shipping', 'Discount', 'Total'];
    const lines = list.map((o) => [o.orderId, o.customer.name, o.customer.phone, o.status, new Date(o.createdAt).toLocaleString('en-IN'), o.subtotal, o.deliveryCharge, o.shippingCharge, o.discount, o.total].map(csv).join(','));
    try { await Share.share({ title: 'Orders', message: [header.join(','), ...lines].join('\n') }); } catch { toast.error('Could not open the share sheet.'); }
  };

  if (data.loading && !data.data) return <OrdersSkeleton />;
  if (data.error && !data.data) return <LoadError message={data.error} onRetry={data.reload} />;

  const stats: SMStat[] = [
    { title: 'Pending', value: numShort(s?.pending ?? 0), icon: 'time', ...SM_TINT.orange },
    { title: 'Processing', value: numShort(s?.processing ?? 0), icon: 'clipboard', ...SM_TINT.purple },
    { title: 'Delivered', value: numShort(s?.delivered ?? 0), icon: 'checkmark-circle', ...SM_TINT.green },
    { title: 'Cancelled', value: numShort(s?.cancelled ?? 0), icon: 'close-circle', ...SM_TINT.red },
    { title: 'Revenue', value: inrShort(s?.revenue ?? 0), icon: 'cash', ...SM_TINT.blue },
    { title: 'Total Orders', value: numShort(s?.totalOrders ?? 0), icon: 'albums', ...SM_TINT.amber },
  ];

  const header = (
    <View className="gap-2.5 mb-0.5">
      <Text className="text-[11.5px] text-muted -mb-1">View and manage customer orders</Text>
      <SMStatGrid stats={stats} cols={3} />
      <View className="flex-row items-center gap-2">
        <View className="flex-1"><CustomDropdown value={status} onChange={setStatus} options={STATUS_OPTIONS} searchable={false} title="Filter by status" placeholder="All Orders" /></View>
        <View className="flex-1"><CustomDropdown value={range.preset} onChange={(preset) => setRange({ preset, from: '', to: '' })} options={DATE_PRESETS} searchable={false} title="Select date range" placeholder="Select date range" /></View>
        <Pressable onPress={exportCsv} accessibilityRole="button" accessibilityLabel="Export orders" className="w-11 h-11 rounded-xl bg-primary items-center justify-center active:opacity-80">
          <Ionicons name="download-outline" size={18} color="#fff" />
        </Pressable>
      </View>
      {range.preset === 'custom' && (
        <View className="flex-row gap-2">
          <View className="flex-1"><DateFields label="From" value={range.from} onChange={(from) => setRange((r) => ({ ...r, from }))} /></View>
          <View className="flex-1"><DateFields label="To" value={range.to} onChange={(to) => setRange((r) => ({ ...r, to }))} /></View>
        </View>
      )}
      <SearchBar value={q} onChangeText={setQ} placeholder="Search by Order ID or Customer..." />
    </View>
  );

  return (
    <FlatList
      className="flex-1 bg-cream" contentContainerClassName={SM_PAD}
      data={page.items} keyExtractor={(o) => o.id}
      ListHeaderComponent={header}
      refreshControl={<RefreshControl refreshing={data.refreshing} onRefresh={data.reload} tintColor={colors.primary} />}
      onEndReached={page.loadMore} onEndReachedThreshold={0.4}
      ListEmptyComponent={<Empty emoji="📭" title={orders.length ? 'No matching orders' : 'No orders yet'} body={orders.length ? 'Try another search, status or date range.' : 'When customers buy from your store, orders show up here.'} />}
      ListFooterComponent={list.length ? <LoadMoreFooter hasMore={page.hasMore} total={page.total} noun="orders" /> : undefined}
      renderItem={({ item }) => <OrderCard o={item} onOpen={() => navigation.navigate('SMOrderDetail', { id: item.id })} act={act} />}
    />
  );
}

function OrderCard({ o, onOpen, act }: { o: SMOrder; onOpen: () => void; act: ReturnType<typeof useSMOrderActions> }) {
  const actions = actionsFor(o);
  const withCourier = o.status === 'Shipped' && courierHandles(o);
  return (
    <Pressable onPress={onOpen} accessibilityRole="button" accessibilityLabel={`Order ${o.orderId}`} className="bg-white rounded-2xl border border-line p-3 active:bg-primary-soft">
      <View className="flex-row items-center gap-2">
        <Text className="flex-1 font-extrabold text-ink" numberOfLines={1}>{o.orderId}</Text>
        <OrderBadge status={o.status} />
      </View>
      <View className="flex-row items-center gap-2.5 mt-2">
        <View className="w-9 h-9 rounded-full bg-orange-100 items-center justify-center"><Text className="text-primary font-bold">{o.customer.name.charAt(0).toUpperCase()}</Text></View>
        <View className="flex-1">
          <Text className="font-semibold text-ink text-[13.5px]" numberOfLines={1}>{o.customer.name}</Text>
          <Text className="text-[11.5px] text-muted" numberOfLines={1}>{fmtDayMonth(o.createdAt)}</Text>
        </View>
        <Text className="font-extrabold text-green-600">{inrShort(o.total)}</Text>
      </View>
      {(actions.length > 0 || withCourier) && (
        <View className="flex-row gap-2 mt-2.5 pt-2.5 border-t border-line">
          {withCourier && (
            <View className="flex-1 flex-row items-center justify-center gap-1.5 h-9 rounded-xl bg-line">
              <Ionicons name="car-outline" size={14} color="#475569" /><Text className="text-muted font-semibold text-[12.5px]">With courier</Text>
            </View>
          )}
          {actions.map((a) => {
            const p = palette(a.tone);
            const busy = act.isBusy(o, a.action);
            return (
              <Pressable key={a.action} disabled={!!act.busy} onPress={() => act.run(o, a.action)} accessibilityRole="button" accessibilityLabel={a.label}
                style={{ backgroundColor: p.soft }} className={cn('flex-1 flex-row items-center justify-center gap-1.5 h-9 rounded-xl active:opacity-70', !!act.busy && !busy && 'opacity-50')}>
                {busy ? <ActivityIndicator size="small" color={p.fg} /> : <Ionicons name={a.icon as Icon} size={14} color={p.fg} />}
                <Text style={{ color: p.fg }} className="font-bold text-[12.5px]">{a.label}</Text>
              </Pressable>
            );
          })}
        </View>
      )}
    </Pressable>
  );
}

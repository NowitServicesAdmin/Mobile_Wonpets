import React, { useMemo, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme';
import { Empty, cn } from '../../components/ui';
import { DashboardSkeleton } from '../../components/Skeletons';
import {
  AreaChart, Donut, LoadError, OrderBadge, SMCard, SMCardHead, SMStat, SMStatGrid, SM_PAD, SM_TINT, inrShort, numShort,
} from '../../components/storeManager/SMUI';
import { useRemote } from '../../hooks/useRemote';
import { smService, SMPerformanceDays } from '../../services/storeManager.service';
import { useStoreManager } from '../../context/StoreManagerContext';
import PlanEndedBanner from '../../components/settings/PlanEndedBanner';

type Icon = keyof typeof Ionicons.glyphMap;
type Range = 'year' | '6m';

/** Same six shortcuts, in the same order, as the web dashboard's "Quick Actions". */
const QUICK: { title: string; icon: Icon; tint: keyof typeof SM_TINT; go: string }[] = [
  { title: 'Add Product', icon: 'add-circle', tint: 'green', go: 'SMProducts' },
  { title: 'Manage Inventory', icon: 'layers', tint: 'purple', go: 'SMInventory' },
  { title: 'Manage Orders', icon: 'clipboard', tint: 'orange', go: 'SMOrders' },
  { title: 'Create Offer', icon: 'pricetag', tint: 'red', go: 'SMOffers' },
  { title: 'Sales Report', icon: 'bar-chart', tint: 'blue', go: 'SMReports' },
  { title: 'Customers', icon: 'people', tint: 'green', go: 'SMCustomers' },
];
// web STATUS_COLORS
const STATUS_COLORS: Record<string, string> = { Delivered: '#22C55E', Processing: '#F97316', Pending: '#FACC15', Shipped: '#8B5CF6' };

const growthChip = (v?: number | null) => (v === null || v === undefined ? undefined : { label: `${v >= 0 ? '+' : ''}${v}%`, up: v >= 0 });
const PERF_RANGES: [SMPerformanceDays, string][] = [[7, '7D'], [30, '30D'], [90, '90D']];
/** "New" when there was nothing in the previous period but there is activity now; "–" when there is no data at all. */
const growthText = (v: number | null | undefined, current: number) =>
  v === null || v === undefined ? (current > 0 ? 'New' : '–') : `${v >= 0 ? '+' : ''}${v}%`;
const pctOf = (v: number, total: number) => (total ? Math.round((v / total) * 100) : 0);

/** Store dashboard - the web SMDashboard, stacked for a phone: stat cards, sales overview, order status, recent orders,
 *  quick actions, active promotion and store performance. */
export default function SMDashboardScreen({ navigation }: any) {
  const { tick } = useStoreManager();
  const dash = useRemote(() => smService.dashboard(), [], tick);
  const [range, setRange] = useState<Range>('year');
  const [perfDays, setPerfDays] = useState<SMPerformanceDays>(30);
  const performance = useRemote(() => smService.performance(perfDays), [perfDays], tick);
  const d = dash.data;

  const chartData = useMemo(() => (d ? (range === '6m' ? d.revenue.slice(-6) : d.revenue) : []), [d, range]);
  const monthOverMonth = useMemo(() => {
    if (!d || d.revenue.length < 2) return null;
    const [prev, cur] = d.revenue.slice(-2).map((r) => r.value);
    return prev ? Math.round(((cur - prev) / prev) * 1000) / 10 : null;
  }, [d]);

  if (dash.loading && !d) return <DashboardSkeleton />;
  if (dash.error && !d) return <LoadError message={dash.error} onRetry={dash.reload} />;
  if (!d) return null;

  const g = d.growth;
  const stats: SMStat[] = [
    { title: 'Total Revenue', value: inrShort(d.stats.revenue), icon: 'wallet', ...SM_TINT.orange, chip: growthChip(g.revenue) },
    { title: 'Total Orders', value: numShort(d.stats.totalOrders), icon: 'cart', ...SM_TINT.purple, chip: growthChip(g.orders) },
    { title: 'Total Products', value: numShort(d.stats.totalProducts), icon: 'cube', ...SM_TINT.blue, chip: growthChip(g.products) },
    { title: 'Total Customers', value: numShort(d.stats.totalCustomers), icon: 'people', ...SM_TINT.green, chip: growthChip(g.customers) },
    { title: 'Low Stock Items', value: numShort(d.lowStock.length), icon: 'warning', ...SM_TINT.orange, chip: growthChip(g.lowStock) },
  ];

  const statusRows = [
    { name: 'Delivered', value: d.orderStatus.delivered },
    { name: 'Processing', value: d.orderStatus.processing },
    { name: 'Pending', value: d.orderStatus.pending },
    { name: 'Shipped', value: d.orderStatus.shipped },
  ];
  const totalOrders = statusRows.reduce((s, r) => s + r.value, 0);

  const promo = d.topOffers[0];
  const promoTitle = promo ? (promo.discountType === 'Percentage' ? `Flat ${promo.discount}% OFF` : `Flat ₹${promo.discount} OFF`) : 'No active promotion';

  const pf = performance.data;
  const perf: { label: string; key: 'revenue' | 'orders' | 'customers'; icon: Icon; fg: string; fmt: (n: number) => string }[] = [
    { label: 'Revenue Growth', key: 'revenue', icon: 'trending-up', fg: '#22C55E', fmt: inrShort },
    { label: 'Order Growth', key: 'orders', icon: 'cart', fg: '#8B5CF6', fmt: (n) => `${numShort(n)} orders` },
    { label: 'Customer Growth', key: 'customers', icon: 'people', fg: '#EC4899', fmt: (n) => `${numShort(n)} customers` },
  ];

  return (
    <ScrollView className="flex-1 bg-cream" contentContainerClassName={SM_PAD}
      refreshControl={<RefreshControl refreshing={dash.refreshing} onRefresh={dash.reload} tintColor={colors.primary} />}>

      <PlanEndedBanner onRenew={() => navigation.navigate('SMProfile', { open: 'subscription', at: Date.now() })} />

      <SMStatGrid stats={stats} />

      {/* Sales overview */}
      <SMCard>
        <SMCardHead title="Sales Overview" caption="Revenue trend for your store"
          right={
            <View className="flex-row bg-cream rounded-full p-0.5 border border-line">
              {([['year', 'This Year'], ['6m', '6 Months']] as [Range, string][]).map(([k, l]) => (
                <Pressable key={k} onPress={() => setRange(k)} accessibilityRole="button" className={cn('px-2.5 py-1 rounded-full', range === k && 'bg-primary')}>
                  <Text className={cn('text-[11px] font-bold', range === k ? 'text-white' : 'text-muted')}>{l}</Text>
                </Pressable>
              ))}
            </View>
          } />
        <View className="flex-row items-center gap-2 mb-1.5">
          <Text className="text-[22px] font-black text-ink">{inrShort(d.stats.revenue)}</Text>
          {monthOverMonth !== null && (
            <View style={{ backgroundColor: monthOverMonth >= 0 ? '#DCFCE7' : '#FEE2E2' }} className="rounded-full px-1.5 py-0.5">
              <Text style={{ color: monthOverMonth >= 0 ? '#16A34A' : '#EF4444' }} className="text-[10.5px] font-bold">{monthOverMonth >= 0 ? '+' : ''}{monthOverMonth}% vs previous month</Text>
            </View>
          )}
        </View>
        <AreaChart data={chartData} format={inrShort} height={135} />
      </SMCard>

      {/* Order status */}
      <SMCard>
        <SMCardHead title="Order Status" />
        <View className="flex-row items-center gap-3">
          <Donut size={118} stroke={16} centerValue={totalOrders} centerLabel="Orders"
            data={statusRows.map((r) => ({ label: r.name, value: r.value, color: STATUS_COLORS[r.name] }))} />
          <View className="flex-1 gap-2">
            {statusRows.map((r) => (
              <View key={r.name} className="flex-row items-center gap-1.5">
                <View style={{ backgroundColor: STATUS_COLORS[r.name] }} className="w-2.5 h-2.5 rounded-full" />
                <Text className="flex-1 text-[12.5px] text-muted" numberOfLines={1}>{r.name}</Text>
                <Text className="text-[12.5px] font-bold text-ink">{r.value} <Text className="font-normal text-muted">({pctOf(r.value, totalOrders)}%)</Text></Text>
              </View>
            ))}
          </View>
        </View>
      </SMCard>

      {/* Recent orders */}
      <SMCard>
        <SMCardHead title="Recent Orders" action="View All" onAction={() => navigation.navigate('SMOrders')} />
        {d.recentOrders.length ? (
          <View>
            {d.recentOrders.slice(0, 3).map((o) => (
              <Pressable key={o.id} onPress={() => navigation.navigate('SMOrderDetail', { id: o.id })} accessibilityRole="button"
                className="flex-row items-center gap-2.5 py-1.5 border-t border-line active:bg-primary-soft">
                <View className="w-9 h-9 rounded-full bg-orange-100 items-center justify-center"><Text className="text-primary font-bold">{o.customer.name.charAt(0).toUpperCase()}</Text></View>
                <View className="flex-1">
                  <Text className="font-bold text-ink text-[13.5px]" numberOfLines={1}>{o.orderId}</Text>
                  <Text className="text-[11.5px] text-muted" numberOfLines={1}>{o.customer.name}</Text>
                </View>
                <View className="items-end gap-0.5"><Text className="font-bold text-ink text-[13.5px]">{inrShort(o.total)}</Text><OrderBadge status={o.status} /></View>
              </Pressable>
            ))}
          </View>
        ) : <Empty emoji="🛒" title="No recent orders" />}
      </SMCard>

      {/* Quick actions */}
      <SMCard>
        <SMCardHead title="Quick Actions" />
        <View className="flex-row flex-wrap gap-2">
          {QUICK.map((q) => (
            <Pressable key={q.title} onPress={() => navigation.navigate(q.go)} accessibilityRole="button" accessibilityLabel={q.title}
              className="w-[31.8%] rounded-2xl border border-line bg-white py-2 items-center gap-1 active:bg-primary-soft">
              <Ionicons name={q.icon} size={22} color={SM_TINT[q.tint].fg} />
              <Text className="text-[10.5px] leading-[13px] font-semibold text-ink text-center px-0.5" numberOfLines={2}>{q.title}</Text>
            </Pressable>
          ))}
        </View>
      </SMCard>

      {/* Active promotion */}
      <View className="rounded-2xl border border-line bg-orange-50 p-3">
        <Text className="text-[15px] font-extrabold text-ink mb-2">Active Promotion</Text>
        <View className="flex-row items-center gap-2.5">
          <View className="w-10 h-10 rounded-full bg-orange-100 items-center justify-center"><Ionicons name="paw" size={19} color="#F97316" /></View>
          <View className="flex-1">
            <Text className="text-[17px] font-black text-primary" numberOfLines={1}>{promoTitle}</Text>
            {!!promo && <Text className="text-[12px] text-muted" numberOfLines={1}>{promo.title}</Text>}
          </View>
          <Pressable onPress={() => navigation.navigate('SMOffers')} accessibilityRole="button" className="flex-row items-center gap-1 bg-orange-600 rounded-xl px-3 py-2 active:opacity-80">
            <Text className="text-white text-[12px] font-bold">Manage Offers</Text><Ionicons name="arrow-forward" size={13} color="#fff" />
          </Pressable>
        </View>
      </View>

      {/* Store performance */}
      <SMCard>
        <SMCardHead title="Store Performance"
          right={
            <View className="flex-row bg-cream rounded-full p-0.5 border border-line">
              {PERF_RANGES.map(([k, l]) => (
                <Pressable key={k} onPress={() => setPerfDays(k)} accessibilityRole="button" accessibilityLabel={`Last ${k} days`}
                  className={cn('px-2.5 py-1 rounded-full', perfDays === k && 'bg-primary')}>
                  <Text className={cn('text-[11px] font-bold', perfDays === k ? 'text-white' : 'text-muted')}>{l}</Text>
                </Pressable>
              ))}
            </View>
          } />
        <Text className="text-[11px] text-muted mb-2">Last {perfDays} days vs the {perfDays} days before</Text>
        <View className="flex-row gap-2" style={{ opacity: performance.loading ? 0.5 : 1 }}>
          {perf.map((p) => {
            const value = pf?.growth[p.key];
            const current = pf?.current[p.key] ?? 0;
            const negative = typeof value === 'number' && value < 0;
            return (
              <View key={p.label} className="flex-1 rounded-xl border border-line bg-white py-2 items-center">
                <Ionicons name={p.icon} size={17} color={p.fg} />
                <Text className={cn('text-[15px] font-black mt-0.5', negative ? 'text-red-500' : 'text-ink')}>{pf ? growthText(value, current) : '–'}</Text>
                <Text className="text-[10px] text-muted text-center" numberOfLines={1}>{p.label}</Text>
                {!!pf && <Text className="text-[9.5px] text-muted text-center mt-0.5" numberOfLines={1}>{p.fmt(current)}</Text>}
              </View>
            );
          })}
        </View>
      </SMCard>
    </ScrollView>
  );
}
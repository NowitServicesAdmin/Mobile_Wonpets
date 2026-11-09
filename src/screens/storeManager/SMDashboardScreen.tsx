import React from 'react';
import { Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme';
import { Chip, Empty, Gradient, cn } from '../../components/ui';
import { Avatar } from '../../components/Avatar';
import { DashboardSkeleton } from '../../components/Skeletons';
import { GRADIENT_FILL, Panel, PanelHeader, TONES, DTone } from '../../components/doctor/DoctorUI';
import { AreaChart, Bar, Donut, Legend, LoadError, OfferBadge, OrderBadge, inr0, inrShort } from '../../components/storeManager/SMUI';
import { useRemote } from '../../hooks/useRemote';
import { smService } from '../../services/storeManager.service';
import { useStoreManager } from '../../context/StoreManagerContext';
import { useSettings } from '../../context/SettingsContext';
import { useAuth } from '../../context/AuthContext';

type Icon = keyof typeof Ionicons.glyphMap;

/** Same shortcuts as the web dashboard's "Quick Actions" panel (+ Reviews, so the grid is even). */
const QUICK: { title: string; icon: Icon; tone: DTone; go: string; params?: object }[] = [
  { title: 'Add Product', icon: 'add-circle', tone: 'green', go: 'SMProductForm' },
  { title: 'Inventory', icon: 'cube', tone: 'orange', go: 'SMInventory' },
  { title: 'Orders', icon: 'clipboard', tone: 'purple', go: 'SMOrders' },
  { title: 'Categories', icon: 'grid', tone: 'blue', go: 'SMCategories' },
  { title: 'Create Offer', icon: 'pricetag', tone: 'red', go: 'SMOfferForm' },
  { title: 'Sales Report', icon: 'bar-chart', tone: 'amber', go: 'SMReports' },
  { title: 'Customers', icon: 'people', tone: 'green', go: 'SMCustomers' },
  { title: 'Reviews', icon: 'star', tone: 'pink', go: 'SMReviews' },
];
const ORDER_COLORS = ['#F97316', '#3B82F6', '#8B5CF6', '#22C55E'];

/** Store dashboard - the web SMDashboard stacked for a phone. */
export default function SMDashboardScreen({ navigation }: any) {
  const { tick } = useStoreManager();
  const { user } = useAuth();
  const { info, ready, documents } = useSettings();
  const dash = useRemote(() => smService.dashboard(), [], tick);
  const d = dash.data;

  if (dash.loading && !d) return <DashboardSkeleton />;
  if (dash.error && !d) return <LoadError message={dash.error} onRetry={dash.reload} />;
  if (!d) return null;

  const openProfile = (open: string) => navigation.navigate('SMProfile', { open, at: Date.now() });
  const todo: { key: string; label: string }[] = [];
  if (!user?.email || !user?.phone) todo.push({ key: 'profile', label: !user?.email ? 'Add email' : 'Add mobile' });
  if (ready && (!info.storeName?.trim() || !info.location)) todo.push({ key: 'store', label: 'Store details' });
  if (ready && ['business', 'gst', 'identity'].some((k) => !documents[k])) todo.push({ key: 'documents', label: 'Upload documents' });

  const stats: { title: string; caption: string; value: string | number; icon: Icon; tone: DTone; grad: keyof typeof GRADIENT_FILL; go: () => void }[] = [
    { title: 'Total Revenue', caption: 'Delivered sales', value: inrShort(d.stats.revenue), icon: 'wallet', tone: 'orange', grad: 'orange', go: () => navigation.navigate('SMEarnings') },
    { title: 'Total Orders', caption: 'All time', value: d.stats.totalOrders, icon: 'cart', tone: 'purple', grad: 'purple', go: () => navigation.navigate('SMOrders') },
    { title: 'Products', caption: 'Listed in store', value: d.stats.totalProducts, icon: 'cube', tone: 'blue', grad: 'blue', go: () => navigation.navigate('SMProducts') },
    { title: 'Customers', caption: 'Who bought', value: d.stats.totalCustomers, icon: 'people', tone: 'green', grad: 'green', go: () => navigation.navigate('SMCustomers') },
  ];
  const statusData = [
    { label: 'Pending', value: d.orderStatus.pending, color: ORDER_COLORS[0] },
    { label: 'Processing', value: d.orderStatus.processing, color: ORDER_COLORS[1] },
    { label: 'Shipped', value: d.orderStatus.shipped, color: ORDER_COLORS[2] },
    { label: 'Delivered', value: d.orderStatus.delivered, color: ORDER_COLORS[3] },
  ];
  const inv = [
    { label: 'In Stock', value: d.inventory.inStock, color: '#268FF1' },
    { label: 'Low Stock', value: d.inventory.lowStock, color: '#F59E0B' },
    { label: 'Out of Stock', value: d.inventory.outOfStock, color: '#EF4444' },
  ];
  const invTotal = inv.reduce((s, x) => s + x.value, 0);
  const topMax = d.topProducts[0]?.sold || 1;

  return (
    <ScrollView className="flex-1 bg-cream" contentContainerClassName="p-4 gap-4 pb-10"
      refreshControl={<RefreshControl refreshing={dash.refreshing} onRefresh={dash.reload} tintColor={colors.primary} />}>

      {/* only while something is still missing */}
      {todo.length > 0 && (
        <View className="bg-primary-soft rounded-3xl border border-orange-100 p-3.5 gap-2.5">
          <View className="flex-row items-center gap-2"><Ionicons name="sparkles-outline" size={16} color={colors.primary} /><Text className="flex-1 text-[14px] font-extrabold text-ink">Finish setting up your store</Text></View>
          <View className="flex-row flex-wrap gap-2">{todo.map((t) => <Chip key={t.key} tone="white" label={`+ ${t.label}`} onPress={() => openProfile(t.key)} />)}</View>
        </View>
      )}

      {/* stat cards */}
      <View className="flex-row flex-wrap gap-3">
        {stats.map((s) => (
          <Pressable key={s.title} onPress={s.go} accessibilityRole="button" accessibilityLabel={`${s.title}: ${s.value}`} className="w-[48.4%] active:opacity-90">
            <Gradient className="rounded-2xl px-3.5 py-3 flex-row items-center gap-2.5 overflow-hidden" colorsArr={GRADIENT_FILL[s.grad]}>
              <View className={cn('w-11 h-11 rounded-xl items-center justify-center', TONES[s.tone].soft)}><Ionicons name={s.icon} size={20} color={TONES[s.tone].fg} /></View>
              <View className="flex-1">
                <Text className="text-[12px] text-gray-700" numberOfLines={1}>{s.title}</Text>
                <Text className="text-[22px] font-bold text-slate-800 leading-7" numberOfLines={1} adjustsFontSizeToFit>{s.value}</Text>
                <Text className="text-[10px] text-gray-600" numberOfLines={1}>{s.caption}</Text>
              </View>
            </Gradient>
          </Pressable>
        ))}
      </View>

      {/* low stock alert */}
      <Pressable onPress={() => navigation.navigate('SMInventory')} accessibilityRole="button" className="flex-row items-center gap-3 rounded-2xl bg-orange-50 border border-orange-200 p-3.5 active:opacity-80">
        <View className="w-11 h-11 rounded-xl bg-orange-100 items-center justify-center"><Ionicons name="warning" size={20} color="#F97316" /></View>
        <View className="flex-1">
          <Text className="text-[14px] font-bold text-slate-800">Low Stock Items</Text>
          <Text className="text-[11.5px] text-slate-500">Items requiring immediate attention</Text>
        </View>
        <View className="bg-red-100 rounded-full px-2.5 py-1"><Text className="text-red-600 text-[11px] font-bold">{d.lowStock.length} Products</Text></View>
        <Ionicons name="chevron-forward" size={18} color="#F97316" />
      </Pressable>

      {/* quick actions */}
      <Panel>
        <PanelHeader title="Quick Actions" caption="Jump straight to your most common tasks" />
        <View className="flex-row flex-wrap gap-2.5">
          {QUICK.map((q) => (
            <Pressable key={q.title} onPress={() => navigation.navigate(q.go, q.params)} accessibilityRole="button" className="w-[22.8%] rounded-xl border border-slate-100 bg-white py-2.5 items-center gap-1.5 active:bg-orange-50">
              <View className={cn('w-11 h-11 rounded-xl items-center justify-center', TONES[q.tone].soft)}><Ionicons name={q.icon} size={19} color={TONES[q.tone].fg} /></View>
              <Text className="text-[10.5px] leading-[13px] font-semibold text-slate-700 text-center px-0.5" numberOfLines={2}>{q.title}</Text>
            </Pressable>
          ))}
        </View>
      </Panel>

      {/* sales overview */}
      <Panel>
        <PanelHeader icon="trending-up" title="Sales Overview" caption="Monthly revenue" action="Earnings" onAction={() => navigation.navigate('SMEarnings')} />
        <Text className="text-[26px] font-black text-ink">{inr0(d.stats.revenue)}</Text>
        <Text className="text-xs text-muted mb-3">Total delivered revenue</Text>
        <AreaChart data={d.revenue} format={inr0} />
      </Panel>

      {/* order status */}
      <Panel>
        <PanelHeader icon="pie-chart" tone="purple" title="Order Status" caption="Where your orders are right now" />
        <Donut data={statusData} centerValue={statusData.reduce((s, x) => s + x.value, 0)} centerLabel="Total Orders" />
        <Legend data={statusData} />
      </Panel>

      {/* recent orders */}
      <Panel>
        <PanelHeader icon="receipt" tone="blue" title="Recent Orders" action="View All" onAction={() => navigation.navigate('SMOrders')} />
        {d.recentOrders.length ? (
          <View className="gap-2">
            {d.recentOrders.slice(0, 4).map((o) => (
              <Pressable key={o.id} onPress={() => navigation.navigate('SMOrderDetail', { id: o.id })} accessibilityRole="button" className="flex-row items-center gap-3 p-2.5 rounded-xl border border-slate-100 active:bg-orange-50">
                <View className="w-10 h-10 rounded-full bg-orange-100 items-center justify-center"><Text className="text-orange-500 font-bold">{o.customer.name.charAt(0).toUpperCase()}</Text></View>
                <View className="flex-1">
                  <Text className="font-bold text-slate-800" numberOfLines={1}>{o.orderId}</Text>
                  <Text className="text-xs text-slate-500" numberOfLines={1}>{o.customer.name} · {o.items.length} item{o.items.length === 1 ? '' : 's'}</Text>
                </View>
                <View className="items-end gap-1"><Text className="font-bold text-slate-800">{inr0(o.total)}</Text><OrderBadge status={o.status} /></View>
              </Pressable>
            ))}
          </View>
        ) : <Empty emoji="🛒" title="No recent orders" body="New orders will show up here." />}
      </Panel>

      {/* top selling */}
      <Panel>
        <PanelHeader icon="flame" tone="red" title="Top Selling Items" />
        {d.topProducts.length ? (
          <View className="gap-2">
            {d.topProducts.slice(0, 6).map((p) => (
              <View key={p.id} className="flex-row items-center gap-3 p-2.5 rounded-xl border border-slate-100">
                <View className="w-10 h-10 rounded-xl bg-orange-100 items-center justify-center"><Text className="text-orange-600 font-bold">{p.name.charAt(0).toUpperCase()}</Text></View>
                <View className="flex-1">
                  <Text className="font-semibold text-slate-800" numberOfLines={1}>{p.name}</Text>
                  <Text className="text-[11px] text-slate-400">{p.sold} sold · {inr0(p.price)}</Text>
                  <Bar ratio={p.sold / topMax} className="mt-1.5" />
                </View>
                <View className="items-end"><Text className="text-[11px] text-slate-500">Revenue</Text><Text className="font-bold text-green-600">{inrShort(p.revenue)}</Text></View>
              </View>
            ))}
          </View>
        ) : <Empty emoji="📦" title="No products sold yet" />}
      </Panel>

      {/* inventory */}
      <Panel>
        <PanelHeader icon="cube" tone="blue" title="Inventory Summary" caption="Product availability overview" action="Manage" onAction={() => navigation.navigate('SMInventory')} />
        <Donut data={inv} centerValue={invTotal} centerLabel="Products" />
        <View className="flex-row gap-2.5 mt-4">
          {inv.map((x) => (
            <View key={x.label} className="flex-1 rounded-2xl border border-slate-100 bg-slate-50 py-2.5 items-center">
              <View style={{ backgroundColor: x.color }} className="w-2.5 h-2.5 rounded-full mb-1" />
              <Text className="text-lg font-bold text-slate-800">{x.value}</Text>
              <Text className="text-[10.5px] text-slate-500">{x.label}</Text>
            </View>
          ))}
        </View>
      </Panel>

      {/* offers */}
      <Panel>
        <PanelHeader icon="pricetags" tone="orange" title="Active Offers" caption={`${d.offerStats.active} running now`} action="Manage" onAction={() => navigation.navigate('SMOffers')} />
        <View className="flex-row flex-wrap gap-2 mb-3">
          {([['Total', d.offerStats.total, 'text-orange-600', 'bg-orange-50'], ['Active', d.offerStats.active, 'text-green-600', 'bg-green-50'], ['Scheduled', d.offerStats.scheduled, 'text-blue-600', 'bg-blue-50'], ['Expired', d.offerStats.expired, 'text-red-600', 'bg-red-50']] as const).map(([k, v, fg, bg]) => (
            <View key={k} className={cn('w-[48.5%] rounded-xl py-2.5 items-center', bg)}><Text className="text-[11px] text-slate-500">{k}</Text><Text className={cn('text-xl font-bold', fg)}>{v}</Text></View>
          ))}
        </View>
        {d.topOffers.length ? (
          <View className="gap-2.5">
            {d.topOffers.map((o) => (
              <Pressable key={o.id} onPress={() => navigation.navigate('SMOfferForm', { id: o.id })} className="flex-row items-center gap-3 rounded-2xl bg-orange-50 border border-orange-100 p-3 overflow-hidden active:opacity-80">
                <View className="absolute left-0 top-0 bottom-0 w-1.5 bg-orange-500" />
                <View className="flex-1 pl-1.5">
                  <View className="flex-row items-center gap-1.5"><Ionicons name="pricetag" size={14} color="#F97316" /><Text className="font-bold text-slate-800">{o.code}</Text></View>
                  <Text className="text-xs text-slate-500" numberOfLines={1}>{o.title}</Text>
                </View>
                <View className="items-end gap-1">
                  <Text className="font-black text-slate-800">{o.discountType === 'Percentage' ? `${o.discount}% OFF` : `₹${o.discount} OFF`}</Text>
                  <OfferBadge status={o.status} />
                </View>
              </Pressable>
            ))}
          </View>
        ) : <Empty emoji="🏷️" title="No offers yet" body="Create a coupon to boost sales." />}
      </Panel>

      {/* low stock list */}
      {d.lowStock.length > 0 && (
        <Panel>
          <PanelHeader icon="alert-circle" tone="red" title="Reorder Soon" action="Inventory" onAction={() => navigation.navigate('SMInventory')} />
          <View className="gap-2">
            {d.lowStock.slice(0, 5).map((p) => (
              <View key={p.id} className="flex-row items-center gap-3">
                <Avatar image={p.images[0]} emoji={p.itemType === 'pet' ? '🐾' : '📦'} size={38} square />
                <Text className="flex-1 font-semibold text-slate-700" numberOfLines={1}>{p.name}</Text>
                <View className="w-10 h-10 rounded-xl bg-red-100 items-center justify-center"><Text className="text-red-600 font-bold">{p.stock}</Text></View>
              </View>
            ))}
          </View>
        </Panel>
      )}
    </ScrollView>
  );
}

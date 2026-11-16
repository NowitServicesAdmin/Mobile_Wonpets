import React from 'react';
import { Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme';
import { Chip, Empty, Gradient, cn } from '../../components/ui';
import { Avatar } from '../../components/Avatar';
import { DashboardSkeleton } from '../../components/Skeletons';
import { Panel, PanelHeader, TONES, WebStatGrid, DTone } from '../../components/doctor/DoctorUI';
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


const greeting = () => {
  const h = new Date().getHours();
  return h < 12 ? 'Good Morning,' : h < 17 ? 'Good Afternoon,' : 'Good Evening,';
};

/** Hero card in the owner / doctor dashboard style: cream gradient, big orange name, round photo and a white quick-stats strip. */
function SMHero({ name, store, image, pending, revenue, onOrders, onEarnings }: {
  name: string; store?: string; image?: string | null; pending: number; revenue: string; onOrders: () => void; onEarnings: () => void;
}) {
  return (
    <Gradient colorsArr={['#FFEFCE', '#FFFFFF']} className="rounded-3xl p-4 border border-[#F2C46D] overflow-hidden">
      <Chip label={`${pending} ${pending === 1 ? 'Order' : 'Orders'} Waiting`} tone="white" />
      <View className="flex-row items-center gap-3 mt-3.5">
        <View className="flex-1">
          <Text maxFontSizeMultiplier={1.1} className="text-[15px] font-semibold text-muted">{greeting()}</Text>
          <Text maxFontSizeMultiplier={1.1} className="text-[26px] font-black text-primary leading-8" numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>{name} 👋</Text>
          <Text maxFontSizeMultiplier={1.1} className="text-[13px] text-muted leading-[18px] mt-1.5" numberOfLines={3}>
            {pending ? `${store ? `${store} has` : 'Your store has'} orders to process. ` : 'All caught up on orders. '}<Text className="text-green font-bold">Happy selling.</Text> 🧡
          </Text>
        </View>
        <View className="rounded-full p-1 bg-orange-300">
          <View className="rounded-full bg-white p-1"><Avatar image={image} emoji="🏪" size={92} /></View>
        </View>
      </View>
      <View className="flex-row bg-white rounded-2xl border border-line mt-3.5 py-3">
        <Pressable onPress={onOrders} accessibilityRole="button" className="flex-1 flex-row items-center justify-center gap-2.5 border-r border-line px-2 active:opacity-70">
          <View className="w-9 h-9 rounded-full bg-purple-soft items-center justify-center"><Ionicons name="clipboard-outline" size={18} color={colors.purple} /></View>
          <View className="flex-shrink">
            <Text maxFontSizeMultiplier={1.1} className="font-extrabold text-ink text-[15px]" numberOfLines={1}>{pending}</Text>
            <Text maxFontSizeMultiplier={1.1} className="text-[11px] text-muted" numberOfLines={1}>Pending orders</Text>
          </View>
        </Pressable>
        <Pressable onPress={onEarnings} accessibilityRole="button" className="flex-1 flex-row items-center justify-center gap-2.5 px-2 active:opacity-70">
          <View className="w-9 h-9 rounded-full bg-green-soft items-center justify-center"><Ionicons name="trending-up" size={18} color={colors.green} /></View>
          <View className="flex-shrink">
            <Text maxFontSizeMultiplier={1.1} className="font-extrabold text-ink text-[15px]" numberOfLines={1}>{revenue}</Text>
            <Text maxFontSizeMultiplier={1.1} className="text-[11px] text-muted" numberOfLines={1}>Revenue earned</Text>
          </View>
        </Pressable>
      </View>
    </Gradient>
  );
}

/** Store dashboard - the web SMDashboard stacked for a phone, in the same layout as the doctor dashboard. */
export default function SMDashboardScreen({ navigation }: any) {
  const { tick, pendingOrders } = useStoreManager();
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

  const stats: { title: string; caption: string; value: string | number; icon: Icon; tone: DTone; go: () => void }[] = [
    { title: 'Total Revenue', caption: 'Delivered sales', value: inrShort(d.stats.revenue), icon: 'wallet', tone: 'orange', go: () => navigation.navigate('SMEarnings') },
    { title: 'Total Orders', caption: 'All time', value: d.stats.totalOrders, icon: 'cart', tone: 'purple', go: () => navigation.navigate('SMOrders') },
    { title: 'Products', caption: 'Listed in store', value: d.stats.totalProducts, icon: 'cube', tone: 'blue', go: () => navigation.navigate('SMProducts') },
    { title: 'Customers', caption: 'Who bought', value: d.stats.totalCustomers, icon: 'people', tone: 'green', go: () => navigation.navigate('SMCustomers') },
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
        <View className="bg-primary-soft rounded-3xl border border-line p-3.5 gap-2.5">
          <View className="flex-row items-center gap-2"><Ionicons name="sparkles-outline" size={16} color={colors.primary} /><Text className="flex-1 text-[14px] font-extrabold text-ink">Finish setting up your store</Text></View>
          <View className="flex-row flex-wrap gap-2">{todo.map((t) => <Chip key={t.key} tone="white" label={`+ ${t.label}`} onPress={() => openProfile(t.key)} />)}</View>
        </View>
      )}

      <SMHero
        name={(user?.name ?? 'there').trim().split(' ')[0]} store={info.storeName?.trim()} image={user?.profileImage}
        pending={pendingOrders} revenue={inrShort(d.stats.revenue)}
        onOrders={() => navigation.navigate('SMOrders')} onEarnings={() => navigation.navigate('SMEarnings')} />

      {/* stat cards */}
      <WebStatGrid stats={stats.map((st) => ({ title: st.title, caption: st.caption, value: st.value, icon: st.icon, tone: st.tone, onPress: st.go }))} />

      {/* low stock alert */}
      <Pressable onPress={() => navigation.navigate('SMInventory')} accessibilityRole="button" className="flex-row items-center gap-3 rounded-3xl bg-white border border-amber-200 p-3.5 active:bg-primary-soft">
        <View className="w-11 h-11 rounded-full bg-amber-100 items-center justify-center"><Ionicons name="warning" size={20} color="#F59E0B" /></View>
        <View className="flex-1">
          <Text className="text-[14px] font-bold text-ink">Low Stock Items</Text>
          <Text className="text-[11.5px] text-muted">Items requiring immediate attention</Text>
        </View>
        <View className="bg-red-100 rounded-full px-2.5 py-1"><Text className="text-red-600 text-[11px] font-bold">{d.lowStock.length} Products</Text></View>
        <Ionicons name="chevron-forward" size={18} color="#F97316" />
      </Pressable>

      {/* quick actions */}
      <Panel>
        <PanelHeader icon="flash" tone="orange" title="Quick Actions" caption="Jump straight to your most common tasks" />
        <View className="flex-row flex-wrap gap-2.5">
          {QUICK.map((q) => (
            <Pressable key={q.title} onPress={() => navigation.navigate(q.go, q.params)} accessibilityRole="button" className="w-[22.8%] rounded-2xl border border-line bg-white py-2.5 items-center gap-1.5 active:bg-primary-soft">
              <View className={cn('w-11 h-11 rounded-full items-center justify-center', TONES[q.tone].soft)}><Ionicons name={q.icon} size={19} color={TONES[q.tone].fg} /></View>
              <Text className="text-[10.5px] leading-[13px] font-bold text-ink text-center px-0.5" numberOfLines={2}>{q.title}</Text>
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
              <Pressable key={o.id} onPress={() => navigation.navigate('SMOrderDetail', { id: o.id })} accessibilityRole="button" className="flex-row items-center gap-3 p-2.5 rounded-2xl border border-line active:bg-primary-soft">
                <View className="w-10 h-10 rounded-full bg-orange-100 items-center justify-center"><Text className="text-primary font-bold">{o.customer.name.charAt(0).toUpperCase()}</Text></View>
                <View className="flex-1">
                  <Text className="font-bold text-ink" numberOfLines={1}>{o.orderId}</Text>
                  <Text className="text-xs text-muted" numberOfLines={1}>{o.customer.name} · {o.items.length} item{o.items.length === 1 ? '' : 's'}</Text>
                </View>
                <View className="items-end gap-1"><Text className="font-bold text-ink">{inr0(o.total)}</Text><OrderBadge status={o.status} /></View>
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
              <View key={p.id} className="flex-row items-center gap-3 p-2.5 rounded-2xl border border-line">
                <View className="w-10 h-10 rounded-full bg-orange-100 items-center justify-center"><Text className="text-orange-600 font-bold">{p.name.charAt(0).toUpperCase()}</Text></View>
                <View className="flex-1">
                  <Text className="font-semibold text-ink" numberOfLines={1}>{p.name}</Text>
                  <Text className="text-[11px] text-muted">{p.sold} sold · {inr0(p.price)}</Text>
                  <Bar ratio={p.sold / topMax} className="mt-1.5" />
                </View>
                <View className="items-end"><Text className="text-[11px] text-muted">Revenue</Text><Text className="font-bold text-green-600">{inrShort(p.revenue)}</Text></View>
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
            <View key={x.label} className="flex-1 rounded-2xl border border-line bg-cream py-2.5 items-center">
              <View style={{ backgroundColor: x.color }} className="w-2.5 h-2.5 rounded-full mb-1" />
              <Text className="text-lg font-bold text-ink">{x.value}</Text>
              <Text className="text-[10.5px] text-muted">{x.label}</Text>
            </View>
          ))}
        </View>
      </Panel>

      {/* offers */}
      <Panel>
        <PanelHeader icon="pricetags" tone="orange" title="Active Offers" caption={`${d.offerStats.active} running now`} action="Manage" onAction={() => navigation.navigate('SMOffers')} />
        <View className="flex-row flex-wrap gap-2 mb-3">
          {([['Total', d.offerStats.total, 'text-orange-600', 'bg-orange-50'], ['Active', d.offerStats.active, 'text-green-600', 'bg-green-50'], ['Scheduled', d.offerStats.scheduled, 'text-blue-600', 'bg-blue-50'], ['Expired', d.offerStats.expired, 'text-red-600', 'bg-red-50']] as const).map(([k, v, fg, bg]) => (
            <View key={k} className={cn('w-[48.5%] rounded-xl py-2.5 items-center', bg)}><Text className="text-[11px] text-muted">{k}</Text><Text className={cn('text-xl font-bold', fg)}>{v}</Text></View>
          ))}
        </View>
        {d.topOffers.length ? (
          <View className="gap-2.5">
            {d.topOffers.map((o) => (
              <Pressable key={o.id} onPress={() => navigation.navigate('SMOfferForm', { id: o.id })} className="flex-row items-center gap-3 rounded-2xl bg-orange-50 border border-line p-3 overflow-hidden active:opacity-80">
                <View className="absolute left-0 top-0 bottom-0 w-1.5 bg-orange-500" />
                <View className="flex-1 pl-1.5">
                  <View className="flex-row items-center gap-1.5"><Ionicons name="pricetag" size={14} color="#F97316" /><Text className="font-bold text-ink">{o.code}</Text></View>
                  <Text className="text-xs text-muted" numberOfLines={1}>{o.title}</Text>
                </View>
                <View className="items-end gap-1">
                  <Text className="font-black text-ink">{o.discountType === 'Percentage' ? `${o.discount}% OFF` : `₹${o.discount} OFF`}</Text>
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
                <Text className="flex-1 font-semibold text-ink" numberOfLines={1}>{p.name}</Text>
                <View className="w-10 h-10 rounded-xl bg-red-100 items-center justify-center"><Text className="text-red-600 font-bold">{p.stock}</Text></View>
              </View>
            ))}
          </View>
        </Panel>
      )}
    </ScrollView>
  );
}

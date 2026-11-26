import React, { useState } from 'react';
import { Pressable, RefreshControl, ScrollView, Share, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme';
import { Empty } from '../../components/ui';
import { DashboardSkeleton } from '../../components/Skeletons';
import { toast } from '../../components/WonPetsAlert';
import { AreaChart, Donut, LoadError, SMCard, SMCardHead, SMPills, SMStat, SMStatGrid, SMTitle, SM_PAD, SM_TINT, inr0, inrShort, numShort } from '../../components/storeManager/SMUI';
import { useRemote } from '../../hooks/useRemote';
import { Reports, smService } from '../../services/storeManager.service';
import { useStoreManager } from '../../context/StoreManagerContext';

type Tab = 'revenue' | 'orders' | 'products' | 'customers';
const TABS: { key: Tab; label: string }[] = [{ key: 'revenue', label: 'Revenue' }, { key: 'orders', label: 'Orders' }, { key: 'products', label: 'Products' }, { key: 'customers', label: 'Customers' }];
const csv = (v: unknown) => { const s = String(v ?? ''); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
const stamp = () => new Date().toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });

/** Plain-text report (what the web PDF contains), for the share sheet. */
const reportText = (r: Reports) => [
  'WONPET - Store Report', `Generated on ${stamp()}`, '',
  `Delivered revenue: ${inr0(r.summary.revenue)}`, `Completed orders: ${r.summary.orders}`, `Products sold: ${r.summary.productsSold}`, `Unique customers: ${r.summary.customers}`, '',
  'MONTHLY TREND', ...r.monthly.map((m) => `${m.month}: ${inr0(m.revenue)} · ${m.orders} orders · ${m.products} products · ${m.customers} customers`), '',
  'TOP PRODUCTS', ...r.topProducts.map((p, i) => `${i + 1}. ${p.name} - ${p.sold} sold - ${inr0(p.revenue)}`),
].join('\n');
/** Spreadsheet-ready CSV (the web Excel export's three sheets, one after another). */
const reportCsv = (r: Reports) => [
  'Metric,Value', `Delivered Revenue (INR),${r.summary.revenue}`, `Completed Orders,${r.summary.orders}`, `Products Sold,${r.summary.productsSold}`, `Unique Customers,${r.summary.customers}`, '',
  'Month,Revenue (INR),Orders,Products Sold,Customers', ...r.monthly.map((m) => [m.month, m.revenue, m.orders, m.products, m.customers].map(csv).join(',')), '',
  'Rank,Product,Units Sold,Revenue (INR)', ...r.topProducts.map((p, i) => [i + 1, p.name, p.sold, p.revenue].map(csv).join(',')),
].join('\n');

/** Reports & Analytics (web ReportsPage): delivered totals, monthly trend per metric, top products, export. */
export default function SMReportsScreen() {
  const { tick } = useStoreManager();
  const q = useRemote(() => smService.reports(), [], tick);
  const [tab, setTab] = useState<Tab>('revenue');

  if (q.loading && !q.data) return <DashboardSkeleton />;
  if (q.error && !q.data) return <LoadError message={q.error} onRetry={q.reload} />;
  const r = q.data!;
  const s = r.summary;

  const series = r.monthly.map((m) => ({ label: m.month.slice(0, 3), value: m[tab] }));
  const total = tab === 'revenue' ? inrShort(s.revenue) : numShort(tab === 'orders' ? s.orders : tab === 'products' ? s.productsSold : s.customers);
  const fmt = tab === 'revenue' ? inrShort : numShort;
  const growth = (k: 'revenue' | 'orders' | 'products' | 'customers') => {
    const m = r.monthly; if (m.length < 2) return undefined;
    const [p, c] = [m[m.length - 2][k], m[m.length - 1][k]];
    if (!p) return undefined;
    const v = Math.round(((c - p) / p) * 100);
    return { label: `${v >= 0 ? '+' : ''}${v}%`, up: v >= 0 };
  };
  const soldTotal = s.productsSold || r.topProducts.reduce((a, p) => a + p.sold, 0);
  const PIE = ['#F97316', '#8B5CF6', '#22C55E', '#3B82F6', '#EC4899', '#F59E0B'];
  const stats: SMStat[] = [
    { title: 'Revenue', value: inrShort(s.revenue), icon: 'cash', ...SM_TINT.orange, chip: growth('revenue') },
    { title: 'Orders', value: numShort(s.orders), icon: 'bag-check', ...SM_TINT.purple, chip: growth('orders') },
    { title: 'Products Sold', value: numShort(s.productsSold), icon: 'cube', ...SM_TINT.green, chip: growth('products') },
    { title: 'Customers', value: numShort(s.customers), icon: 'people', ...SM_TINT.blue, chip: growth('customers') },
  ];

  const share = async (kind: 'text' | 'csv') => {
    try {
      await Share.share({ title: 'WONPET Store Report', message: kind === 'csv' ? reportCsv(r) : reportText(r) });
    } catch { toast.error('Could not open the share sheet.'); }
  };

  const label = TABS.find((t) => t.key === tab)?.label;
  return (
    <ScrollView className="flex-1 bg-cream" contentContainerClassName={SM_PAD}
      refreshControl={<RefreshControl refreshing={q.refreshing} onRefresh={q.reload} tintColor={colors.primary} />}>
      <SMTitle title="Reports & Analytics" subtitle="Track your store performance and insights"
        right={
          <View className="flex-row gap-1.5">
            {([['text', 'PDF', 'document-text', '#EF4444'], ['csv', 'Excel', 'grid', '#16A34A']] as const).map(([k, l, icon, fg]) => (
              <Pressable key={k} onPress={() => share(k)} accessibilityRole="button" accessibilityLabel={`Export ${l}`} className="flex-row items-center gap-1 rounded-xl border border-line bg-white px-2.5 py-1.5 active:bg-primary-soft">
                <Ionicons name={icon} size={14} color={fg} /><Text className="text-[11.5px] font-bold text-ink">{l}</Text>
              </Pressable>
            ))}
          </View>
        } />
      <SMStatGrid stats={stats} />

      <SMCard>
        <SMPills value={tab} onChange={setTab} options={TABS} />
        <View className="flex-row items-center justify-between mt-2.5 mb-1">
          <View><Text className="text-[13px] font-extrabold text-ink">{label} Overview</Text><Text className="text-[11px] text-muted">Monthly performance trend</Text></View>
          <Text className="text-[18px] font-black text-ink">{total}</Text>
        </View>
        {series.length ? <AreaChart data={series} format={fmt} height={130} /> : <Empty emoji="📈" title="No data yet" body="Delivered orders build up this chart." />}
      </SMCard>

      <SMCard>
        <SMCardHead title="Top Selling Products" />
        {r.topProducts.length ? (
          <View className="flex-row items-center gap-3">
            <Donut size={110} stroke={15} centerValue={soldTotal} centerLabel="Sold"
              data={r.topProducts.map((p, i) => ({ label: p.name, value: p.sold, color: PIE[i % PIE.length] }))} />
            <View className="flex-1 gap-2">
              {r.topProducts.map((p, i) => (
                <View key={p.id} className="flex-row items-center gap-1.5">
                  <View style={{ backgroundColor: PIE[i % PIE.length] }} className="w-2.5 h-2.5 rounded-full" />
                  <View className="flex-1"><Text className="text-[12px] font-semibold text-ink" numberOfLines={1}>{p.name}</Text><Text className="text-[10.5px] text-muted">{numShort(p.sold)} sold</Text></View>
                  <Text className="text-[12.5px] font-bold text-ink">{soldTotal ? Math.round((p.sold / soldTotal) * 100) : 0}%</Text>
                </View>
              ))}
            </View>
          </View>
        ) : <Empty emoji="📦" title="No products sold yet" />}
      </SMCard>
    </ScrollView>
  );
}

import React, { useState } from 'react';
import { Pressable, RefreshControl, ScrollView, Share, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme';
import { Empty } from '../../components/ui';
import { DashboardSkeleton } from '../../components/Skeletons';
import { toast } from '../../components/WonPetsAlert';
import SegmentedTabs from '../../components/common/SegmentedTabs';
import { Panel, PanelHeader, WebStatGrid } from '../../components/doctor/DoctorUI';
import { AreaChart, Bar, LoadError, inr0 } from '../../components/storeManager/SMUI';
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
  const total = tab === 'revenue' ? inr0(s.revenue) : tab === 'orders' ? s.orders : tab === 'products' ? s.productsSold : s.customers;
  const fmt = tab === 'revenue' ? inr0 : (n: number) => String(n);
  const topMax = r.topProducts[0]?.revenue || 1;

  const share = async (kind: 'text' | 'csv') => {
    try {
      await Share.share({ title: 'WONPET Store Report', message: kind === 'csv' ? reportCsv(r) : reportText(r) });
    } catch { toast.error('Could not open the share sheet.'); }
  };

  return (
    <ScrollView className="flex-1 bg-cream" contentContainerClassName="p-4 gap-4 pb-10"
      refreshControl={<RefreshControl refreshing={q.refreshing} onRefresh={q.reload} tintColor={colors.primary} />}>
      <WebStatGrid stats={[
        { title: 'Revenue', value: inr0(s.revenue), icon: 'cash', tone: 'green', caption: 'Delivered revenue' },
        { title: 'Orders', value: s.orders, icon: 'bag-check', tone: 'blue', caption: 'Completed orders' },
        { title: 'Products Sold', value: s.productsSold, icon: 'cube', tone: 'orange', caption: 'Delivered units' },
        { title: 'Customers', value: s.customers, icon: 'people', tone: 'purple', caption: 'Unique customers' },
      ]} />

      <Panel>
        <SegmentedTabs tabs={TABS} value={tab} onChange={setTab} />
        <View className="mt-4 mb-3">
          <Text className="text-[13px] text-muted">{TABS.find((t) => t.key === tab)?.label} overview</Text>
          <Text className="text-[26px] font-black text-ink">{total}</Text>
        </View>
        {series.length ? <AreaChart data={series} format={fmt} /> : <Empty emoji="📈" title="No data yet" body="Delivered orders build up this chart." />}
      </Panel>

      <Panel>
        <PanelHeader icon="trophy" tone="amber" title="Top Products" caption="By delivered revenue" />
        {r.topProducts.length ? (
          <View className="gap-3">
            {r.topProducts.map((p, i) => (
              <View key={p.id} className="flex-row items-center gap-3">
                <View className="w-8 h-8 rounded-xl bg-orange-100 items-center justify-center"><Text className="font-black text-orange-600">{i + 1}</Text></View>
                <View className="flex-1">
                  <Text className="font-semibold text-slate-800" numberOfLines={1}>{p.name}</Text>
                  <Text className="text-[11px] text-slate-500">{p.sold} sold</Text>
                  <Bar ratio={p.revenue / topMax} className="mt-1" />
                </View>
                <Text className="font-bold text-green-600">{inr0(p.revenue)}</Text>
              </View>
            ))}
          </View>
        ) : <Empty emoji="📦" title="No products sold yet" />}
      </Panel>

      <Panel>
        <PanelHeader icon="download" tone="blue" title="Export" caption="Send the report to email, WhatsApp, Drive…" />
        <View className="gap-2.5">
          {([['text', 'Share report', 'Readable summary of this report', 'document-text', '#EF4444', '#FEE2E2'], ['csv', 'Share as CSV', 'Opens in Excel or Google Sheets', 'grid', '#16A34A', '#DCFCE7']] as const).map(([k, title, hint, icon, fg, bg]) => (
            <Pressable key={k} onPress={() => share(k)} accessibilityRole="button" className="flex-row items-center gap-3 rounded-2xl border border-slate-100 p-3 active:bg-orange-50">
              <View style={{ backgroundColor: bg }} className="w-11 h-11 rounded-xl items-center justify-center"><Ionicons name={icon} size={20} color={fg} /></View>
              <View className="flex-1"><Text className="font-bold text-slate-800">{title}</Text><Text className="text-xs text-slate-500">{hint}</Text></View>
              <Ionicons name="share-outline" size={19} color={colors.muted} />
            </Pressable>
          ))}
        </View>
      </Panel>
    </ScrollView>
  );
}

import React, { useState } from 'react';
import { Pressable, RefreshControl, ScrollView, Share, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme';
import { Empty, Gradient, cn } from '../../components/ui';
import { DashboardSkeleton } from '../../components/Skeletons';
import { toast } from '../../components/WonPetsAlert';
import { Panel, PanelHeader, TONES, DTone } from '../../components/doctor/DoctorUI';
import { AreaChart, Badge, Donut, Legend, LoadError, Sparkline, changeColor, changeLabel, inr0, inrShort } from '../../components/storeManager/SMUI';
import { useRemote } from '../../hooks/useRemote';
import { Earnings, smService } from '../../services/storeManager.service';
import { useStoreManager } from '../../context/StoreManagerContext';

type Icon = keyof typeof Ionicons.glyphMap;
type Range = 7 | 30 | 90;
const CARDS: { key: keyof Earnings['stats']; title: string; money: boolean; icon: Icon; tone: DTone }[] = [
  { key: 'revenue', title: 'Total Revenue', money: true, icon: 'wallet', tone: 'green' },
  { key: 'orders', title: 'Delivered Orders', money: false, icon: 'bag-check', tone: 'purple' },
  { key: 'net', title: 'Net Earnings', money: true, icon: 'cash', tone: 'orange' },
  { key: 'payouts', title: 'Total Payouts', money: true, icon: 'card', tone: 'pink' },
  { key: 'pending', title: 'Pending Payout', money: true, icon: 'time', tone: 'blue' },
];
const csv = (v: unknown) => { const s = String(v ?? ''); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };

/** Earnings Overview (web SMEarnings): stat cards with sparklines, revenue trend for 7/30/90 days, breakdown, summary, export. */
export default function SMEarningsScreen({ navigation }: any) {
  const { tick } = useStoreManager();
  const [range, setRange] = useState<Range>(7);
  const q = useRemote(() => smService.earnings(range), [range], tick);
  const d = q.data;

  const exportCsv = async () => {
    const rows = d?.transactions ?? [];
    if (!rows.length) return toast.error('No transactions to export yet.');
    const header = ['Order ID', 'Date', 'Order Status', 'Payment Method', 'Payment Status', 'Gross Amount', 'Platform Fee', 'Net Amount', 'Payout Status'];
    const lines = rows.map((r) => [r.orderId, new Date(r.date).toLocaleString('en-IN'), r.status, r.paymentMethod, r.paymentStatus, r.gross, r.platformFee, r.net, r.payoutStatus].map(csv).join(','));
    try { await Share.share({ title: 'Store earnings', message: [header.join(','), ...lines].join('\n') }); } catch { toast.error('Could not open the share sheet.'); }
  };

  if (q.loading && !d) return <DashboardSkeleton />;
  if (q.error && !d) return <LoadError message={q.error} onRetry={q.reload} />;
  if (!d) return null;

  const t = d.trend;
  const breakdownTotal = d.breakdown.reduce((s, b) => s + b.value, 0);
  const summary: [string, number][] = [
    ['Total Revenue', d.summary.totalRevenue], ['Net Earnings', d.summary.netEarnings], ['Total Payouts', d.summary.totalPayouts],
    ['Pending Payout', d.summary.pendingPayout], ['Platform Fees', d.summary.platformFees], ['COD Collected', d.summary.codCollected],
  ];

  return (
    <ScrollView className="flex-1 bg-cream" contentContainerClassName="p-4 gap-4 pb-10"
      refreshControl={<RefreshControl refreshing={q.refreshing} onRefresh={q.reload} tintColor={colors.primary} />}>
      {/* range + export */}
      <View className="flex-row items-center gap-2">
        <View className="flex-row bg-white border border-orange-100 rounded-2xl p-1 flex-1">
          {([7, 30, 90] as Range[]).map((r) => (
            <Pressable key={r} onPress={() => setRange(r)} className={cn('flex-1 py-2 rounded-xl items-center', range === r && 'bg-primary')}>
              <Text className={cn('font-bold text-[13px]', range === r ? 'text-white' : 'text-muted')}>{r} days</Text>
            </Pressable>
          ))}
        </View>
        <Pressable onPress={exportCsv} accessibilityRole="button" accessibilityLabel="Export transactions" className="h-11 px-3.5 rounded-2xl bg-ink flex-row items-center gap-1.5 active:opacity-80">
          <Ionicons name="download-outline" size={16} color="#fff" /><Text className="text-white font-bold text-[13px]">Export</Text>
        </Pressable>
      </View>

      {/* stat cards */}
      <View className="flex-row flex-wrap gap-3">
        {CARDS.map((c, i) => {
          const s = d.stats[c.key];
          const tn = TONES[c.tone];
          return (
            <View key={c.key} className={cn('bg-white rounded-2xl border border-orange-100 p-3.5', i === 0 ? 'w-full' : 'w-[48.4%]')}>
              <View className="flex-row items-center justify-between">
                <View className={cn('w-10 h-10 rounded-xl items-center justify-center', tn.soft)}><Ionicons name={c.icon} size={19} color={tn.fg} /></View>
                <Sparkline values={s.spark} color={tn.fg} width={i === 0 ? 120 : 64} />
              </View>
              <Text className="text-[12px] text-slate-500 mt-2">{c.title}</Text>
              <Text className="text-[22px] font-black text-slate-800" numberOfLines={1} adjustsFontSizeToFit>{c.money ? inr0(s.value) : s.value}</Text>
              <Text style={{ color: changeColor(s.change) }} className="text-[11.5px] font-bold">{changeLabel(s.change)} <Text className="text-slate-400 font-normal">vs prev {range}d</Text></Text>
            </View>
          );
        })}
      </View>

      {/* revenue trend */}
      <Panel>
        <PanelHeader icon="trending-up" title="Revenue Trend" caption="Daily revenue from delivered orders" />
        <View className="flex-row items-end justify-between mb-3">
          <View><Text className="text-xs text-muted">Last {range} days</Text><Text className="text-[24px] font-black text-ink">{inrShort(t.periodTotal)}</Text></View>
          <Badge label={changeLabel(t.change)} tone={(t.change ?? 0) >= 0 ? 'green' : 'red'} icon={(t.change ?? 0) >= 0 ? 'arrow-up' : 'arrow-down'} />
        </View>
        <AreaChart data={t.data} format={inr0} maxLabels={6} />
        <View className="flex-row mt-4 pt-3 border-t border-slate-100">
          {([['Average', `${inrShort(t.average)}/day`, colors.text], ['Peak day', inrShort(t.peak), colors.text], ['Growth', changeLabel(t.change), changeColor(t.change)]] as const).map(([k, v, c]) => (
            <View key={k} className="flex-1 items-center"><Text className="text-[11px] text-muted">{k}</Text><Text style={{ color: c }} className="text-[15px] font-extrabold">{v}</Text></View>
          ))}
        </View>
      </Panel>

      {/* breakdown */}
      <Panel>
        <PanelHeader icon="pie-chart" tone="purple" title="Earnings Breakdown" caption="Revenue distribution" />
        {d.breakdown.length ? (
          <>
            <Donut data={d.breakdown.map((b) => ({ label: b.name, value: b.value, color: b.color }))} centerValue={inrShort(breakdownTotal)} centerLabel="Total" />
            <Legend data={d.breakdown.map((b) => ({ label: b.name, value: b.value, color: b.color }))} format={inr0} />
          </>
        ) : <Empty emoji="🧾" title="Nothing to break down yet" />}
      </Panel>

      {/* summary */}
      <Panel>
        <PanelHeader icon="document-text" tone="blue" title="Payout Summary" caption="All-time totals" />
        <View className="gap-2.5">
          {summary.map(([k, v]) => (
            <View key={k} className="flex-row items-center justify-between bg-slate-50 rounded-xl px-3.5 py-2.5">
              <Text className="text-[13px] text-slate-500">{k}</Text><Text className="text-[15px] font-extrabold text-slate-800">{inr0(v)}</Text>
            </View>
          ))}
        </View>
        <View className="flex-row mt-3.5 gap-2.5">
          <View className="flex-1 bg-green-50 rounded-xl p-3"><Text className="text-[11px] text-slate-500">Success rate</Text><Text className="text-[18px] font-black text-green-600">{d.successRate}%</Text></View>
          <View className="flex-1 bg-orange-50 rounded-xl p-3"><Text className="text-[11px] text-slate-500">Growth</Text><Text style={{ color: changeColor(t.change) }} className="text-[18px] font-black">{changeLabel(t.change)}</Text></View>
        </View>
        <Pressable onPress={() => navigation.navigate('SMReports')} className="flex-row items-center justify-center gap-1.5 mt-3.5 py-2">
          <Text className="text-primary font-bold">View detailed reports</Text><Ionicons name="arrow-forward" size={15} color={colors.primary} />
        </Pressable>
      </Panel>

      {/* weekly banner */}
      <Gradient className="rounded-3xl p-4 overflow-hidden" colorsArr={['#FFF1E3', '#FFE0C2']}>
        <View className="flex-row items-center gap-2"><Text className="text-[22px]">🏆</Text><Text className="text-[16px] font-black text-ink flex-1">This week</Text></View>
        <Text className="text-[13px] text-slate-600 leading-5 mt-2">
          {d.weekly.change === null
            ? 'Your first delivered orders this week — keep it going!'
            : <>You earned <Text style={{ color: (d.weekly.change ?? 0) >= 0 ? colors.primary : colors.red }} className="font-extrabold">{Math.abs(d.weekly.change)}% {d.weekly.change >= 0 ? 'more' : 'less'}</Text> revenue than last week.</>}
        </Text>
        <View className="flex-row gap-2.5 mt-3">
          <View className="flex-1 bg-white/80 rounded-xl p-3"><Text className="text-[11px] text-slate-500">Weekly revenue</Text><Text className="text-[17px] font-black text-ink">{inrShort(d.weekly.revenue)}</Text></View>
          <View className="flex-1 bg-white/80 rounded-xl p-3"><Text className="text-[11px] text-slate-500">vs last week</Text><Text style={{ color: changeColor(d.weekly.change) }} className="text-[17px] font-black">{changeLabel(d.weekly.change)}</Text></View>
        </View>
      </Gradient>

      {/* recent transactions */}
      {d.transactions.length > 0 && (
        <Panel>
          <PanelHeader icon="swap-vertical" tone="green" title="Recent Transactions" caption="Latest delivered & paid orders" />
          <View className="gap-2">
            {d.transactions.slice(0, 8).map((r) => (
              <View key={`${r.orderId}-${r.date}`} className="flex-row items-center gap-3 border border-slate-100 rounded-xl p-2.5">
                <View className="flex-1">
                  <Text className="font-bold text-slate-800" numberOfLines={1}>{r.orderId}</Text>
                  <Text className="text-[11px] text-slate-500">{new Date(r.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} · {r.paymentMethod} · fee {inr0(r.platformFee)}</Text>
                </View>
                <View className="items-end gap-1"><Text className="font-extrabold text-green-600">{inr0(r.net)}</Text><Badge label={r.payoutStatus || '—'} tone={/paid|settled|complete/i.test(r.payoutStatus) ? 'green' : 'amber'} /></View>
              </View>
            ))}
          </View>
        </Panel>
      )}
    </ScrollView>
  );
}

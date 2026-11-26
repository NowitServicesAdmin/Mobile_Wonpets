import React, { useState } from 'react';
import { Pressable, RefreshControl, ScrollView, Share, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme';
import { Empty, Gradient, cn } from '../../components/ui';
import { DashboardSkeleton } from '../../components/Skeletons';
import { toast } from '../../components/WonPetsAlert';
import {
  AreaChart, Donut, LoadError, SMCard, SMCardHead, SMTitle, SM_PAD, SM_TINT, Sparkline, changeColor, changeLabel, inr0, inrShort, numShort,
} from '../../components/storeManager/SMUI';
import { useRemote } from '../../hooks/useRemote';
import { Earnings, smService } from '../../services/storeManager.service';
import { useStoreManager } from '../../context/StoreManagerContext';

type Icon = keyof typeof Ionicons.glyphMap;
type Range = 7 | 30 | 90;
const RANGES: { value: Range; label: string }[] = [{ value: 7, label: '7D' }, { value: 30, label: '30D' }, { value: 90, label: '90D' }];

/** The five stat cards of the web Earnings page (same order, same titles). */
const CARDS: { key: keyof Earnings['stats']; title: string; money: boolean; icon: Icon; tint: keyof typeof SM_TINT }[] = [
  { key: 'revenue', title: 'Total Revenue', money: true, icon: 'wallet', tint: 'green' },
  { key: 'orders', title: 'Delivered Orders', money: false, icon: 'bag-check', tint: 'purple' },
  { key: 'net', title: 'Net Earnings', money: true, icon: 'cash', tint: 'orange' },
  { key: 'payouts', title: 'Total Payouts', money: true, icon: 'card', tint: 'pink' },
  { key: 'pending', title: 'Pending Payout', money: true, icon: 'time', tint: 'blue' },
];
const csv = (v: unknown) => { const s = String(v ?? ''); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };

/** Earnings Overview (web SMEarnings): stat cards, revenue trend (7D / 30D / 90D), earnings breakdown, summary + export. */
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
  const sm = d.summary;
  const breakdown = d.breakdown.map((b) => ({ label: b.name, value: b.value, color: b.color }));
  const breakdownTotal = breakdown.reduce((s, b) => s + b.value, 0);
  const payoutPct = sm.netEarnings > 0 ? Math.min(100, Math.round((sm.totalPayouts / sm.netEarnings) * 100)) : 0;
  const feePct = sm.totalRevenue > 0 ? ((sm.platformFees / sm.totalRevenue) * 100).toFixed(1) : '0.0';
  const tiles: { label: string; value: string; icon: Icon; tint: keyof typeof SM_TINT }[] = [
    { label: 'Total Revenue', value: inrShort(sm.totalRevenue), icon: 'wallet', tint: 'green' },
    { label: `Platform Fees · ${feePct}%`, value: inrShort(sm.platformFees), icon: 'pie-chart', tint: 'purple' },
    { label: 'COD Collected', value: inrShort(sm.codCollected), icon: 'cash', tint: 'blue' },
    { label: 'Success Rate', value: `${d.successRate}%`, icon: 'shield-checkmark', tint: 'green' },
  ];

  return (
    <ScrollView className="flex-1 bg-cream" contentContainerClassName={SM_PAD}
      refreshControl={<RefreshControl refreshing={q.refreshing} onRefresh={q.reload} tintColor={colors.primary} />}>
      <SMTitle title="Earnings Overview" subtitle="Track your store earnings, transactions and payouts."
        right={
          <Pressable onPress={exportCsv} accessibilityRole="button" accessibilityLabel="Export report" className="flex-row items-center gap-1 rounded-xl bg-primary px-3 py-2 active:opacity-80">
            <Ionicons name="download-outline" size={14} color="#fff" /><Text className="text-white font-bold text-[12px]">Export</Text>
          </Pressable>
        } />

      {/* stat cards */}
      <View className="flex-row flex-wrap gap-2">
        {CARDS.map((c, i) => {
          const s = d.stats[c.key];
          const tn = SM_TINT[c.tint];
          const lone = i === CARDS.length - 1;
          return (
            <View key={c.key} className={cn(lone ? 'w-full' : 'w-[48.8%]', 'bg-white rounded-2xl border border-line px-2.5 py-2')}>
              <View className="flex-row items-center gap-2">
                <View style={{ backgroundColor: tn.bg }} className="w-8 h-8 rounded-full items-center justify-center"><Ionicons name={c.icon} size={15} color={tn.fg} /></View>
                <View className="flex-1">
                  <Text className="text-[10.5px] font-semibold text-muted" numberOfLines={1}>{c.title}</Text>
                  <Text className="text-[17px] font-black text-ink leading-[21px]" numberOfLines={1} adjustsFontSizeToFit>{c.money ? inrShort(s.value) : numShort(s.value)}</Text>
                </View>
                <Sparkline values={s.spark} color={tn.fg} width={lone ? 90 : 44} height={22} />
              </View>
              <Text style={{ color: changeColor(s.change) }} className="text-[10.5px] font-bold mt-1">{changeLabel(s.change)} <Text className="text-muted font-normal">vs prev {range}d</Text></Text>
            </View>
          );
        })}
      </View>

      {/* revenue trend */}
      <SMCard>
        <SMCardHead title="Revenue Trend" caption={`Last ${range} days`}
          right={
            <View className="flex-row bg-cream rounded-full p-0.5 border border-line">
              {RANGES.map((r) => (
                <Pressable key={r.value} onPress={() => setRange(r.value)} accessibilityRole="button" className={cn('px-2.5 py-1 rounded-full', range === r.value && 'bg-primary')}>
                  <Text className={cn('text-[11px] font-bold', range === r.value ? 'text-white' : 'text-muted')}>{r.label}</Text>
                </Pressable>
              ))}
            </View>
          } />
        <View className="flex-row items-center gap-2 mb-1.5">
          <Text className="text-[20px] font-black text-ink">{inrShort(t.periodTotal)}</Text>
          <View style={{ backgroundColor: (t.change ?? 0) >= 0 ? '#DCFCE7' : '#FEE2E2' }} className="rounded-full px-1.5 py-0.5">
            <Text style={{ color: changeColor(t.change) }} className="text-[10.5px] font-bold">{changeLabel(t.change)}</Text>
          </View>
        </View>
        <AreaChart data={t.data} format={inrShort} maxLabels={6} height={125} />
        <View className="flex-row mt-2 pt-2 border-t border-line">
          {([['Average Revenue', inrShort(t.average), colors.text], ['Peak Day', inrShort(t.peak), colors.text], ['Growth', changeLabel(t.change), changeColor(t.change)]] as const).map(([k, v, c]) => (
            <View key={k} className="flex-1 items-center"><Text className="text-[10.5px] text-muted">{k}</Text><Text style={{ color: c }} className="text-[14px] font-extrabold">{v}</Text></View>
          ))}
        </View>
      </SMCard>

      {/* earnings breakdown */}
      <SMCard>
        <SMCardHead title="Earnings Breakdown" caption="Revenue distribution" />
        {breakdown.length ? (
          <View className="flex-row items-center gap-3">
            <Donut size={118} stroke={16} data={breakdown} centerValue={inrShort(breakdownTotal)} centerLabel="Total" />
            <View className="flex-1 gap-1.5">
              {breakdown.map((b) => (
                <View key={b.label} className="flex-row items-center gap-1.5 rounded-xl border border-line px-2 py-1.5">
                  <View style={{ backgroundColor: b.color }} className="w-2.5 h-2.5 rounded-full" />
                  <View className="flex-1">
                    <Text className="text-[11.5px] font-semibold text-ink" numberOfLines={1}>{b.label}</Text>
                    <Text className="text-[10px] text-muted">{((b.value / (breakdownTotal || 1)) * 100).toFixed(1)}%</Text>
                  </View>
                  <Text className="text-[12px] font-bold text-ink" numberOfLines={1}>{inrShort(b.value)}</Text>
                </View>
              ))}
            </View>
          </View>
        ) : <Empty emoji="🧾" title="Breakdown appears once you have delivered orders." />}
      </SMCard>

      {/* summary */}
      <SMCard>
        <SMCardHead title="Summary" caption="Performance overview" right={<View className="rounded-full border border-line px-2 py-0.5"><Text className="text-[11px] font-bold text-primary">Last {range}d</Text></View>} />
        <Gradient colorsArr={['#FF7A1A', '#F59E0B']} className="rounded-2xl p-3 overflow-hidden">
          <View className="flex-row items-start justify-between">
            <View>
              <Text className="text-[11px] text-orange-50">Net Earnings</Text>
              <Text className="text-[22px] font-black text-white">{inr0(sm.netEarnings)}</Text>
            </View>
            <View className="flex-row items-center gap-1 rounded-full bg-white/25 px-2 py-1">
              <Ionicons name={(t.change ?? 0) < 0 ? 'trending-down' : 'trending-up'} size={12} color="#fff" />
              <Text className="text-white text-[11px] font-bold">{changeLabel(t.change)}</Text>
            </View>
          </View>
          <View className="flex-row justify-between mt-2 mb-1"><Text className="text-[11px] text-orange-50">Paid out</Text><Text className="text-[11px] font-bold text-white">{payoutPct}%</Text></View>
          <View className="h-2 rounded-full bg-white/30 overflow-hidden"><View style={{ width: `${payoutPct}%` }} className="h-2 rounded-full bg-white" /></View>
          <View className="flex-row justify-between mt-2">
            <View><Text className="text-[11px] text-orange-50">Payouts</Text><Text className="text-white font-bold">{inrShort(sm.totalPayouts)}</Text></View>
            <View className="items-end"><Text className="text-[11px] text-orange-50">Pending</Text><Text className="text-white font-bold">{inrShort(sm.pendingPayout)}</Text></View>
          </View>
        </Gradient>
        <View className="flex-row flex-wrap gap-2 mt-2">
          {tiles.map((x) => (
            <View key={x.label} className="w-[48.6%] flex-row items-center gap-2 rounded-xl border border-line bg-white p-2">
              <View style={{ backgroundColor: SM_TINT[x.tint].bg }} className="w-7 h-7 rounded-lg items-center justify-center"><Ionicons name={x.icon} size={14} color={SM_TINT[x.tint].fg} /></View>
              <View className="flex-1"><Text className="text-[10px] text-muted" numberOfLines={1}>{x.label}</Text><Text className="text-[14px] font-bold text-ink" numberOfLines={1}>{x.value}</Text></View>
            </View>
          ))}
        </View>
        <Pressable onPress={() => navigation.navigate('SMReports')} accessibilityRole="button" className="flex-row items-center justify-center gap-1.5 rounded-xl bg-slate-900 py-2.5 mt-2 active:opacity-80">
          <Text className="text-white font-bold text-[13px]">View Detailed Report</Text><Ionicons name="arrow-forward" size={14} color="#fff" />
        </Pressable>
      </SMCard>
    </ScrollView>
  );
}

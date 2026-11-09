import React, { useState } from 'react';
import { RefreshControl, ScrollView, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme';
import { Empty } from '../../components/ui';
import BarChart from '../../components/common/BarChart';
import SegmentedTabs from '../../components/common/SegmentedTabs';
import { SkeletonScreen, Skeleton } from '../../components/Skeletons';
import { PageHeader, Panel, PanelHeader, WebStatGrid } from '../../components/doctor/DoctorUI';
import { useRemote } from '../../hooks/useRemote';
import { doctorService } from '../../services/doctor.service';
import { useDoctor } from '../../context/DoctorContext';
import { inr } from '../../utils/orders';

const short = (n: number) => (n >= 100000 ? `${(n / 100000).toFixed(1)}L` : n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n));
const SERVICE_ICON = (t: string): keyof typeof Ionicons.glyphMap => { const v = t.toLowerCase(); return v.includes('online') || v.includes('video') ? 'videocam' : v.includes('home') ? 'home' : v.includes('emergency') ? 'alert-circle' : 'medkit'; };
const BAR_COLORS = ['#F97316', '#3B82F6', '#22C55E', '#8B5CF6', '#EC4899'];

/** Earnings - the web page: four stat cards, an overview chart with total, the breakdown by visit type and the monthly trend. */
export default function EarningsScreen() {
  const { tick } = useDoctor();
  const [range, setRange] = useState<'daily' | 'monthly'>('daily');
  const e = useRemote(() => doctorService.earnings(), [], tick);
  const d = e.data;
  if (e.loading && !d) return <SkeletonScreen className="p-4 gap-3"><Skeleton className="h-[120px] w-full rounded-3xl" /><Skeleton className="h-[70px] w-full rounded-2xl" /><Skeleton className="h-[200px] w-full rounded-3xl" /></SkeletonScreen>;
  if (!d) return <View className="flex-1 bg-cream justify-center"><Empty emoji="📉" title="Couldn't load earnings" body={e.error ?? undefined} /></View>;
  const series = range === 'daily' ? d.daily.slice(-7) : d.monthly.slice(-6);
  const rawBreak = d.breakdown.reduce((s, b) => s + b.value, 0);
  const totalBreak = rawBreak || 1;

  return (
    <ScrollView className="flex-1 bg-cream" contentContainerClassName="p-4 gap-4 pb-10" refreshControl={<RefreshControl refreshing={e.refreshing} onRefresh={e.reload} tintColor={colors.primary} />}>
      <PageHeader icon="trending-up" title="Earnings" subtitle="Track your consultation income." />

      <WebStatGrid stats={[
        { title: 'Total Earnings', value: inr(d.stats.total), icon: 'wallet', tone: 'orange' },
        { title: 'Completed Appointments', value: d.stats.completed, icon: 'checkmark-circle', tone: 'green' },
        { title: 'Average Consultation', value: inr(d.stats.average), icon: 'pricetag', tone: 'purple' },
        { title: "Today's Earnings", value: inr(d.stats.today), icon: 'today', tone: 'blue' },
      ]} />

      <Panel>
        <PanelHeader icon="bar-chart" title="Earnings Overview" caption={range === 'daily' ? 'Last 7 days' : 'By month'} />
        <Text className="text-[22px] font-bold text-slate-800 mb-3">{inr(d.stats.total)}</Text>
        <SegmentedTabs value={range} onChange={setRange} tabs={[{ key: 'daily', label: 'Last 7 days' }, { key: 'monthly', label: 'By month' }]} />
        <View className="mt-3">
          {series.length ? <BarChart data={series} format={short} color="#F97316" /> : <Text className="text-xs text-muted text-center py-6">No earnings recorded yet.</Text>}
        </View>
      </Panel>

      {d.breakdown.length > 0 && (
        <Panel>
          <PanelHeader icon="pie-chart" tone="purple" title="Earnings Breakdown" caption="Where your income comes from" />
          <Text className="text-[22px] font-bold text-slate-800 mb-3">{inr(rawBreak)}</Text>
          <View className="h-3 rounded-full bg-orange-50 overflow-hidden flex-row mb-3.5">
            {d.breakdown.map((b, i) => <View key={b.name} style={{ width: `${Math.max(2, (b.value / totalBreak) * 100)}%`, backgroundColor: BAR_COLORS[i % BAR_COLORS.length] }} />)}
          </View>
          <View className="gap-2">
            {d.breakdown.map((b, i) => (
              <View key={b.name} className="flex-row items-center justify-between rounded-2xl bg-orange-50/60 border border-orange-100 px-3 py-2.5">
                <View className="flex-row items-center gap-2.5 flex-1">
                  <View style={{ backgroundColor: BAR_COLORS[i % BAR_COLORS.length] }} className="w-9 h-9 rounded-xl items-center justify-center"><Ionicons name={SERVICE_ICON(b.name)} size={16} color="#fff" /></View>
                  <View className="flex-1"><Text className="text-[13px] font-semibold text-slate-800" numberOfLines={1}>{b.name}</Text><Text className="text-[11px] text-slate-400">{b.pct}</Text></View>
                </View>
                <Text className="text-[13px] font-bold text-slate-800">{inr(b.value)}</Text>
              </View>
            ))}
          </View>
        </Panel>
      )}

      <Panel>
        <PanelHeader icon="calendar" tone="blue" title="Monthly Earnings" caption="This month so far" />
        <Text className="text-[22px] font-bold text-slate-800">{inr(d.stats.month)}</Text>
        <View className="flex-row gap-2.5 mt-3.5">
          <View className="flex-1 rounded-xl bg-green-50 p-3"><Text className="text-[11px] text-slate-500">Completed</Text><Text className="text-lg font-bold text-slate-800">{d.stats.completed}</Text></View>
          <View className="flex-1 rounded-xl bg-blue-50 p-3"><Text className="text-[11px] text-slate-500">All appointments</Text><Text className="text-lg font-bold text-slate-800">{d.stats.appointments}</Text></View>
        </View>
      </Panel>
    </ScrollView>
  );
}

import React, { useState } from 'react';
import { Pressable, RefreshControl, ScrollView, Share, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme';
import { Button, Empty, cn } from '../../components/ui';
import SegmentedTabs from '../../components/common/SegmentedTabs';
import BottomSheet from '../../components/common/BottomSheet';
import DateFields from '../../components/DateFields';
import { SkeletonScreen, Skeleton } from '../../components/Skeletons';
import { toast } from '../../components/WonPetsAlert';
import { PageHeader, Panel, PanelHeader, TONES, DTone } from '../../components/doctor/DoctorUI';
import { Donut, TrendChart } from '../../components/doctor/EarningsCharts';
import { useRemote } from '../../hooks/useRemote';
import { doctorService, EarningsRange } from '../../services/doctor.service';
import { errorMessage } from '../../services/api';
import { useDoctor } from '../../context/DoctorContext';
import { inr } from '../../utils/orders';

type Icon = keyof typeof Ionicons.glyphMap;

/** Same four presets as the web Earnings page, plus the custom range behind the calendar button. */
const RANGES: { key: Exclude<EarningsRange, 'custom'>; label: string }[] = [
  { key: 'week', label: 'This Week' },
  { key: 'month', label: 'This Month' },
  { key: '3months', label: 'Last 3 Months' },
  { key: 'year', label: 'This Year' },
];
const PIE_COLORS = ['#F97316', '#22C55E', '#8B5CF6', '#3B82F6', '#F59E0B'];
const SOURCE_ICON: Record<string, Icon> = { consultation: 'medkit', followup: 'calendar', careplan: 'heart', collaboration: 'people' };

const compareLabel = (key: string) =>
  key === 'week' ? 'vs. previous week' : key === 'year' ? 'vs. previous year' : key === '3months' ? 'vs. previous 3 months' : key === 'custom' ? 'vs. previous period' : 'vs. previous month';

/** The server buckets days in IST, so read dates the same way instead of in the phone's time zone. */
const istDay = (raw: string) => {
  const t = Date.parse(raw);
  if (!Number.isFinite(t)) return '';
  const d = new Date(t + 330 * 60000);
  return `${String(d.getUTCDate()).padStart(2, '0')}/${String(d.getUTCMonth() + 1).padStart(2, '0')}/${d.getUTCFullYear()}`;
};

function GrowthBadge({ value }: { value: number }) {
  const up = value >= 0;
  return (
    <View className={cn('flex-row items-center gap-0.5 rounded-full px-2 py-0.5 self-start', up ? 'bg-green-100' : 'bg-red-100')}>
      <Ionicons name={up ? 'trending-up' : 'trending-down'} size={11} color={up ? '#16A34A' : '#EF4444'} />
      <Text className={cn('text-[11px] font-semibold', up ? 'text-green-600' : 'text-red-500')}>{up ? '+' : ''}{value}%</Text>
    </View>
  );
}

/** Compact tile: icon + title on one line, value, then growth / hint. Two per row. */
function StatCard({ title, value, icon, tone, children, className }: { title: string; value: string | number; icon: Icon; tone: DTone; children?: React.ReactNode; className?: string }) {
  const t = TONES[tone];
  return (
    <View className={cn('w-[48.8%] bg-white rounded-2xl border border-line p-3', className)}>
      <View className="flex-row items-center gap-2">
        <View className={cn('w-8 h-8 rounded-full items-center justify-center', t.soft)}><Ionicons name={icon} size={15} color={t.fg} /></View>
        <Text maxFontSizeMultiplier={1.1} className="flex-1 text-[11px] font-semibold text-slate-600" numberOfLines={1}>{title}</Text>
      </View>
      <Text maxFontSizeMultiplier={1.1} className="text-[20px] font-black text-slate-900 mt-1.5" numberOfLines={1} adjustsFontSizeToFit>{value}</Text>
      <View className="mt-1 h-5 flex-row items-center gap-1">{children}</View>
    </View>
  );
}

/** Small fixed-size insight tile (icon chip, value, label) - four fit in a 2x2 block. */
function Insight({ icon, tone, value, valueClass = 'text-slate-900', label, sub }: { icon: Icon; tone: DTone; value: string | number; valueClass?: string; label: string; sub?: string }) {
  const t = TONES[tone];
  return (
    <View className={cn('w-[48.8%] h-[68px] flex-row items-center gap-2 rounded-2xl px-2.5', t.pale)}>
      <View className="w-9 h-9 rounded-full bg-white items-center justify-center"><Ionicons name={icon} size={16} color={t.fg} /></View>
      <View className="flex-1">
        <Text maxFontSizeMultiplier={1.1} className={cn('text-[16px] font-extrabold', valueClass)} numberOfLines={1} adjustsFontSizeToFit>{value}</Text>
        <Text maxFontSizeMultiplier={1.1} className="text-[10.5px] leading-[13px] text-slate-600" numberOfLines={1}>{label}</Text>
        {!!sub && <Text maxFontSizeMultiplier={1.1} className="text-[9.5px] text-slate-500" numberOfLines={1}>{sub}</Text>}
      </View>
    </View>
  );
}

/** Earnings - the web page on a phone: range filters, stat cards with growth, trend chart, breakdown ring, performance insights and earning sources. */
export default function EarningsScreen() {
  const { tick } = useDoctor();
  const [range, setRange] = useState<EarningsRange>('month');
  const [applied, setApplied] = useState({ startDate: '', endDate: '' });
  const [custom, setCustom] = useState({ startDate: '', endDate: '' });
  const [showCustom, setShowCustom] = useState(false);
  const [metric, setMetric] = useState<'revenue' | 'appointments'>('revenue');
  const [exporting, setExporting] = useState(false);

  const params = range === 'custom' ? { range, ...applied } : { range };
  const e = useRemote(() => doctorService.earnings(params), [range, applied.startDate, applied.endDate], tick);
  const d = e.data;

  const applyCustom = () => {
    if (!custom.startDate || !custom.endDate) return toast.error('Select both dates.');
    if (custom.startDate > custom.endDate) return toast.error('Start date must be before end date.');
    setApplied({ ...custom });
    setRange('custom');
    setShowCustom(false);
  };

  /** The web downloads .xlsx / .pdf; on a phone the same report goes out through the share sheet (mail, Drive, WhatsApp, notes…). */
  const exportReport = async () => {
    if (exporting) return;
    setExporting(true);
    try {
      const rep = await doctorService.earningsReport(params);
      if (!rep.rows.length) return toast.info('No completed appointments in this period.');
      const lines = [
        'WonPet - Earnings Report',
        `Period: ${istDay(rep.range.startDate)} - ${istDay(rep.range.endDate)}`,
        `Total: ${inr(rep.summary.total)} | Completed: ${rep.summary.completed} | Average: ${inr(rep.summary.average)}`,
        '',
        ...rep.rows.map((r, i) => `${i + 1}. ${r.appointmentId} | ${istDay(r.date)} ${r.time} | ${r.owner} / ${r.pet} | ${r.visitType} | ${r.mode} | ${inr(r.fee)} | ${[r.payment, r.paymentStatus].filter(Boolean).join(' ')}`),
      ];
      await Share.share({ title: 'WonPet - Earnings Report', message: lines.join('\n') });
    } catch (err) { toast.error(errorMessage(err) || 'Failed to export report.'); }
    finally { setExporting(false); }
  };

  if (e.loading && !d) return <SkeletonScreen className="p-4 gap-3"><Skeleton className="h-[60px] w-full rounded-3xl" /><Skeleton className="h-[120px] w-full rounded-3xl" /><Skeleton className="h-[220px] w-full rounded-3xl" /></SkeletonScreen>;
  if (!d) return <View className="flex-1 bg-cream justify-center"><Empty emoji="📉" title="Couldn't load earnings" body={e.error ?? undefined} /></View>;

  const s = d.stats;
  const cmp = compareLabel(d.range.key || range);
  const hasData = s.completed > 0;
  const trend = d.trend.map((t) => ({ label: t.label, fullLabel: t.fullLabel, value: metric === 'revenue' ? t.earnings : t.appointments }));

  return (
    <ScrollView className="flex-1 bg-cream" contentContainerClassName="p-3.5 gap-3 pb-8" refreshControl={<RefreshControl refreshing={e.refreshing} onRefresh={e.reload} tintColor={colors.primary} />}>
      <PageHeader icon="trending-up" title="Earnings" subtitle="Revenue, growth and performance" />

      {/* range filters + custom range + export */}
      <View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="gap-2 pr-2 items-center">
          {RANGES.map((r) => {
            const on = range === r.key;
            return (
              <Pressable key={r.key} onPress={() => setRange(r.key)} accessibilityRole="button" accessibilityState={{ selected: on }}
                className={cn('px-3.5 py-2 rounded-full border', on ? 'bg-primary border-primary' : 'bg-white border-line')}>
                <Text className={cn('text-[13px] font-semibold', on ? 'text-white' : 'text-slate-700')}>{r.label}</Text>
              </Pressable>
            );
          })}
          <Pressable onPress={() => setShowCustom(true)} accessibilityRole="button" accessibilityLabel="Custom date range"
            className={cn('w-10 h-10 rounded-full border items-center justify-center', range === 'custom' ? 'bg-primary border-primary' : 'bg-white border-line')}>
            <Ionicons name="calendar-outline" size={18} color={range === 'custom' ? '#fff' : colors.text} />
          </Pressable>
          <Pressable onPress={exportReport} disabled={exporting || e.loading} accessibilityRole="button" accessibilityLabel="Export report"
            className={cn('flex-row items-center gap-1.5 px-4 py-2.5 rounded-full border border-orange-400 bg-white', (exporting || e.loading) && 'opacity-60')}>
            <Ionicons name="download-outline" size={16} color={colors.primary} />
            <Text className="text-[13px] font-semibold text-primary">{exporting ? 'Exporting...' : 'Export Report'}</Text>
          </Pressable>
        </ScrollView>
        {range === 'custom' && !!applied.startDate && <Text className="text-xs text-muted mt-2">{istDay(`${applied.startDate}T00:00:00+05:30`)} – {istDay(`${applied.endDate}T00:00:00+05:30`)}</Text>}
      </View>

      <View className={cn('gap-3', e.loading && 'opacity-60')}>
        {/* stat cards */}
        <View className="flex-row flex-wrap gap-2">
          <StatCard title="Total Earnings" value={inr(s.total)} icon="wallet" tone="orange"><GrowthBadge value={s.totalGrowth} /></StatCard>
          <StatCard title="Completed" value={s.completed} icon="checkmark-circle" tone="green"><GrowthBadge value={s.completedGrowth} /></StatCard>
          <StatCard title="Avg. Consultation" value={inr(s.average)} icon="pricetag" tone="purple"><GrowthBadge value={s.averageGrowth} /></StatCard>
          <StatCard title="Pending Payout" value={inr(s.pendingPayout)} icon="layers" tone="blue" className="bg-blue-50/70 border-blue-100">
            <Text className="text-[10px] text-slate-500" numberOfLines={1}>{s.pendingPayoutCount > 0 ? `${s.pendingPayoutCount} appointment${s.pendingPayoutCount === 1 ? '' : 's'}` : 'Nothing pending'}</Text>
          </StatCard>
        </View>
        <Text className="text-[10.5px] text-muted -mt-1 px-1">Growth shown {cmp}</Text>

        {/* trend */}
        <Panel compact>
          <PanelHeader compact icon="bar-chart" title="Earnings Trend" caption={metric === 'revenue' ? 'Daily revenue from consultations' : 'Completed appointments over time'} />
          <SegmentedTabs value={metric} onChange={setMetric} tabs={[{ key: 'revenue', label: 'Revenue' }, { key: 'appointments', label: 'Appointments' }]} />
          <View className="mt-2">
            {hasData ? <TrendChart key={`${range}-${metric}`} data={trend} money={metric === 'revenue'} /> : <Text className="text-sm text-slate-400 text-center py-10">No completed appointments in this period.</Text>}
          </View>
        </Panel>

        {/* breakdown: ring on the left, legend on the right */}
        <Panel compact>
          <PanelHeader compact icon="pie-chart" tone="purple" title="Earnings Breakdown" caption="Where your income comes from" />
          {d.breakdown.length ? (
            <View className="flex-row items-center gap-3">
              <Donut slices={d.breakdown} colors={PIE_COLORS}>
                <Text maxFontSizeMultiplier={1.1} className="text-[13px] font-bold text-slate-900" numberOfLines={1} adjustsFontSizeToFit>{inr(s.total)}</Text>
                <Text maxFontSizeMultiplier={1.1} className="text-[9.5px] text-slate-500">Total</Text>
              </Donut>
              <View className="flex-1 gap-2">
                {d.breakdown.map((b, i) => (
                  <View key={b.type} className="flex-row items-center gap-1.5">
                    <View style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }} className="w-2.5 h-2.5 rounded-full" />
                    <Text maxFontSizeMultiplier={1.1} className="text-[12px] text-slate-700 flex-1" numberOfLines={1}>{b.name}</Text>
                    <Text className="text-[11px] text-slate-500">{b.percentage}%</Text>
                    <Text maxFontSizeMultiplier={1.1} className="text-[12px] font-bold text-slate-900 min-w-[52px] text-right" numberOfLines={1}>{inr(b.value)}</Text>
                  </View>
                ))}
              </View>
            </View>
          ) : <Text className="text-sm text-slate-400 text-center py-6">No data for this period.</Text>}
        </Panel>

        {/* performance insights - 2x2 fixed-size tiles */}
        <Panel compact>
          <PanelHeader compact icon="locate" title="Performance Insights" />
          <View className="flex-row flex-wrap gap-2">
            <Insight icon="trending-up" tone="green" value={`${s.totalGrowth >= 0 ? '+' : ''}${s.totalGrowth}%`} valueClass={s.totalGrowth >= 0 ? 'text-green-600' : 'text-red-500'} label="Earnings Growth" />
            <Insight icon="calendar" tone="orange" value={s.completed} label="Consultations Done" />
            <Insight icon="medkit" tone="purple" value={inr(s.average)} label="Avg. per Consultation" />
            <Insight icon="trophy" tone="amber" value={d.bestDay ? inr(d.bestDay.earnings) : '--'} label="Best Earning Day" sub={d.bestDay ? d.bestDay.label : 'No data yet'} />
          </View>
        </Panel>

        {/* earning sources */}
        <Panel compact>
          <PanelHeader compact icon="layers" title="Earning Sources" />
          <View className="gap-3">
            {d.sources.map((src) => (
              <View key={src.key} className="flex-row items-center gap-3">
                <View className="w-8 h-8 rounded-full bg-orange-100 items-center justify-center"><Ionicons name={SOURCE_ICON[src.key] ?? 'cash'} size={15} color={colors.primary} /></View>
                <View className="flex-1">
                  <View className="flex-row justify-between mb-1"><Text className="text-[13px] text-slate-800" numberOfLines={1}>{src.title}</Text><Text className="text-[13px] text-slate-700">{src.percentage}%</Text></View>
                  <View className="h-1.5 rounded-full bg-orange-50 overflow-hidden"><View style={{ width: `${src.percentage}%`, minWidth: src.value > 0 ? 6 : 0 }} className="h-full rounded-full bg-primary" /></View>
                </View>
              </View>
            ))}
          </View>
        </Panel>
      </View>

      <BottomSheet visible={showCustom} onClose={() => setShowCustom(false)} title="Custom range" subtitle="Pick the first and last day to include."
        footer={<Button title="Apply" onPress={applyCustom} />}>
        <DateFields label="From" value={custom.startDate} max={custom.endDate || undefined} onChange={(v) => setCustom((c) => ({ ...c, startDate: v }))} />
        <DateFields label="To" value={custom.endDate} min={custom.startDate || undefined} onChange={(v) => setCustom((c) => ({ ...c, endDate: v }))} />
      </BottomSheet>
    </ScrollView>
  );
}
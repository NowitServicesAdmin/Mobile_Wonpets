import React, { useState } from 'react';
import { LayoutChangeEvent, Pressable, Switch, Text, View } from 'react-native';
import Svg, { Circle, Defs, LinearGradient as SvgGradient, Path, Stop } from 'react-native-svg';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme';
import { cn } from '../ui';
import { Photo } from '../Avatar';
import { toast } from '../WonPetsAlert';
import { ensurePermission } from '../../utils/permissions';
import type { OfferStatus, SMOrderStatus, StockStatus } from '../../services/storeManager.service';

type IconName = keyof typeof Ionicons.glyphMap;

/* ------------------------------- money ------------------------------- */
export const inr0 = (n: number) => `₹${Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
/** 2.50 -> "2.5", 12.00 -> "12" (no dangling zeros in short numbers). */
const trim = (n: number, digits: number) => String(Number(n.toFixed(digits)));
/**
 * Short count: 9,850 stays exact; 12.5K / 2.48L / 1.2Cr from 10,000 up (Indian units, like the web Earnings page).
 * Use it for tiles, legends and anything that has to fit a narrow box.
 */
export const numShort = (n: number) => {
  const v = Number(n || 0);
  const a = Math.abs(v);
  const sign = v < 0 ? '-' : '';
  if (a >= 1e7) return `${sign}${trim(a / 1e7, 2)}Cr`;
  if (a >= 1e5) return `${sign}${trim(a / 1e5, 2)}L`;
  if (a >= 1e4) return `${sign}${trim(a / 1e3, 1)}K`;
  return v.toLocaleString('en-IN', { maximumFractionDigits: 2 });
};
/** Short money: ₹9,850 stays exact; ₹12.5K / ₹2.48L / ₹1.2Cr from ₹10,000 up. Exact amounts (order totals, prices) use inr0. */
export const inrShort = (n: number) => {
  const v = Number(n || 0);
  return v < 0 ? `-₹${numShort(Math.abs(v))}` : `₹${numShort(v)}`;
};
export const changeLabel = (c: number | null | undefined) => (c === null || c === undefined ? 'New' : `${c > 0 ? '+' : ''}${c}%`);
export const changeColor = (c: number | null | undefined) => (c === null || c === undefined || c >= 0 ? colors.green : colors.red);
export const fmtDate = (iso?: string) => (iso ? new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—');
/** "12 Mar" - for list rows where the year is just noise. */
export const fmtDayMonth = (iso?: string) => {
  if (!iso) return '—';
  const d = new Date(iso);
  const old = d.getFullYear() !== new Date().getFullYear(); // keep older dates unambiguous: "12 Mar 25"
  return d.toLocaleDateString('en-IN', old ? { day: 'numeric', month: 'short', year: '2-digit' } : { day: 'numeric', month: 'short' });
};

/* ------------------------------- badges ------------------------------- */
const PALETTE = {
  orange: ['#FFEDD5', '#EA580C'], blue: ['#DBEAFE', '#2563EB'], purple: ['#EDE9FE', '#7C3AED'], green: ['#DCFCE7', '#16A34A'],
  red: ['#FEE2E2', '#DC2626'], slate: ['#F1F5F9', '#475569'], amber: ['#FEF3C7', '#B45309'], cyan: ['#CFFAFE', '#0E7490'],
} as const;
type Pal = keyof typeof PALETTE;

export const ORDER_COLOR: Record<SMOrderStatus, Pal> = { Pending: 'orange', Processing: 'blue', Shipped: 'purple', Delivered: 'green', Cancelled: 'red' };
export const STOCK_COLOR: Record<StockStatus, Pal> = { 'In Stock': 'green', 'Low Stock': 'orange', 'Out Of Stock': 'red' };
export const OFFER_COLOR: Record<OfferStatus, Pal> = { Active: 'green', Scheduled: 'blue', Expired: 'red', Disabled: 'slate' };
export const palette = (p: Pal) => ({ soft: PALETTE[p][0], fg: PALETTE[p][1] });

export function Badge({ label, tone = 'slate', icon }: { label: string; tone?: Pal; icon?: IconName }) {
  const [bg, fg] = PALETTE[tone];
  return (
    <View style={{ backgroundColor: bg }} className="self-start flex-row items-center gap-1 rounded-full px-2.5 py-1">
      {!!icon && <Ionicons name={icon} size={11} color={fg} />}
      <Text style={{ color: fg }} className="text-[11px] font-bold" numberOfLines={1}>{label}</Text>
    </View>
  );
}
export const OrderBadge = ({ status }: { status: SMOrderStatus }) => <Badge label={status} tone={ORDER_COLOR[status] ?? 'slate'} />;
/** Short badge wording: In stock / Low / Sold out. */
export const STOCK_SHORT: Record<StockStatus, string> = { 'In Stock': 'In stock', 'Low Stock': 'Low', 'Out Of Stock': 'Sold out' };
export const StockBadge = ({ status }: { status: StockStatus }) => <Badge label={STOCK_SHORT[status]} tone={STOCK_COLOR[status]} />;
export const OfferBadge = ({ status }: { status: OfferStatus }) => <Badge label={status} tone={OFFER_COLOR[status]} />;

/* ------------------------------- charts ------------------------------- */
/** Donut chart (order status / inventory / earnings breakdown) with the total in the middle. */
export function Donut({ data, size = 170, stroke = 22, centerValue, centerLabel }: {
  data: { label: string; value: number; color: string }[]; size?: number; stroke?: number; centerValue: string | number; centerLabel: string;
}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const total = data.reduce((s, d) => s + d.value, 0);
  const shown = data.filter((d) => d.value > 0);
  const gap = shown.length > 1 ? 4 : 0;
  let offset = 0;
  return (
    <View style={{ width: size, height: size }} className="items-center justify-center self-center">
      <Svg width={size} height={size} style={{ position: 'absolute', transform: [{ rotate: '-90deg' }] }}>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke="#F3E7DA" strokeWidth={stroke} fill="none" />
        {total > 0 && shown.map((d) => {
          const len = (d.value / total) * c;
          const seg = <Circle key={d.label} cx={size / 2} cy={size / 2} r={r} stroke={d.color} strokeWidth={stroke} fill="none"
            strokeDasharray={`${Math.max(len - gap, 0.01)} ${c}`} strokeDashoffset={-offset} />;
          offset += len;
          return seg;
        })}
      </Svg>
      <Text className="text-[26px] font-black text-ink" numberOfLines={1} adjustsFontSizeToFit>{typeof centerValue === 'number' ? numShort(centerValue) : centerValue}</Text>
      <Text className="text-[11px] text-muted">{centerLabel}</Text>
    </View>
  );
}

/** Legend rows that go under a Donut. */
export function Legend({ data, format = numShort }: { data: { label: string; value: number; color: string }[]; format?: (n: number) => string }) {
  const total = data.reduce((s, d) => s + d.value, 0);
  return (
    <View className="gap-2.5 mt-4">
      {data.map((d) => (
        <View key={d.label} className="flex-row items-center gap-2">
          <View style={{ backgroundColor: d.color }} className="w-3 h-3 rounded-full" />
          <Text className="flex-1 text-[13px] text-muted" numberOfLines={1}>{d.label}</Text>
          {total > 0 && <Text className="text-[11px] text-muted">{Math.round((d.value / total) * 100)}%</Text>}
          <Text className="text-[13px] font-bold text-ink min-w-[44px] text-right" numberOfLines={1}>{format(d.value)}</Text>
        </View>
      ))}
    </View>
  );
}

/** Smooth area chart (sales / revenue trends). Measures its own width. */
export function AreaChart({ data, height = 170, color = '#F97316', format = numShort, maxLabels = 7 }: {
  data: { label: string; value: number }[]; height?: number; color?: string; format?: (n: number) => string; maxLabels?: number;
}) {
  const [w, setW] = useState(0);
  const [sel, setSel] = useState<number | null>(null);
  const onLayout = (e: LayoutChangeEvent) => setW(e.nativeEvent.layout.width);
  const max = Math.max(1, ...data.map((d) => d.value));
  const pad = 8;
  const pts = data.map((d, i) => ({
    x: data.length > 1 ? pad + (i * (w - pad * 2)) / (data.length - 1) : w / 2,
    y: pad + (1 - d.value / max) * (height - pad * 2),
  }));
  // simple smoothing with cubic curves between midpoints
  const line = pts.reduce((acc, p, i) => {
    if (i === 0) return `M ${p.x} ${p.y}`;
    const prev = pts[i - 1];
    const mx = (prev.x + p.x) / 2;
    return `${acc} C ${mx} ${prev.y}, ${mx} ${p.y}, ${p.x} ${p.y}`;
  }, '');
  const area = pts.length ? `${line} L ${pts[pts.length - 1].x} ${height} L ${pts[0].x} ${height} Z` : '';
  const step = Math.max(1, Math.ceil(data.length / maxLabels));
  const empty = !data.some((d) => d.value > 0);
  return (
    <View onLayout={onLayout}>
      {w > 0 && data.length > 0 && (
        <Pressable
          onPress={(e) => {
            const x = e.nativeEvent.locationX;
            let best = 0;
            pts.forEach((p, i) => { if (Math.abs(p.x - x) < Math.abs(pts[best].x - x)) best = i; });
            setSel(best === sel ? null : best);
          }}
        >
          <Svg width={w} height={height}>
            <Defs>
              <SvgGradient id="smArea" x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0" stopColor={color} stopOpacity={0.35} />
                <Stop offset="1" stopColor={color} stopOpacity={0} />
              </SvgGradient>
            </Defs>
            <Path d={area} fill="url(#smArea)" />
            <Path d={line} stroke={color} strokeWidth={3} fill="none" strokeLinecap="round" />
            {pts.map((p, i) => (data.length <= 14 || i === sel) && <Circle key={i} cx={p.x} cy={p.y} r={i === sel ? 6 : 3} fill={color} stroke="#fff" strokeWidth={i === sel ? 2 : 0} />)}
          </Svg>
          {sel !== null && data[sel] && (
            <View pointerEvents="none" style={{ position: 'absolute', left: Math.min(Math.max(pts[sel].x - 50, 0), w - 100), top: Math.max(pts[sel].y - 46, 0), width: 100 }}
              className="bg-ink rounded-xl px-2 py-1.5 items-center">
              <Text className="text-white text-[10px]">{data[sel].label}</Text>
              <Text className="text-white text-[12px] font-extrabold">{format(data[sel].value)}</Text>
            </View>
          )}
          {empty && (
            <View pointerEvents="none" className="absolute inset-0 items-center justify-center">
              <Text className="bg-white/90 rounded-full px-3 py-1.5 text-xs text-muted">No data in this period yet</Text>
            </View>
          )}
        </Pressable>
      )}
      <View className="flex-row justify-between mt-1.5">
        {data.map((d, i) => (i % step === 0 || i === data.length - 1) ? <Text key={i} className="text-[10px] text-muted" numberOfLines={1}>{d.label}</Text> : null)}
      </View>
    </View>
  );
}

/** Tiny line used inside earnings stat cards. */
export function Sparkline({ values, color, width = 70, height = 26 }: { values: number[]; color: string; width?: number; height?: number }) {
  if (values.length < 2) return <View style={{ width, height }} />;
  const max = Math.max(1, ...values);
  const min = Math.min(...values);
  const span = Math.max(1, max - min);
  const d = values.map((v, i) => `${i ? 'L' : 'M'} ${(i * width) / (values.length - 1)} ${height - 2 - ((v - min) / span) * (height - 4)}`).join(' ');
  return <Svg width={width} height={height}><Path d={d} stroke={color} strokeWidth={2.2} fill="none" strokeLinecap="round" strokeLinejoin="round" /></Svg>;
}

/** Horizontal progress bar. */
export function Bar({ ratio, color = '#FB923C', className }: { ratio: number; color?: string; className?: string }) {
  return (
    <View className={cn('h-1.5 bg-line rounded-full overflow-hidden', className)}>
      <View style={{ width: `${Math.max(0, Math.min(1, ratio)) * 100}%`, backgroundColor: color }} className="h-full rounded-full" />
    </View>
  );
}

/* ------------------------------- form bits ------------------------------- */
/** Label + segmented single choice (Product / Pet, Percentage / Flat, Male / Female …). */
export function ChoiceRow<K extends string>({ label, value, options, onChange, disabled }: {
  label?: string; value: K; options: { key: K; label: string; icon?: IconName }[]; onChange: (k: K) => void; disabled?: boolean;
}) {
  return (
    <View>
      {!!label && <Text className="font-bold text-ink mb-1.5">{label}</Text>}
      <View className={cn('flex-row gap-2', disabled && 'opacity-50')}>
        {options.map((o) => {
          const on = o.key === value;
          return (
            <Pressable key={o.key} disabled={disabled} onPress={() => onChange(o.key)} accessibilityRole="radio" accessibilityState={{ selected: on }}
              className={cn('flex-1 flex-row items-center justify-center gap-1.5 py-3 rounded-2xl border-[1.5px]', on ? 'bg-primary border-primary' : 'bg-white border-line')}>
              {!!o.icon && <Ionicons name={o.icon} size={16} color={on ? '#fff' : colors.muted} />}
              <Text className={cn('font-bold text-[13.5px]', on ? 'text-white' : 'text-ink')}>{o.label}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const TRACK = { false: '#E5DDD3', true: colors.primary };
/** Title + hint + switch, in a soft box (offer status, availability…). */
export function SwitchRow({ title, hint, value, onChange }: { title: string; hint?: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <View className="flex-row items-center gap-3 bg-cream border border-line rounded-2xl px-3.5 py-3">
      <View className="flex-1">
        <Text className="font-bold text-ink">{title}</Text>
        {!!hint && <Text className="text-xs text-muted">{hint}</Text>}
      </View>
      <Switch value={value} onValueChange={onChange} trackColor={TRACK} thumbColor="#fff" ios_backgroundColor="#E5DDD3" />
    </View>
  );
}

/**
 * Image picker grid. `existing` are the images already on the server; `picked` are new local uris.
 * Picking new photos replaces the existing ones (the backend swaps the whole set), which the hint explains.
 */
export function ImagePickerGrid({ existing = [], picked, onChange, max = 4, label = 'Images', replaceHint }: {
  existing?: string[]; picked: string[]; onChange: (uris: string[]) => void; max?: number; label?: string; replaceHint?: string;
}) {
  const showing = picked.length ? picked : existing;
  const add = async () => {
    if (!(await ensurePermission('photos'))) return toast.error('Allow photo access to add images.');
    const left = max - picked.length;
    if (left <= 0) return toast.info(`You can add up to ${max} image${max > 1 ? 's' : ''}.`);
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsMultipleSelection: max > 1, selectionLimit: left, quality: 0.7 });
    if (res.canceled) return;
    onChange([...picked, ...res.assets.map((a) => a.uri)].slice(0, max));
  };
  return (
    <View>
      <View className="flex-row items-center justify-between mb-1.5">
        <Text className="font-bold text-ink">{label}</Text>
        <Text className="text-xs text-muted">{showing.length}/{max}</Text>
      </View>
      <View className="flex-row flex-wrap gap-2.5">
        {showing.map((uri, i) => (
          <View key={`${uri}-${i}`} className="w-[78px] h-[78px] rounded-2xl overflow-hidden border border-line">
            <Photo uri={uri} emojiSize={26} />
            {picked.length > 0 && (
              <Pressable onPress={() => onChange(picked.filter((_, k) => k !== i))} hitSlop={6} accessibilityLabel="Remove image"
                className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/60 items-center justify-center">
                <Ionicons name="close" size={14} color="#fff" />
              </Pressable>
            )}
          </View>
        ))}
        {(picked.length < max) && (
          <Pressable onPress={add} accessibilityRole="button" accessibilityLabel="Add images"
            className="w-[78px] h-[78px] rounded-2xl border-[1.5px] border-dashed border-orange-300 bg-primary-soft items-center justify-center active:opacity-70">
            <Ionicons name="camera-outline" size={22} color={colors.primary} />
            <Text className="text-[10.5px] font-bold text-primary mt-0.5">{existing.length && !picked.length ? 'Replace' : 'Add'}</Text>
          </Pressable>
        )}
      </View>
      {!!replaceHint && existing.length > 0 && <Text className="text-[11.5px] text-muted mt-1.5">{replaceHint}</Text>}
    </View>
  );
}

/** Bold section label inside a form. */
export const FieldLabel = ({ children }: { children: React.ReactNode }) => <Text className="font-bold text-ink mb-1.5">{children}</Text>;

/** Round tinted icon button used on list rows (edit / delete / view). */
export function RowAction({ icon, tone, label, onPress }: { icon: IconName; tone: Pal; label: string; onPress: () => void }) {
  const [bg, fg] = PALETTE[tone];
  return (
    <Pressable onPress={onPress} hitSlop={4} accessibilityRole="button" accessibilityLabel={label} style={{ backgroundColor: bg }}
      className="w-9 h-9 rounded-xl items-center justify-center active:opacity-70">
      <Ionicons name={icon} size={16} color={fg} />
    </Pressable>
  );
}

/** Floating "+" button for list screens. */
export function Fab({ label, onPress, icon = 'add' }: { label: string; onPress: () => void; icon?: IconName }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={label}
      style={{ elevation: 8, shadowColor: '#7C2D12', shadowOpacity: 0.25, shadowRadius: 10, shadowOffset: { width: 0, height: 4 } }}
      className="absolute right-4 bottom-6 flex-row items-center gap-1.5 bg-primary rounded-full pl-4 pr-5 py-3.5 active:opacity-90">
      <Ionicons name={icon} size={20} color="#fff" />
      <Text className="text-white font-extrabold text-[14px]">{label}</Text>
    </Pressable>
  );
}

/** Small error card with a retry button (first load failed). */
export function LoadError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <View className="items-center p-8 gap-2">
      <Text className="text-[48px]">😿</Text>
      <Text className="text-[15px] font-extrabold text-ink">Couldn't load this page</Text>
      <Text className="text-[13px] text-muted text-center">{message}</Text>
      <Pressable onPress={onRetry} className="mt-2 px-5 py-2.5 rounded-2xl bg-primary active:opacity-80"><Text className="text-white font-bold">Try again</Text></Pressable>
    </View>
  );
}

/* ===================== compact layout (shared by every store-manager screen) ===================== */
/** Tighter page padding / gaps than the owner app, so each screen needs far less scrolling. */
export const SM_PAD = 'p-3 gap-2.5 pb-4';

/** One-line page title (the web page heading + its subtitle) with an optional right-hand slot. */
export function SMTitle({ title, subtitle, right }: { title: string; subtitle?: string; right?: React.ReactNode }) {
  return (
    <View className="flex-row items-center gap-2">
      <View className="flex-1">
        <Text maxFontSizeMultiplier={1.1} className="text-[19px] font-black text-primary leading-6" numberOfLines={1}>{title}</Text>
        {!!subtitle && <Text maxFontSizeMultiplier={1.1} className="text-[11.5px] text-muted leading-4" numberOfLines={1}>{subtitle}</Text>}
      </View>
      {right}
    </View>
  );
}

export type SMStat = {
  title: string; value: string | number; icon: IconName; bg: string; fg: string; caption?: string;
  /** growth chip, e.g. { label: '+12%', up: true } */
  chip?: { label: string; up: boolean };
};

/** Compact stat tiles: small round icon, label, big number. `cols` per row (2 or 3); an odd last tile stretches. */
export function SMStatGrid({ stats, cols = 2 }: { stats: SMStat[]; cols?: 2 | 3 }) {
  return (
    <View className="flex-row flex-wrap gap-2">
      {stats.map((s, i) => {
        const lone = stats.length % cols === 1 && i === stats.length - 1;
        const w = lone ? 'w-full' : cols === 3 ? 'w-[32%]' : 'w-[48.8%]';
        return (
          <View key={s.title} className={cn(w, 'flex-row items-center gap-2 bg-white rounded-2xl border border-line px-2.5 py-2')}>
            <View style={{ backgroundColor: s.bg }} className="w-8 h-8 rounded-full items-center justify-center"><Ionicons name={s.icon} size={15} color={s.fg} /></View>
            <View className="flex-1">
              <Text maxFontSizeMultiplier={1.1} className="text-[10.5px] font-semibold text-muted" numberOfLines={1}>{s.title}</Text>
              <Text maxFontSizeMultiplier={1.1} className="text-[17px] font-black text-ink leading-[21px]" numberOfLines={1} adjustsFontSizeToFit>{s.value}</Text>
              {!!s.caption && <Text maxFontSizeMultiplier={1.1} className="text-[10px] text-muted" numberOfLines={1}>{s.caption}</Text>}
            </View>
            {!!s.chip && (
              <View style={{ backgroundColor: s.chip.up ? '#DCFCE7' : '#FEE2E2' }} className="rounded-full px-1.5 py-0.5">
                <Text style={{ color: s.chip.up ? '#16A34A' : '#EF4444' }} className="text-[10px] font-bold">{s.chip.label}</Text>
              </View>
            )}
          </View>
        );
      })}
    </View>
  );
}

/** Tints used by SMStat (same palette as the web stat cards). */
export const SM_TINT = {
  orange: { bg: '#FFEDD5', fg: '#F97316' }, green: { bg: '#DCFCE7', fg: '#22C55E' }, blue: { bg: '#DBEAFE', fg: '#3B82F6' },
  purple: { bg: '#EDE9FE', fg: '#8B5CF6' }, red: { bg: '#FEE2E2', fg: '#EF4444' }, amber: { bg: '#FEF3C7', fg: '#F59E0B' },
  pink: { bg: '#FCE7F3', fg: '#EC4899' }, slate: { bg: '#F1F5F9', fg: '#475569' },
} as const;

/** Small white card used for web "panels" (less padding than the shared Panel). */
export function SMCard({ children, className }: { children?: React.ReactNode; className?: string }) {
  return <View className={cn('bg-white rounded-2xl border border-line p-3', className)}>{children}</View>;
}

/** Card heading: bold title + optional caption and a right-hand action link. */
export function SMCardHead({ title, caption, action, onAction, right }: { title: string; caption?: string; action?: string; onAction?: () => void; right?: React.ReactNode }) {
  return (
    <View className="flex-row items-center gap-2 mb-2">
      <View className="flex-1">
        <Text maxFontSizeMultiplier={1.1} className="text-[15px] font-extrabold text-ink" numberOfLines={1}>{title}</Text>
        {!!caption && <Text maxFontSizeMultiplier={1.1} className="text-[11px] text-muted" numberOfLines={1}>{caption}</Text>}
      </View>
      {right}
      {!!action && <Pressable onPress={onAction} hitSlop={6} accessibilityRole="button"><Text className="text-[12.5px] font-bold text-primary">{action} →</Text></Pressable>}
    </View>
  );
}

/** Pill tabs (All / Active / Inactive, Revenue / Orders …) in one row. */
export function SMPills<K extends string>({ value, onChange, options }: { value: K; onChange: (k: K) => void; options: { key: K; label: string; count?: number }[] }) {
  return (
    <View className="flex-row gap-1.5">
      {options.map((o) => {
        const on = o.key === value;
        return (
          <Pressable key={o.key} onPress={() => onChange(o.key)} accessibilityRole="button" accessibilityState={{ selected: on }}
            className={cn('flex-1 items-center rounded-full py-1.5 px-1 border', on ? 'bg-primary border-primary' : 'bg-white border-line')}>
            <Text maxFontSizeMultiplier={1.1} numberOfLines={1} className={cn('text-[12px] font-bold', on ? 'text-white' : 'text-ink')}>{o.label}{o.count !== undefined ? ` (${o.count})` : ''}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

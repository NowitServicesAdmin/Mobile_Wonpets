import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme';
import { cn } from '../ui';
import { Avatar } from '../Avatar';

type IconName = keyof typeof Ionicons.glyphMap;

/** Tints used across the doctor console (same palette as the owner app: orange / green / blue / purple / red / amber / pink). */
export const TONES = {
  orange: { soft: 'bg-orange-100', pale: 'bg-orange-50', fg: '#F97316', text: 'text-orange-600' },
  green: { soft: 'bg-green-100', pale: 'bg-green-50', fg: '#22C55E', text: 'text-green-600' },
  blue: { soft: 'bg-blue-100', pale: 'bg-blue-50', fg: '#3B82F6', text: 'text-blue-600' },
  purple: { soft: 'bg-purple-100', pale: 'bg-purple-50', fg: '#8B5CF6', text: 'text-purple-600' },
  red: { soft: 'bg-red-100', pale: 'bg-red-50', fg: '#EF4444', text: 'text-red-600' },
  amber: { soft: 'bg-amber-100', pale: 'bg-amber-50', fg: '#F59E0B', text: 'text-amber-600' },
  pink: { soft: 'bg-pink-100', pale: 'bg-pink-50', fg: '#EC4899', text: 'text-pink-600' },
} as const;
export type DTone = keyof typeof TONES;

/** Page title block in the owner-app style: round tinted icon, black title, muted subtitle, optional right slot. */
export function PageHeader({ icon, title, subtitle, right }: { icon: IconName; title: string; subtitle?: string; right?: React.ReactNode }) {
  return (
    <View className="flex-row items-center gap-3">
      <View className="w-11 h-11 rounded-full bg-orange-100 items-center justify-center">
        <Ionicons name={icon} size={20} color={colors.primary} />
      </View>
      <View className="flex-1">
        <Text className="text-[20px] font-black text-ink" numberOfLines={1}>{title}</Text>
        {!!subtitle && <Text className="text-xs text-muted leading-4" numberOfLines={2}>{subtitle}</Text>}
      </View>
      {right}
    </View>
  );
}

/** White rounded card - the same look as the owner app's Card (rounded-3xl, soft cream-orange border). */
export function Panel({ children, className }: { children?: React.ReactNode; className?: string }) {
  return <View className={cn('bg-white rounded-3xl border border-line p-4', className)}>{children}</View>;
}

/** Card header like the owner dashboard's SectionHeader: round tinted icon + title + caption, optional "View All" pill on the right. */
export function PanelHeader({ icon, tone = 'orange', title, caption, action, onAction }: { icon?: IconName; tone?: DTone; title: string; caption?: string; action?: string; onAction?: () => void }) {
  const t = TONES[tone];
  return (
    <View className="flex-row items-center gap-2.5 mb-3.5">
      {!!icon && <View className={cn('w-10 h-10 rounded-full items-center justify-center', t.soft)}><Ionicons name={icon} size={18} color={t.fg} /></View>}
      <View className="flex-1">
        <Text className="text-[17px] font-extrabold text-ink" numberOfLines={1}>{title}</Text>
        {!!caption && <Text className="text-xs text-muted" numberOfLines={1}>{caption}</Text>}
      </View>
      {!!action && (
        <Pressable onPress={onAction} accessibilityRole="button" className="px-3 py-1.5 rounded-full bg-primary-soft active:opacity-70">
          <Text className="text-xs font-bold text-primary">{action}</Text>
        </Pressable>
      )}
    </View>
  );
}

export type WebStat = { title: string; value: string | number; icon: IconName; tone: DTone; caption?: string; onPress?: () => void };

/** Stat cards: label on top, big number below, round tinted icon on the right. Two per row on a phone. */
export function WebStatGrid({ stats }: { stats: WebStat[] }) {
  return (
    <View className="flex-row flex-wrap gap-3">
      {stats.map((s) => {
        const t = TONES[s.tone];
        const body = (
          <>
            <View className="flex-1">
              <Text className="text-xs font-semibold text-muted" numberOfLines={1}>{s.title}</Text>
              <Text className="text-[26px] font-black text-ink leading-8 mt-0.5" numberOfLines={1} adjustsFontSizeToFit>{s.value}</Text>
              {!!s.caption && <Text className="text-[10.5px] text-muted" numberOfLines={1}>{s.caption}</Text>}
            </View>
            <View className={cn('w-11 h-11 rounded-full items-center justify-center', t.soft)}><Ionicons name={s.icon} size={20} color={t.fg} /></View>
          </>
        );
        const box = 'w-[48.4%] flex-row items-center gap-2 bg-white rounded-3xl border border-line px-3.5 py-3';
        return s.onPress
          ? <Pressable key={s.title} onPress={s.onPress} accessibilityRole="button" accessibilityLabel={`${s.title}: ${s.value}`} className={cn(box, 'active:bg-primary-soft')}>{body}</Pressable>
          : <View key={s.title} className={box}>{body}</View>;
      })}
    </View>
  );
}

/** Dashboard stat card with the web's gradient fill (orange / green / purple / blue). */
export const GRADIENT_FILL: Record<string, [string, string]> = {
  orange: ['#FDBA74', '#FBBF24'], green: ['#6EE7B7', '#4ADE80'], purple: ['#A78BFA', '#A78BFA'], blue: ['#60A5FA', '#22D3EE'],
};

/** Small tinted number tile used inside "Overview" style panels (Visits / Revenue / New patients / Treatments). */
export function MiniStat({ icon, tone, label, value }: { icon: IconName; tone: DTone; label: string; value: string | number }) {
  const t = TONES[tone];
  return (
    <View className={cn('w-[48.5%] rounded-2xl p-3', t.pale)}>
      <View className="flex-row items-center gap-1.5"><Ionicons name={icon} size={14} color={t.fg} /><Text className="text-[11.5px] font-semibold text-muted" numberOfLines={1}>{label}</Text></View>
      <Text className="text-[22px] font-black text-ink mt-0.5" numberOfLines={1} adjustsFontSizeToFit>{value}</Text>
    </View>
  );
}

/** Coloured status pill with the web's palette (Completed green, Confirmed purple, Pending yellow, Cancelled red, else blue). */
export function WebStatusBadge({ status }: { status: string }) {
  const m: Record<string, [string, string]> = {
    Completed: ['bg-green-100', 'text-green-600'], Confirmed: ['bg-purple-100', 'text-purple-600'], Pending: ['bg-yellow-100', 'text-yellow-700'],
    Cancelled: ['bg-red-100', 'text-red-600'], Scheduled: ['bg-orange-100', 'text-orange-600'],
  };
  const [bg, fg] = m[status] ?? ['bg-blue-100', 'text-blue-600'];
  return <View className={cn('self-start rounded-full px-2.5 py-0.5', bg)}><Text className={cn('text-[10.5px] font-semibold', fg)}>{status}</Text></View>;
}

/** Round icon-only action button (web's row action buttons: view / reschedule / reminder). */
export function IconAction({ icon, tone, label, onPress }: { icon: IconName; tone: DTone; label: string; onPress: () => void }) {
  const t = TONES[tone];
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={label} className={cn('flex-1 h-10 rounded-xl items-center justify-center active:opacity-70', t.pale)}>
      <Ionicons name={icon} size={16} color={t.fg} />
    </Pressable>
  );
}

export const WEB_BG = colors.bg;

/** List row in the web card style: avatar, title / subtitle / caption, optional right slot, chevron when tappable. */
export function DoctorRow({ image, emoji = '🐾', title, subtitle, caption, right, onPress }: {
  image?: string | null; emoji?: string; title: string; subtitle?: string; caption?: string; right?: React.ReactNode; onPress?: () => void;
}) {
  const body = (
    <>
      <View className="rounded-full border-2 border-primary p-0.5"><Avatar image={image} emoji={emoji} size={44} /></View>
      <View className="flex-1 gap-0.5">
        <Text className="text-[15px] font-bold text-ink" numberOfLines={1}>{title}</Text>
        {!!subtitle && <Text className="text-[12.5px] text-muted" numberOfLines={1}>{subtitle}</Text>}
        {!!caption && <Text className="text-[11.5px] text-muted" numberOfLines={1}>{caption}</Text>}
      </View>
      {right}
      {!!onPress && <Ionicons name="chevron-forward" size={16} color={colors.muted} />}
    </>
  );
  const box = 'flex-row items-center gap-3 bg-white rounded-2xl border border-line p-3';
  return onPress
    ? <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={title} className={cn(box, 'active:bg-primary-soft')}>{body}</Pressable>
    : <View className={box}>{body}</View>;
}

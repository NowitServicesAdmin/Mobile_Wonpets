import React from 'react';
import { Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme';
import { T, cn } from '../ui';

type IconName = keyof typeof Ionicons.glyphMap;

/** A titled white card - same look as the sections on the owner's Profile page. */
export function FormCard({ icon, title, right, children, tone = 'orange' }: { icon: IconName; title: string; right?: React.ReactNode; children: React.ReactNode; tone?: 'orange' | 'red' }) {
  return (
    <View className={cn('bg-white rounded-3xl border p-4 gap-3.5', tone === 'red' ? 'border-red/30' : 'border-orange-100')}>
      <View className="flex-row items-center gap-2.5">
        <View className={cn('w-8 h-8 rounded-xl items-center justify-center', tone === 'red' ? 'bg-red-soft' : 'bg-primary-soft')}><Ionicons name={icon} size={17} color={tone === 'red' ? colors.red : colors.primary} /></View>
        <Text className={cn('flex-1 text-[16px] font-extrabold', tone === 'red' ? 'text-red' : 'text-ink')}>{title}</Text>
        {right}
      </View>
      {children}
    </View>
  );
}

/** Read-only value with a lock, so it is clear it can't be edited. */
export function LockedRow({ icon, label, value }: { icon: IconName; label: string; value?: string }) {
  return (
    <View className="flex-row items-center gap-3 rounded-2xl bg-cream border border-line px-3.5 py-3">
      <Ionicons name={icon} size={18} color={colors.muted} />
      <View className="flex-1"><Text className={T.small}>{label}</Text><Text numberOfLines={1} className="text-[15px] font-semibold text-ink">{value || '—'}</Text></View>
      <Ionicons name="lock-closed" size={14} color={colors.muted} />
    </View>
  );
}

/** Small tinted message box (info / success / warning). */
export function Notice({ tone = 'info', icon, children }: { tone?: 'info' | 'success' | 'warning'; icon?: IconName; children: React.ReactNode }) {
  const t = {
    info: { box: 'bg-primary-soft border-orange-100', fg: colors.primary, ic: 'information-circle' as IconName },
    success: { box: 'bg-green-soft border-green/20', fg: colors.green, ic: 'lock-closed' as IconName },
    warning: { box: 'bg-yellow-soft border-yellow/30', fg: colors.yellow, ic: 'alert-circle' as IconName },
  }[tone];
  return (
    <View className={cn('flex-row items-start gap-2.5 rounded-2xl border px-3.5 py-3', t.box)}>
      <Ionicons name={icon ?? t.ic} size={16} color={t.fg} style={{ marginTop: 1 }} />
      <Text className="flex-1 text-[12.5px] leading-[18px] text-ink">{children}</Text>
    </View>
  );
}

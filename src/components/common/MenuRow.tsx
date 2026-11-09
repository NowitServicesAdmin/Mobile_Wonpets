import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme';
import { cn } from '../ui';

export type MenuTone = 'orange' | 'purple' | 'blue' | 'green' | 'yellow' | 'pink' | 'red';
export const MENU_TONE: Record<MenuTone, { box: string; fg: string }> = {
  orange: { box: 'bg-primary-soft', fg: colors.primary },
  purple: { box: 'bg-purple-soft', fg: colors.purple },
  blue: { box: 'bg-blue-soft', fg: colors.blue },
  green: { box: 'bg-green-soft', fg: colors.green },
  yellow: { box: 'bg-yellow-soft', fg: colors.yellow },
  pink: { box: 'bg-pink-soft', fg: colors.pink },
  red: { box: 'bg-red-soft', fg: colors.red },
};

/** Settings-style row: tinted icon square, title + hint, optional badge, chevron. */
export default function MenuRow({
  icon, tone = 'orange', title, hint, badge, onPress, last,
}: { icon: keyof typeof Ionicons.glyphMap; tone?: MenuTone; title: string; hint?: string; badge?: number; onPress: () => void; last?: boolean }) {
  const t = MENU_TONE[tone];
  return (
    <Pressable onPress={onPress} accessibilityRole="button" className={cn('flex-row items-center gap-3 px-4 py-3.5 active:bg-cream', !last && 'border-b border-line')}>
      <View className={cn('w-10 h-10 rounded-xl items-center justify-center', t.box)}><Ionicons name={icon} size={20} color={t.fg} /></View>
      <View className="flex-1">
        <Text className="text-[15px] font-bold text-ink">{title}</Text>
        {!!hint && <Text className="text-xs text-muted" numberOfLines={1}>{hint}</Text>}
      </View>
      {!!badge && badge > 0 && <View className="min-w-[20px] h-5 px-1.5 rounded-full bg-primary items-center justify-center"><Text className="text-white text-[10px] font-bold">{badge}</Text></View>}
      <Ionicons name="chevron-forward" size={18} color="#CDBFB0" />
    </Pressable>
  );
}

/** White rounded group that holds MenuRows. */
export function MenuGroup({ title, children }: { title?: string; children: React.ReactNode }) {
  return (
    <View>
      {!!title && <Text className="text-[11px] font-extrabold uppercase tracking-wider text-muted mb-2 ml-1">{title}</Text>}
      <View className="bg-white rounded-3xl border border-line overflow-hidden">{children}</View>
    </View>
  );
}

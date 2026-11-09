import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { cn } from '../ui';

export type Stat = { label: string; value: number | string; color: string; icon: keyof typeof Ionicons.glyphMap; onPress?: () => void };

/** Compact number card: tinted icon, big number, small label. */
export function StatTile({ label, value, color, icon, onPress }: Stat) {
  const body = (
    <>
      <Ionicons name={icon} size={15} color={color} />
      <Text className="text-[20px] font-black text-ink leading-6">{value}</Text>
      <Text className="text-[10px] font-semibold text-muted" numberOfLines={1}>{label}</Text>
    </>
  );
  const box = 'flex-1 bg-white border border-line rounded-2xl py-2.5 items-center';
  return onPress
    ? <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={`${label}: ${value}`} className={cn(box, 'active:bg-primary-soft')}>{body}</Pressable>
    : <View className={box}>{body}</View>;
}

/** A row of StatTiles sharing the width equally. */
export default function StatRow({ stats, className }: { stats: Stat[]; className?: string }) {
  return <View className={cn('flex-row gap-2', className)}>{stats.map((s) => <StatTile key={s.label} {...s} />)}</View>;
}

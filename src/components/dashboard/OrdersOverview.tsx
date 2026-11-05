import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme';
import { Card, SectionHeader, cn } from '../ui';

type Status = 'Pending' | 'Processing' | 'Delivered' | 'Cancelled';
type Props = { counts: Record<Status, number>; onOpen: (filter?: Status) => void };

const cards: { k: Status; icon: keyof typeof Ionicons.glyphMap; box: string; iconBox: string; fg: string }[] = [
  { k: 'Pending', icon: 'cube-outline', box: 'bg-orange-50', iconBox: 'bg-orange-100', fg: '#F97316' },
  { k: 'Processing', icon: 'car-outline', box: 'bg-blue-50', iconBox: 'bg-blue-100', fg: '#3B82F6' },
  { k: 'Delivered', icon: 'checkmark-circle-outline', box: 'bg-green-50', iconBox: 'bg-green-100', fg: '#22C55E' },
  { k: 'Cancelled', icon: 'close-circle-outline', box: 'bg-red-50', iconBox: 'bg-red-100', fg: '#EF4444' },
];

export default function OrdersOverview({ counts, onOpen }: Props) {
  return (
    <Card className="border-orange-100">
      <SectionHeader
        title="My Orders"
        subtitle="Monitor your recent purchases"
        icon={<View className="w-10 h-10 rounded-full bg-orange-100 items-center justify-center"><Ionicons name="clipboard-outline" size={19} color={colors.primary} /></View>}
      />
      {/* 2 x 2 compact tiles: icon on the left, status + count on the right */}
      <View className="flex-row flex-wrap gap-2.5">
        {cards.map((c) => (
          <Pressable key={c.k} onPress={() => onOpen(c.k)} accessibilityRole="button" accessibilityLabel={`${c.k} orders: ${counts[c.k]}`} className={cn('w-[48.3%] flex-row items-center gap-2.5 rounded-2xl px-3 py-3 active:opacity-80', c.box)}>
            <View className={cn('w-10 h-10 rounded-full items-center justify-center', c.iconBox)}><Ionicons name={c.icon} size={19} color={c.fg} /></View>
            <View className="flex-1">
              <Text maxFontSizeMultiplier={1.1} className="text-xs font-semibold text-muted" numberOfLines={1}>{c.k}</Text>
              <Text maxFontSizeMultiplier={1.1} className="text-[22px] font-black text-ink leading-7">{String(counts[c.k]).padStart(2, '0')}</Text>
            </View>
          </Pressable>
        ))}
      </View>
      <Pressable onPress={() => onOpen()} accessibilityRole="button" className="flex-row items-center justify-between mt-3 bg-primary-soft rounded-2xl px-3.5 py-3 active:opacity-80">
        <View className="flex-row items-center gap-2">
          <Ionicons name="time-outline" size={17} color={colors.primary} />
          <Text maxFontSizeMultiplier={1.1} className="text-primary font-bold">View order history</Text>
        </View>
        <Ionicons name="arrow-forward" size={17} color={colors.primary} />
      </Pressable>
    </Card>
  );
}
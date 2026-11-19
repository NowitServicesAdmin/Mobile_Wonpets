import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { cn } from '../ui';
import { Panel, PanelHeader } from '../doctor/DoctorUI';

type Status = 'Pending' | 'Processing' | 'Delivered' | 'Cancelled';
type Props = { counts: Record<Status, number>; onOpen: (filter?: Status) => void };

const cards: { k: Status; icon: keyof typeof Ionicons.glyphMap; box: string; iconBox: string; fg: string }[] = [
  { k: 'Pending', icon: 'cube-outline', box: 'bg-orange-50', iconBox: 'bg-orange-100', fg: '#F97316' },
  { k: 'Processing', icon: 'car-outline', box: 'bg-blue-50', iconBox: 'bg-blue-100', fg: '#3B82F6' },
  { k: 'Delivered', icon: 'checkmark-circle-outline', box: 'bg-green-50', iconBox: 'bg-green-100', fg: '#22C55E' },
  { k: 'Cancelled', icon: 'close-circle-outline', box: 'bg-red-50', iconBox: 'bg-red-100', fg: '#EF4444' },
];

/** Order counts in a single row of four tiles (was a 2 x 2 grid). */
export default function OrdersOverview({ counts, onOpen }: Props) {
  return (
    <Panel compact className="border-orange-100">
      <PanelHeader compact icon="clipboard" title="My Orders" caption="Monitor your recent purchases" action="View All" onAction={() => onOpen()} />
      <View className="flex-row gap-1.5">
        {cards.map((c) => (
          <Pressable key={c.k} onPress={() => onOpen(c.k)} accessibilityRole="button" accessibilityLabel={`${c.k} orders: ${counts[c.k]}`} className={cn('flex-1 items-center rounded-2xl py-2 px-1 active:opacity-80', c.box)}>
            <View className={cn('w-8 h-8 rounded-full items-center justify-center', c.iconBox)}><Ionicons name={c.icon} size={16} color={c.fg} /></View>
            <Text maxFontSizeMultiplier={1.1} className="text-[17px] font-black text-ink leading-6 mt-0.5">{String(counts[c.k]).padStart(2, '0')}</Text>
            <Text maxFontSizeMultiplier={1.1} className="text-[10px] font-semibold text-muted" numberOfLines={1}>{c.k}</Text>
          </Pressable>
        ))}
      </View>
    </Panel>
  );
}
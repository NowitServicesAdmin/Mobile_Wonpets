import React from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { cn } from '../ui';

const pad = (n: number) => String(n).padStart(2, '0');
export const isoLocal = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

export type DayOpt = { key: string; dow: string; day: number; month: string; date: Date };
/** `count` consecutive days starting `startOffset` days from today (negative = past days). */
export const buildDays = (count = 14, startOffset = 0): DayOpt[] =>
  Array.from({ length: count }, (_, i) => {
    const d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() + startOffset + i);
    return { key: isoLocal(d), dow: d.toLocaleDateString('en-IN', { weekday: 'short' }), day: d.getDate(), month: d.toLocaleDateString('en-IN', { month: 'short' }), date: d };
  });

/** Horizontal day picker. `marks` shows a small count badge on days that have items (doctor schedule). */
export default function DateStrip({
  days, value, onChange, marks, todayKey = isoLocal(new Date()),
}: { days: DayOpt[]; value: string; onChange: (key: string) => void; marks?: Record<string, number>; todayKey?: string }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="gap-2 pr-2">
      {days.map((d) => {
        const on = d.key === value;
        const n = marks?.[d.key] ?? 0;
        return (
          <Pressable key={d.key} onPress={() => onChange(d.key)} accessibilityRole="button" accessibilityLabel={`${d.dow} ${d.day} ${d.month}`}
            className={cn('w-[58px] py-3 rounded-2xl items-center border-[1.5px]', on ? 'bg-primary border-primary' : 'bg-white border-line')}>
            <Text className={cn('text-[11px] font-bold uppercase', on ? 'text-white/90' : 'text-muted')}>{d.key === todayKey ? 'Today' : d.dow}</Text>
            <Text className={cn('text-[20px] font-black mt-0.5', on ? 'text-white' : 'text-ink')}>{d.day}</Text>
            <Text className={cn('text-[10px] font-semibold', on ? 'text-white/80' : 'text-muted')}>{d.month}</Text>
            {n > 0 && <View className={cn('absolute -top-1.5 -right-1 min-w-[18px] h-[18px] px-1 rounded-full items-center justify-center border-2 border-cream', on ? 'bg-ink' : 'bg-primary')}><Text className="text-white text-[9px] font-extrabold">{n}</Text></View>}
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

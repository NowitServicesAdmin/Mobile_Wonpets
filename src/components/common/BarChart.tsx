import React from 'react';
import { Text, View } from 'react-native';
import { colors } from '../../theme';

/** Tiny dependency-free bar chart (no chart library needed). Values are scaled to the tallest bar. */
export default function BarChart({
  data, height = 120, color = colors.primary, format = (n: number) => String(n),
}: { data: { label: string; value: number }[]; height?: number; color?: string; format?: (n: number) => string }) {
  const max = Math.max(1, ...data.map((d) => d.value));
  return (
    <View className="flex-row items-end justify-between gap-1.5" style={{ height: height + 34 }}>
      {data.map((d, i) => {
        const h = Math.max(d.value > 0 ? 4 : 2, Math.round((d.value / max) * height));
        return (
          <View key={`${d.label}-${i}`} className="flex-1 items-center justify-end">
            {d.value > 0 && <Text className="text-[9px] font-bold text-muted mb-0.5" numberOfLines={1}>{format(d.value)}</Text>}
            <View style={{ height: h, backgroundColor: d.value > 0 ? color : '#F3E7DA' }} className="w-full rounded-t-lg" />
            <Text className="text-[10px] text-muted mt-1" numberOfLines={1}>{d.label}</Text>
          </View>
        );
      })}
    </View>
  );
}

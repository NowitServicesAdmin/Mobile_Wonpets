import React from 'react';
import { Text, View } from 'react-native';
import { cn } from '../ui';

/** Small "LABEL / value" pair (prescription, patient info…). */
export function InfoField({ k, v, className }: { k: string; v?: string | number | null; className?: string }) {
  return (
    <View style={{ width: '48%' }} className={className}>
      <Text className="text-[10px] text-muted uppercase">{k}</Text>
      <Text className="text-sm font-bold text-ink mt-0.5">{v === undefined || v === null || v === '' ? '—' : String(v)}</Text>
    </View>
  );
}

/** Two-column grid of InfoFields. */
export default function InfoGrid({ items, className }: { items: [string, string | number | null | undefined][]; className?: string }) {
  return <View className={cn('flex-row flex-wrap gap-y-3 justify-between', className)}>{items.map(([k, v]) => <InfoField key={k} k={k} v={v} />)}</View>;
}

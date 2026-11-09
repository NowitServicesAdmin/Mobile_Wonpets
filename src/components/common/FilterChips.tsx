import React from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { cn } from '../ui';

export type FilterOption = { key: string; label: string; count?: number; color?: string; soft?: string };

/**
 * Horizontal filter chips with an "All" chip first. Multi-select: an empty `active` list means "All".
 * Options with a `color` get a coloured dot and tint when selected (status filters).
 */
export default function FilterChips({
  options, active, onChange, allLabel = 'All', allCount,
}: { options: FilterOption[]; active: string[]; onChange: (next: string[]) => void; allLabel?: string; allCount?: number }) {
  const toggle = (k: string) => onChange(active.includes(k) ? active.filter((x) => x !== k) : [...active, k]);
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="gap-2 pr-4">
      <Pressable onPress={() => onChange([])} className={cn('px-3.5 py-2 rounded-full border', !active.length ? 'bg-ink border-ink' : 'bg-white border-line')}>
        <Text className={cn('font-bold text-[13px]', !active.length ? 'text-white' : 'text-ink')}>{allLabel}{allCount !== undefined ? ` · ${allCount}` : ''}</Text>
      </Pressable>
      {options.map((o) => {
        const on = active.includes(o.key);
        return (
          <Pressable key={o.key} onPress={() => toggle(o.key)}
            style={on && o.color ? { backgroundColor: o.soft, borderColor: o.color } : undefined}
            className={cn('flex-row items-center gap-1.5 px-3 py-2 rounded-full border', !on && 'bg-white border-line', on && !o.color && 'bg-primary-soft border-primary')}>
            {!!o.color && <View style={{ backgroundColor: o.color }} className="w-2 h-2 rounded-full" />}
            <Text style={on && o.color ? { color: o.color } : undefined} className={cn('font-bold text-[13px]', !on && 'text-ink', on && !o.color && 'text-primary')}>
              {o.label}{o.count !== undefined ? ` · ${o.count}` : ''}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

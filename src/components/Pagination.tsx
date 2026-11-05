import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme';
import { cn } from './ui';

/** 1 … 4 5 6 … 20 - always keeps first, last and the neighbours of the current page. */
export function pageWindow(page: number, total: number): (number | '…')[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const out: (number | '…')[] = [1];
  const from = Math.max(2, page - 1);
  const to = Math.min(total - 1, page + 1);
  if (from > 2) out.push('…');
  for (let p = from; p <= to; p++) out.push(p);
  if (to < total - 1) out.push('…');
  out.push(total);
  return out;
}

const Arrow = ({ icon, disabled, onPress, label }: { icon: 'chevron-back' | 'chevron-forward'; disabled: boolean; onPress: () => void; label: string }) => (
  <Pressable accessibilityLabel={label} disabled={disabled} onPress={onPress} hitSlop={4}
    className={cn('w-10 h-10 rounded-xl border items-center justify-center bg-white active:bg-primary-soft', disabled ? 'border-line opacity-40' : 'border-primary')}>
    <Ionicons name={icon} size={18} color={disabled ? colors.muted : colors.primary} />
  </Pressable>
);

/**
 * Same idea as the web's appointment pagination: a "Showing 1-6 of 23" line and numbered buttons.
 * `total` is the item count when known (used only for the summary line).
 */
export default function Pagination({
  page, totalPages, onChange, total, pageSize, disabled,
}: { page: number; totalPages: number; onChange: (p: number) => void; total?: number; pageSize?: number; disabled?: boolean }) {
  if (totalPages <= 1) return null;
  const summary = total != null && pageSize
    ? `Showing ${(page - 1) * pageSize + 1}–${Math.min(page * pageSize, total)} of ${total}`
    : `Page ${page} of ${totalPages}`;
  return (
    <View className={cn('items-center gap-3 py-4', disabled && 'opacity-60')} pointerEvents={disabled ? 'none' : 'auto'}>
      <Text className="text-xs text-muted">{summary}</Text>
      <View className="flex-row items-center gap-1.5">
        <Arrow icon="chevron-back" label="Previous page" disabled={page <= 1} onPress={() => onChange(page - 1)} />
        {pageWindow(page, totalPages).map((p, i) =>
          p === '…' ? (
            <Text key={`gap${i}`} className="w-6 text-center text-muted font-bold">…</Text>
          ) : (
            <Pressable key={p} accessibilityLabel={`Page ${p}`} accessibilityState={{ selected: p === page }} onPress={() => onChange(p)}
              className={cn('min-w-[38px] h-10 px-2 rounded-xl border items-center justify-center', p === page ? 'bg-primary border-primary' : 'bg-white border-line active:bg-primary-soft')}>
              <Text className={cn('font-bold text-sm', p === page ? 'text-white' : 'text-ink')}>{p}</Text>
            </Pressable>
          )
        )}
        <Arrow icon="chevron-forward" label="Next page" disabled={page >= totalPages} onPress={() => onChange(page + 1)} />
      </View>
    </View>
  );
}

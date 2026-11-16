import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme';
import BottomSheet from '../common/BottomSheet';
import Popover, { Anchor } from '../common/Popover';
import { STATUS_OPTIONS, useDoctor } from '../../context/DoctorContext';
import { cn } from '../ui';

/** Small coloured dot + label for the doctor's presence. */
export function StatusDot({ size = 10 }: { size?: number }) {
  const { status } = useDoctor();
  const o = STATUS_OPTIONS.find((x) => x.value === status) ?? STATUS_OPTIONS[0];
  return <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: o.dot }} />;
}

/** Pick Available / Busy / Away / On leave (same four states as the web status toggle).
 *  With an `anchor` (the header status button) it drops down right under it; without one it is a bottom sheet. */
export default function StatusSheet({ visible, onClose, anchor }: { visible: boolean; onClose: () => void; anchor?: Anchor | null }) {
  const { status, setStatus } = useDoctor();
  if (anchor) {
    return (
      <Popover visible={visible} onClose={onClose} anchor={anchor} width={290}>
        <Text className="text-[10.5px] font-extrabold text-muted uppercase tracking-wider px-2.5 pt-1 pb-1.5">Your status</Text>
        {STATUS_OPTIONS.map((o) => {
          const on = o.value === status;
          return (
            <Pressable key={o.value} onPress={() => { setStatus(o.value); onClose(); }} accessibilityRole="button" accessibilityState={{ selected: on }}
              className={cn('flex-row items-center gap-2.5 rounded-xl px-2.5 py-2.5 active:bg-cream', on && 'bg-primary-soft')}>
              <View style={{ backgroundColor: o.dot }} className="w-3 h-3 rounded-full" />
              <View className="flex-1"><Text className="text-[14px] font-bold text-ink">{o.label}</Text><Text className="text-[11.5px] text-muted" numberOfLines={2}>{o.hint}</Text></View>              
              {on && <Ionicons name="checkmark" size={18} color={colors.primary} />}
            </Pressable>
          );
        })}
      </Popover>
    );
  }
  return (
    <BottomSheet visible={visible} onClose={onClose} title="Your status" subtitle="What pet owners see next to your name">
      <View className="bg-white rounded-2xl border border-line overflow-hidden">
        {STATUS_OPTIONS.map((o, i) => {
          const on = o.value === status;
          return (
            <Pressable key={o.value} onPress={() => { setStatus(o.value); onClose(); }} accessibilityRole="button" accessibilityState={{ selected: on }}
              className={cn('flex-row items-center gap-3 px-4 py-3.5 active:bg-cream', i > 0 && 'border-t border-line', on && 'bg-primary-soft')}>
              <View style={{ backgroundColor: o.dot }} className="w-3 h-3 rounded-full" />
              <View className="flex-1"><Text className="text-[15px] font-bold text-ink">{o.label}</Text><Text className="text-xs text-muted">{o.hint}</Text></View>
              {on && <Ionicons name="checkmark" size={20} color={colors.primary} />}
            </Pressable>
          );
        })}
      </View>
    </BottomSheet>
  );
}
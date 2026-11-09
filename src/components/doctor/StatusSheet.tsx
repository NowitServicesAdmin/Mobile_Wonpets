import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme';
import BottomSheet from '../common/BottomSheet';
import { STATUS_OPTIONS, useDoctor } from '../../context/DoctorContext';
import { cn } from '../ui';

/** Small coloured dot + label for the doctor's presence. */
export function StatusDot({ size = 10 }: { size?: number }) {
  const { status } = useDoctor();
  const o = STATUS_OPTIONS.find((x) => x.value === status) ?? STATUS_OPTIONS[0];
  return <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: o.dot }} />;
}

/** Pick Available / Busy / Away / On leave (same four states as the web status toggle). */
export default function StatusSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { status, setStatus } = useDoctor();
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

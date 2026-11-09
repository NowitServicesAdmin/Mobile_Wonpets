import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme';

/** Pill-style segmented control (List | Calendar, Overview | Visits | …). */
export default function SegmentedTabs<K extends string>({
  tabs, value, onChange,
}: { tabs: { key: K; label: string; icon?: keyof typeof Ionicons.glyphMap }[]; value: K; onChange: (k: K) => void }) {
  return (
    <View className="flex-row bg-orange-100/60 rounded-2xl p-1">
      {tabs.map(({ key, label, icon }) => {
        const on = value === key;
        return (
          <Pressable
            key={key}
            onPress={() => onChange(key)}
            accessibilityRole="tab"
            accessibilityState={{ selected: on }}
            style={on ? { backgroundColor: '#fff', elevation: 2, shadowColor: '#7C2D12', shadowOpacity: 0.12, shadowRadius: 4, shadowOffset: { width: 0, height: 1 } } : undefined}
            className="flex-1 flex-row items-center justify-center gap-1.5 py-2.5 rounded-xl"
          >
            {!!icon && <Ionicons name={icon} size={16} color={on ? colors.primary : colors.muted} />}
            <Text style={{ color: on ? colors.primary : colors.muted }} className="font-bold text-[13px]" numberOfLines={1}>{label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

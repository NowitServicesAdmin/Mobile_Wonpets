import React from 'react';
import { Pressable, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme';

const icon = (value: number, star: number) => (value >= star ? 'star' : value >= star - 0.5 ? 'star-half' : 'star-outline');

/** Read-only stars (supports half stars). */
export function Stars({ value, size = 14, gap = 2 }: { value: number; size?: number; gap?: number }) {
  return <View className="flex-row" style={{ gap }}>{[1, 2, 3, 4, 5].map((s) => <Ionicons key={s} name={icon(value, s)} size={size} color={value >= s - 0.5 ? colors.yellow : '#D6CCC2'} />)}</View>;
}

/** Tap the left half of a star for x.5, the right half for the whole star. */
export function StarInput({ value, onChange, size = 38 }: { value: number; onChange: (v: number) => void; size?: number }) {
  return (
    <View className="flex-row" style={{ gap: 4 }}>
      {[1, 2, 3, 4, 5].map((s) => (
        <View key={s} style={{ width: size, height: size }}>
          <Ionicons name={icon(value, s)} size={size} color={value >= s - 0.5 ? colors.yellow : '#D6CCC2'} />
          <View className="absolute inset-0 flex-row">
            <Pressable className="flex-1" onPress={() => onChange(s - 0.5)} />
            <Pressable className="flex-1" onPress={() => onChange(s)} />
          </View>
        </View>
      ))}
    </View>
  );
}

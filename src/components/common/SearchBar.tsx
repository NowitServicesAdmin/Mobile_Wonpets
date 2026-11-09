import React from 'react';
import { Pressable, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme';
import { cn } from '../ui';

/** Search box with a clear button. `trailing` adds a square icon button next to it (e.g. a sort toggle). */
export default function SearchBar({
  value, onChangeText, placeholder = 'Search…', trailing, className,
}: {
  value: string; onChangeText: (t: string) => void; placeholder?: string;
  trailing?: { icon: keyof typeof Ionicons.glyphMap; label: string; onPress: () => void };
  className?: string;
}) {
  return (
    <View className={cn('flex-row gap-2', className)}>
      <View className="flex-1 flex-row items-center gap-2 bg-white border border-line rounded-2xl px-3">
        <Ionicons name="search-outline" size={18} color={colors.muted} />
        <TextInput value={value} onChangeText={onChangeText} placeholder={placeholder} placeholderTextColor="#B8AEA5" className="flex-1 py-3 text-ink" autoCorrect={false} />
        {!!value && <Pressable onPress={() => onChangeText('')} hitSlop={8} accessibilityLabel="Clear search"><Ionicons name="close-circle" size={18} color="#CDBFB0" /></Pressable>}
      </View>
      {!!trailing && (
        <Pressable onPress={trailing.onPress} accessibilityRole="button" accessibilityLabel={trailing.label} className="w-12 rounded-2xl bg-white border border-line items-center justify-center active:bg-primary-soft">
          <Ionicons name={trailing.icon} size={18} color={colors.primary} />
        </Pressable>
      )}
    </View>
  );
}

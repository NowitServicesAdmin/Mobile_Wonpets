import React from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme';
import { cn } from '../ui';

/**
 * Search box with a clear button. `trailing` adds a square icon button next to it (e.g. a sort toggle or a filter button).
 * `trailing.badge` shows a small count on that button (e.g. the number of active filters) and tints it.
 */
export default function SearchBar({
  value, onChangeText, placeholder = 'Search…', trailing, className,
}: {
  value: string; onChangeText: (t: string) => void; placeholder?: string;
  trailing?: { icon: keyof typeof Ionicons.glyphMap; label: string; onPress: () => void; badge?: number };
  className?: string;
}) {
  const on = !!trailing?.badge && trailing.badge > 0;
  return (
    <View className={cn('flex-row gap-2', className)}>
      <View className="flex-1 flex-row items-center gap-2 bg-white border border-line rounded-2xl px-3">
        <Ionicons name="search-outline" size={18} color={colors.muted} />
        <TextInput value={value} onChangeText={onChangeText} placeholder={placeholder} placeholderTextColor="#B8AEA5" className="flex-1 py-3 text-ink" autoCorrect={false} />
        {!!value && <Pressable onPress={() => onChangeText('')} hitSlop={8} accessibilityLabel="Clear search"><Ionicons name="close-circle" size={18} color="#CDBFB0" /></Pressable>}
      </View>
      {!!trailing && (
        <Pressable onPress={trailing.onPress} accessibilityRole="button" accessibilityLabel={trailing.label} className={cn('w-12 rounded-2xl border items-center justify-center active:bg-primary-soft', on ? 'bg-primary-soft border-primary' : 'bg-white border-line')}>
          <Ionicons name={trailing.icon} size={18} color={colors.primary} />
          {on && (
            <View className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 rounded-full bg-primary border-2 border-cream items-center justify-center">
              <Text className="text-white text-[9px] font-extrabold">{trailing.badge}</Text>
            </View>
          )}
        </Pressable>
      )}
    </View>
  );
}
import React from 'react';
import { ActivityIndicator, Image, Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme';
import type { Suggestion } from '../../hooks/useSuggestions';

/** Title with the typed part picked out in orange. */
function Highlight({ text, query }: { text: string; query: string }) {
  const i = query ? text.toLowerCase().indexOf(query.toLowerCase()) : -1;
  if (i < 0) return <Text className="text-[15px] font-bold text-ink" numberOfLines={1}>{text}</Text>;
  return (
    <Text className="text-[15px] font-bold text-ink" numberOfLines={1}>
      {text.slice(0, i)}<Text className="text-primary">{text.slice(i, i + query.length)}</Text>{text.slice(i + query.length)}
    </Text>
  );
}

/**
 * The suggestion card under a search box: a small section label ("STORE" / "RESELL"), then up to a few rows
 * (picture, name, price). It sits in the normal layout (not floating), so taps work the same on iOS and Android.
 * The scrolling list that holds it needs keyboardShouldPersistTaps="handled".
 */
export default function SuggestionDropdown({ label, items, loading, query, onPick, onSeeAll }: {
  label: string; items: Suggestion[]; loading: boolean; query: string;
  onPick: (s: Suggestion) => void;
  /** adds a last row that runs the full search for what was typed */
  onSeeAll?: () => void;
}) {
  const q = query.trim();
  return (
    <View className="bg-white rounded-2xl border border-line px-3.5 py-3 shadow-md shadow-orange-800/10">
      <Text className="text-[11px] font-extrabold tracking-widest text-muted mb-1">{label.toUpperCase()}</Text>
      {items.map((s) => (
        <Pressable key={s.id} onPress={() => onPick(s)} className="flex-row items-center gap-3 py-2 active:opacity-70" accessibilityRole="button" accessibilityLabel={s.title}>
          <View className="w-11 h-11 rounded-xl bg-[#FBF3EA] items-center justify-center overflow-hidden">
            {s.image ? <Image source={{ uri: s.image }} className="w-full h-full" resizeMode="cover" /> : <Text className="text-2xl">{s.emoji ?? '🐾'}</Text>}
          </View>
          <View className="flex-1">
            <Highlight text={s.title} query={q} />
            {!!s.subtitle && <Text className="text-[13px] text-muted" numberOfLines={1}>{s.subtitle}</Text>}
          </View>
        </Pressable>
      ))}
      {!items.length && (
        loading
          ? <View className="py-3 items-center"><ActivityIndicator size="small" color={colors.primary} /></View>
          : <Text className="text-[13px] text-muted py-3">No {label.toLowerCase()} matches for “{q}”</Text>
      )}
      {!!items.length && !!onSeeAll && (
        <Pressable onPress={onSeeAll} className="flex-row items-center gap-2 pt-2.5 mt-1 border-t border-line active:opacity-70">
          <Ionicons name="search-outline" size={16} color={colors.primary} />
          <Text className="flex-1 text-[13px] font-bold text-primary" numberOfLines={1}>See all results for “{q}”</Text>
          <Ionicons name="chevron-forward" size={16} color={colors.primary} />
        </Pressable>
      )}
    </View>
  );
}
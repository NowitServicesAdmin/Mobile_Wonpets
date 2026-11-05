import React from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme';
import { T } from './ui';

/**
 * Footer for infinite-scroll lists (replaces the numbered pager).
 * - more to load  -> small spinner, the next batch loads as the user nears the end
 * - load failed   -> "Tap to retry" (auto-loading pauses so it never loops on an error)
 * - reached the end -> quiet "all N shown" line
 */
export default function LoadMoreFooter({
  loading, hasMore, failed, onRetry, total, noun = 'items',
}: { loading?: boolean; hasMore: boolean; failed?: boolean; onRetry?: () => void; total: number; noun?: string }) {
  if (failed) {
    return (
      <Pressable onPress={onRetry} accessibilityRole="button" accessibilityLabel="Retry loading more" className="py-5 items-center flex-row justify-center gap-1.5 active:opacity-70">
        <Ionicons name="refresh" size={15} color={colors.primary} />
        <Text className="text-primary font-bold text-[13px]">Couldn't load more · Tap to retry</Text>
      </Pressable>
    );
  }
  if (hasMore || loading) {
    return (
      <View className="py-5 items-center flex-row justify-center gap-2">
        <ActivityIndicator size="small" color={colors.primary} />
        <Text className={T.small}>Loading more…</Text>
      </View>
    );
  }
  if (total <= 0) return null;
  return (
    <View className="py-5 items-center">
      <Text className={T.small}>You've reached the end · {total} {total === 1 ? noun.replace(/s$/, '') : noun}</Text>
    </View>
  );
}
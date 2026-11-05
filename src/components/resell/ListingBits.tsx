import React from 'react';
import { Image, Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme';
import { Chip, T, cn } from '../ui';
import { toast } from '../WonPetsAlert';
import { Listing, timeAgo } from '../../data/resell';
import { useResell } from '../../context/ResellContext';
import { inr } from '../../utils/orders';

/** First photo if the seller added one, otherwise the category emoji. */
export function ListingThumb({ item, className, emojiSize = 56 }: { item: Listing; className?: string; emojiSize?: number }) {
  return (
    <View className={cn('bg-[#FBF3EA] items-center justify-center overflow-hidden', className)}>
      {item.photos[0] ? <Image source={{ uri: item.photos[0] }} className="w-full h-full" resizeMode="cover" /> : <Text style={{ fontSize: emojiSize }}>{item.emoji}</Text>}
    </View>
  );
}

export function HeartButton({ id, size = 30 }: { id: string; size?: number }) {
  const { favourites, toggleFavourite } = useResell();
  const on = favourites.includes(id);
  return (
    <Pressable hitSlop={8} onPress={() => toast.success(toggleFavourite(id) ? 'Added to favourites' : 'Removed from favourites')} style={{ width: size, height: size, borderRadius: size / 2 }} className={cn('items-center justify-center shadow-sm', on ? 'bg-red-soft' : 'bg-white/95')}>
      <Ionicons name={on ? 'heart' : 'heart-outline'} size={size * 0.58} color={colors.red} />
    </Pressable>
  );
}

/** Marketplace card. `compact` = fixed-width card for horizontal rails. */
export function ListingCard({ item, onPress, compact }: { item: Listing; onPress: () => void; compact?: boolean }) {
  const off = item.originalPrice && item.originalPrice > item.price ? Math.round((1 - item.price / item.originalPrice) * 100) : 0;
  return (
    <Pressable onPress={onPress} className={cn('bg-white rounded-[26px] p-2 border border-line shadow-sm shadow-orange-900/10 active:opacity-90', compact ? 'w-[168px]' : 'flex-1 mb-3')}>
      <View>
        <ListingThumb item={item} className="h-[132px] rounded-[20px]" />
        {item.isFeatured && <View className="absolute top-2 left-2 bg-yellow rounded-full px-2 py-[3px] flex-row items-center gap-1"><Ionicons name="star" size={9} color="#fff" /><Text className="text-white text-[10px] font-extrabold">Featured</Text></View>}
        <View className="absolute top-2 right-2"><HeartButton id={item.id} /></View>
        <View className="absolute bottom-2 left-2 bg-black/55 rounded-full px-2 py-[3px] flex-row items-center gap-1"><Ionicons name="shield-checkmark" size={10} color="#fff" /><Text className="text-white text-[10px] font-bold">{item.condition}</Text></View>
        {item.sellerId === 'me' && <View className="absolute bottom-2 right-2 bg-ink rounded-full px-2 py-[3px]"><Text className="text-white text-[10px] font-bold">Yours</Text></View>}
        {item.status === 'Sold' && <View className="absolute inset-0 bg-black/45 rounded-[20px] items-center justify-center"><Text className="text-white font-black tracking-widest">SOLD</Text></View>}
      </View>

      <View className="px-1.5 pt-2 pb-1 gap-1">
        <View className="self-start bg-primary-soft rounded-full px-2 py-[2px]"><Text className="text-primary-dark text-[10px] font-extrabold" numberOfLines={1}>{(item.breed ?? item.category).toUpperCase()}</Text></View>
        <Text className={T.h3} numberOfLines={2} style={{ minHeight: 36 }}>{item.title}</Text>

        <View className="flex-row items-center gap-1.5 flex-wrap">
          <Text className="text-ink text-[18px] font-black">{inr(item.price)}</Text>
          {off > 0 && <View className="bg-green-soft rounded-md px-1.5 py-[1px]"><Text className="text-green text-[10px] font-extrabold">{off}% OFF</Text></View>}
        </View>
        {off > 0 && <Text className="text-muted text-xs line-through -mt-0.5">{inr(item.originalPrice!)}</Text>}

        <View className="h-px bg-line my-1" />
        <View className="flex-row items-center justify-between gap-2">
          <View className="flex-row items-center gap-1 flex-1"><Ionicons name="location" size={11} color={colors.primary} /><Text className="text-[11px] text-muted flex-1" numberOfLines={1}>{item.location.split(',')[0]}</Text></View>
          <View className="flex-row items-center gap-1"><Ionicons name="eye-outline" size={11} color={colors.muted} /><Text className="text-[11px] text-muted">{item.views}</Text></View>
        </View>
        <Text className="text-[10px] text-muted">{timeAgo(item.createdAt)}</Text>
      </View>
    </Pressable>
  );
}

export const conditionTone = { New: 'green', 'Like New': 'green', Good: 'blue', Fair: 'yellow', Used: 'orange' } as const;
export const ConditionChip = ({ c }: { c: Listing['condition'] }) => <Chip label={c} tone={conditionTone[c]} />;
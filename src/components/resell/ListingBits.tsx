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
    <Pressable hitSlop={8} onPress={() => toast.success(toggleFavourite(id) ? 'Added to favourites' : 'Removed from favourites')} style={{ width: size, height: size, borderRadius: size / 2 }} className={cn('items-center justify-center', on ? 'bg-red-soft' : 'bg-white')}>
      <Ionicons name={on ? 'heart' : 'heart-outline'} size={size * 0.58} color={colors.red} />
    </Pressable>
  );
}

/** Marketplace card - same look as the Store's product card. `compact` = fixed-width card for horizontal rails. */
export function ListingCard({ item, onPress, compact }: { item: Listing; onPress: () => void; compact?: boolean }) {
  const off = item.originalPrice && item.originalPrice > item.price ? Math.round((1 - item.price / item.originalPrice) * 100) : 0;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={item.title}
      className={cn('bg-white rounded-3xl p-2.5 gap-[3px] border border-line shadow-md shadow-orange-800/10 active:opacity-90', compact ? 'w-[160px]' : 'flex-1 mb-3')}
    >
      <View className="mb-1.5">
        <ListingThumb item={item} className="h-[120px] rounded-2xl" />
        {item.isFeatured && <View className="absolute top-1.5 left-1.5 bg-yellow rounded-full px-2 py-[3px] flex-row items-center gap-1"><Ionicons name="star" size={9} color="#fff" /><Text className="text-white text-[10px] font-extrabold">Featured</Text></View>}
        <View className="absolute top-1.5 right-1.5"><HeartButton id={item.id} size={28} /></View>
        <View className="absolute bottom-1.5 left-1.5 bg-neutral-700 rounded-full px-2 py-[3px]"><Text className="text-white text-[10px] font-bold">{item.condition}</Text></View>
        {item.sellerId === 'me' && <View className="absolute bottom-1.5 right-1.5 bg-ink rounded-full px-2 py-[3px]"><Text className="text-white text-[10px] font-bold">Yours</Text></View>}
        {item.status === 'Sold' && <View className="absolute inset-0 bg-black/45 rounded-2xl items-center justify-center"><Text className="text-white font-black tracking-widest">SOLD</Text></View>}
      </View>

      <Text className="text-primary text-[10px] font-bold" numberOfLines={1}>{(item.breed ?? item.category).toUpperCase()}</Text>
      <Text className={T.h3} numberOfLines={1}>{item.title}</Text>
      <View className="flex-row items-baseline gap-1.5">
        <Text className="text-primary-dark text-[17px] font-black">{inr(item.price)}</Text>
        {off > 0 && <Text className="text-muted text-xs line-through">{inr(item.originalPrice!)}</Text>}
        {off > 0 && <Text className="text-green text-[10px] font-extrabold">{off}% OFF</Text>}
      </View>
      {/* where it is + how far (distance only when the buyer's location is known) */}
      <View className="flex-row items-center gap-1">
        <Ionicons name="location" size={11} color={colors.primary} />
        <Text className="text-[11px] text-muted flex-shrink" numberOfLines={1}>{item.location.split(',')[0]}</Text>
        {typeof item.distanceKm === 'number' && <Text className="text-[11px] text-primary-dark font-bold">• {item.distanceKm} km</Text>}
      </View>
      {/* seller (like the web card) or, on the small rail cards, how long ago it was listed */}
      <View className="flex-row items-center justify-between gap-2 pt-0.5">
        {!compact && (item.sellerId === 'me' || item.seller) ? (
          <View className="flex-row items-center gap-1.5 flex-1">
            {item.seller?.image ? (
              <Image source={{ uri: item.seller.image }} className="w-5 h-5 rounded-full" />
            ) : (
              <View className="w-5 h-5 rounded-full bg-primary-soft items-center justify-center"><Text className="text-primary text-[10px] font-extrabold">{(item.sellerId === 'me' ? 'Y' : item.seller?.name || '?').charAt(0).toUpperCase()}</Text></View>
            )}
            <Text className="text-[11px] font-semibold text-ink flex-1" numberOfLines={1}>{item.sellerId === 'me' ? 'You' : item.seller?.name}</Text>
          </View>
        ) : (
          <Text className="text-[11px] text-muted flex-1" numberOfLines={1}>{timeAgo(item.createdAt)}</Text>
        )}
        <View className="flex-row items-center gap-1"><Ionicons name="eye-outline" size={11} color={colors.muted} /><Text className="text-[11px] text-muted">{item.views}</Text></View>
      </View>
    </Pressable>
  );
}

export const conditionTone = { New: 'green', 'Like New': 'green', Good: 'blue', Fair: 'yellow', Used: 'orange' } as const;
export const ConditionChip = ({ c }: { c: Listing['condition'] }) => <Chip label={c} tone={conditionTone[c]} />;
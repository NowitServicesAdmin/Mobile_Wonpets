import React, { useCallback, useEffect, useRef, useState } from 'react';
import { FlatList, Image, ImageBackground, Linking, Pressable, Text, View, useWindowDimensions, ViewToken } from 'react-native';
import { cn } from '../ui';
import { CarouselSlide } from '../../services/store.service';

/** Same colour themes (and artwork) the web carousel uses. */
const THEMES: Record<string, { bg: string; badge: string; accent: string; tint: string }> = {
  orange: { bg: 'https://res.cloudinary.com/dakiwpzly/image/upload/v1781068973/carouselbg_hxbnod.png', badge: 'https://res.cloudinary.com/dakiwpzly/image/upload/v1781068973/offerbadge_heuyny.png', accent: '#ff6b00', tint: '#FFF4E8' },
  blue: { bg: 'https://res.cloudinary.com/dakiwpzly/image/upload/v1781071803/carouselbg-blue_qshrb7.png', badge: 'https://res.cloudinary.com/dakiwpzly/image/upload/v1781071803/offerbadge-blue_vegta5.png', accent: '#2563eb', tint: '#EAF1FF' },
  violet: { bg: 'https://res.cloudinary.com/dakiwpzly/image/upload/v1781071804/carouselbg-violet_s2vk5n.png', badge: 'https://res.cloudinary.com/dakiwpzly/image/upload/v1781071803/offerbadge-violet_rensdd.png', accent: '#7c3aed', tint: '#F3EBFF' },
  yellow: { bg: 'https://res.cloudinary.com/dakiwpzly/image/upload/v1781071856/carouselbg-yellow_uhug43.png', badge: 'https://res.cloudinary.com/dakiwpzly/image/upload/v1781071856/offerbadge-yellow_dib3uq.png', accent: '#f59e0b', tint: '#FFF7DC' },
  green: { bg: 'https://res.cloudinary.com/dakiwpzly/image/upload/v1781068973/carouselbg_hxbnod.png', badge: 'https://res.cloudinary.com/dakiwpzly/image/upload/v1781068973/offerbadge_heuyny.png', accent: '#16a34a', tint: '#E9F9EE' },
  red: { bg: 'https://res.cloudinary.com/dakiwpzly/image/upload/v1781068973/carouselbg_hxbnod.png', badge: 'https://res.cloudinary.com/dakiwpzly/image/upload/v1781068973/offerbadge_heuyny.png', accent: '#dc2626', tint: '#FFECEC' },
};
const AUTO_MS = 4000;

export type OfferTarget =
  | { kind: 'store'; storeManagerId?: string }
  | { kind: 'category'; storeManagerId?: string; category?: string }
  | { kind: 'product'; id: string }
  | { kind: 'products'; ids: string[]; title: string };

/**
 * Auto-playing offer banner (swipe, dots, tap). Tapping a slide mirrors the web:
 * store / category -> filters the store, product -> product page, external -> opens the link.
 */
export default function OfferCarousel({ slides, onOpen }: { slides: CarouselSlide[]; onOpen: (t: OfferTarget) => void }) {
  const { width: screenW } = useWindowDimensions();
  const width = screenW - 32; // matches the store's p-4 padding
  const list = useRef<FlatList<CarouselSlide>>(null);
  const [index, setIndex] = useState(0);
  const touching = useRef(false);

  // advance every few seconds, but never while the user is dragging
  useEffect(() => {
    if (slides.length < 2) return;
    const t = setInterval(() => {
      if (touching.current) return;
      setIndex((i) => {
        const next = (i + 1) % slides.length;
        list.current?.scrollToIndex({ index: next, animated: true });
        return next;
      });
    }, AUTO_MS);
    return () => clearInterval(t);
  }, [slides.length]);

  const onViewable = useCallback(({ viewableItems }: { viewableItems: ViewToken[] }) => {
    const first = viewableItems[0];
    if (first?.index != null) setIndex(first.index);
  }, []);

  const open = (s: CarouselSlide) => {
    switch (s.redirectType) {
      case 'product': {
        // one product -> its page; several -> a list of exactly those products
        const ids = s.redirectProducts.length ? s.redirectProducts : s.redirectValue ? [s.redirectValue] : [];
        if (ids.length === 1) return onOpen({ kind: 'product', id: ids[0] });
        if (ids.length > 1) return onOpen({ kind: 'products', ids, title: s.highlight || s.title || 'Offer products' });
        break;
      }
      case 'external': if (s.redirectValue) return void Linking.openURL(s.redirectValue).catch(() => {}); break;
      case 'category': return onOpen({ kind: 'category', storeManagerId: s.storeManagerId, category: s.redirectValue });
    }
    onOpen({ kind: 'store', storeManagerId: s.storeManagerId });
  };

  if (!slides.length) return null;
  return (
    <View>
      <FlatList
        ref={list}
        data={slides}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        keyExtractor={(s) => s.id}
        getItemLayout={(_, i) => ({ length: width, offset: width * i, index: i })}
        onViewableItemsChanged={onViewable}
        viewabilityConfig={{ itemVisiblePercentThreshold: 60 }}
        onScrollBeginDrag={() => { touching.current = true; }}
        onScrollEndDrag={() => { touching.current = false; }}
        onScrollToIndexFailed={() => {}}
        style={{ borderRadius: 24 }}
        renderItem={({ item: s }) => {
          const th = THEMES[s.theme] ?? THEMES.orange;
          return (
            <Pressable onPress={() => open(s)} style={{ width }} accessibilityRole="button" accessibilityLabel={`${s.title} ${s.highlight}. ${s.ctaText}`}>
              <ImageBackground source={{ uri: th.bg }} resizeMode="cover" style={{ backgroundColor: th.tint, minHeight: 172 }} imageStyle={{ borderRadius: 24 }} className="rounded-3xl overflow-hidden border border-orange-100">
                <View className="flex-row items-center p-4 gap-2">
                  <View className="flex-1 pr-1">
                    <Text className="text-[15px] font-bold text-ink" numberOfLines={2}>{s.title}</Text>
                    <Text className="text-[20px] font-black mt-0.5" style={{ color: th.accent }} numberOfLines={2}>{s.highlight}</Text>
                    {!!s.description && <Text className="text-xs text-muted mt-1" numberOfLines={2}>{s.description}</Text>}
                    {s.features.length > 0 && <Text className="text-[11px] text-ink/70 mt-1.5" numberOfLines={1}>{s.features.slice(0, 3).join('  ·  ')}</Text>}
                    <View className="self-start mt-3 rounded-xl px-4 py-2" style={{ backgroundColor: th.accent }}>
                      <Text className="text-white font-bold text-xs">{s.ctaText}</Text>
                    </View>
                  </View>
                  <View className="w-[120px] h-[120px] items-center justify-center">
                    {s.image ? <Image source={{ uri: s.image }} className="w-[112px] h-[112px] rounded-full" resizeMode="contain" /> : <Text className="text-[64px]">🐾</Text>}
                    {!!s.offerText && (
                      <ImageBackground source={{ uri: th.badge }} style={{ width: 54, height: 54, position: 'absolute', top: -4, right: -4, alignItems: 'center', justifyContent: 'center' }} imageStyle={{ borderRadius: 27 }}>
                        <Text className="text-[9px] font-extrabold text-center leading-3 text-ink" numberOfLines={3}>{s.offerText}</Text>
                      </ImageBackground>
                    )}
                  </View>
                </View>
              </ImageBackground>
            </Pressable>
          );
        }}
      />
      {slides.length > 1 && (
        <View className="flex-row justify-center gap-1.5 mt-2.5">
          {slides.map((s, i) => (
            <Pressable key={s.id} hitSlop={6} onPress={() => { setIndex(i); list.current?.scrollToIndex({ index: i, animated: true }); }}
              className={cn('h-2 rounded-full', i === index ? 'w-6 bg-primary' : 'w-2 bg-orange-200')} />
          ))}
        </View>
      )}
    </View>
  );
}

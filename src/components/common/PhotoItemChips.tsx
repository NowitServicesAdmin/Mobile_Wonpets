import React from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { cn } from '../ui';
import { VisualSearchItem } from '../../services/shared.service';

/**
 * "Also in your photo" row for Store / Resell. A photo can contain several things
 * (food, bowl, bed…); each one the backend spotted is a chip - tap to search that item.
 * Renders nothing unless the photo had more than one item and the search box still shows the photo's term.
 */
export default function PhotoItemChips({ items, activeTerm, query, onPick }: {
  items: VisualSearchItem[]; activeTerm: string; query: string; onPick: (it: VisualSearchItem) => void;
}) {
  if (items.length < 2 || query !== activeTerm) return null;
  return (
    <View>
      <Text className="text-[11px] font-bold text-muted mb-1.5">ALSO IN YOUR PHOTO</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
        {items.map((it) => {
          const active = it.searchTerm === activeTerm;
          return (
            <Pressable
              key={`${it.listingType}-${it.searchTerm}`}
              disabled={!it.found}
              onPress={() => onPick(it)}
              className={cn('px-3 py-1.5 rounded-full border', active ? 'bg-primary border-primary' : it.found ? 'bg-white border-orange-300' : 'bg-neutral-100 border-neutral-200')}
            >
              <Text className={cn('text-xs font-bold', active ? 'text-white' : it.found ? 'text-primary-dark' : 'text-neutral-400')}>
                {it.identified.label || it.searchTerm}{it.found ? ` · ${it.matchCount}` : ' · not listed'}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}
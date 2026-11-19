import React from 'react';
import { FlatList, Pressable, Text, View, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme';
import PetAvatar from '../PetAvatar';
import { Panel, PanelHeader } from '../doctor/DoctorUI';
import { getPetAgeLabel } from '../../utils/petAge';
import type { Pet } from '../../data/mock';

type Props = {
  pets: Pet[];
  onOpen: (pet: Pet) => void;
  onEdit: (pet: Pet) => void;
  onDelete: (pet: Pet) => void;
  onFavorite: (pet: Pet) => void;
  onAdd: () => void;
};

const miniBtn = 'w-8 h-8 rounded-full bg-white border border-line items-center justify-center active:opacity-70';
const GAP = 10;

/** Slim pet cards: photo + details on top, one footer row with chips and edit / delete. Tapping the top of a card opens the profile. */
export default function MyPetsSection({ pets, onOpen, onEdit, onDelete, onFavorite, onAdd }: Props) {
  const { width } = useWindowDimensions();
  // screen padding (14 x 2) + panel padding (14 x 2) are subtracted; with several pets the next card peeks in from the right
  const inner = width - 56;
  const cardW = pets.length > 1 ? Math.min(300, Math.round(inner * 0.86)) : inner;

  return (
    <Panel compact>
      <PanelHeader compact icon="paw" tone="purple" title={`My Pets • ${pets.length}`} action="+ Add" onAction={onAdd} />
      <FlatList
        data={pets}
        horizontal
        showsHorizontalScrollIndicator={false}
        keyExtractor={(p) => p.id}
        snapToInterval={cardW + GAP}
        decelerationRate="fast"
        contentContainerStyle={{ gap: GAP }}
        ListEmptyComponent={
          <Pressable onPress={onAdd} className="w-full rounded-2xl border-2 border-dashed border-orange-200 py-4 flex-row items-center justify-center gap-2 active:opacity-80">
            <Ionicons name="add-circle-outline" size={24} color={colors.primary} />
            <Text className="font-bold text-ink">Add your first pet</Text>
          </Pressable>
        }
        renderItem={({ item }) => (
          <View style={{ width: cardW }} className="rounded-2xl border border-orange-100 bg-orange-50/60 p-2.5">
            <Pressable onPress={() => onOpen(item)} accessibilityRole="button" accessibilityLabel={`Open ${item.name}'s profile`} className="flex-row items-center gap-2.5 active:opacity-80">
              <PetAvatar emoji={item.emoji} image={item.image} size={52} />
              <View className="flex-1">
                <Text maxFontSizeMultiplier={1.1} className="text-[15px] font-extrabold text-ink" numberOfLines={1}>{item.name}</Text>
                <Text maxFontSizeMultiplier={1.1} className="text-[12px] text-muted" numberOfLines={1}>{item.breed}</Text>
                <Text maxFontSizeMultiplier={1.1} className="text-[11px] font-medium text-muted" numberOfLines={1}>{item.gender} • {getPetAgeLabel(item)}</Text>
              </View>
              <Pressable hitSlop={8} onPress={() => onFavorite(item)} accessibilityLabel={item.favorite ? 'Remove from favourites' : 'Add to favourites'} className="self-start w-8 h-8 rounded-full bg-pink-soft items-center justify-center">
                <Ionicons name={item.favorite ? 'heart' : 'heart-outline'} size={16} color={colors.pink} />
              </Pressable>
            </Pressable>

            <View className="flex-row items-center gap-1.5 mt-2">
              <View className="rounded-full bg-amber-100 px-2 py-0.5"><Text maxFontSizeMultiplier={1.1} className="text-[10.5px] font-bold text-amber-700" numberOfLines={1}>{item.weight}</Text></View>
              <View className="rounded-full bg-blue-100 px-2 py-0.5"><Text maxFontSizeMultiplier={1.1} className="text-[10.5px] font-bold text-blue-600">Active</Text></View>
              <View className="flex-1" />
              <Pressable hitSlop={4} onPress={() => onEdit(item)} accessibilityLabel={`Edit ${item.name}`} className={miniBtn}><Ionicons name="pencil" size={14} color={colors.primary} /></Pressable>
              <Pressable hitSlop={4} onPress={() => onDelete(item)} accessibilityLabel={`Delete ${item.name}`} className={miniBtn}><Ionicons name="trash-outline" size={15} color={colors.red} /></Pressable>
            </View>
          </View>
        )}
      />
    </Panel>
  );
}
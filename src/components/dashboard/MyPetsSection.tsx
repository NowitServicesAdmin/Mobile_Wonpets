import React from 'react';
import { FlatList, Pressable, Text, View, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme';
import { Card, Chip, SectionHeader } from '../ui';
import PetAvatar from '../PetAvatar';
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

const smallBtn = 'w-8 h-8 rounded-full bg-cream border border-line items-center justify-center active:opacity-70';
const GAP = 12;

export default function MyPetsSection({ pets, onOpen, onEdit, onDelete, onFavorite, onAdd }: Props) {
  const { width } = useWindowDimensions();
  // screen padding (16 x 2) + card padding (16 x 2) are subtracted so the next card always peeks in from the right
  const cardW = Math.min(300, Math.round((width - 64) * 0.86));

  return (
    <Card>
      <SectionHeader
        title={`My Pets • ${pets.length}`}
        icon={<View className="w-10 h-10 rounded-full bg-purple-soft items-center justify-center"><Ionicons name="paw" size={18} color={colors.purple} /></View>}
        right={
          <Pressable onPress={onAdd} accessibilityRole="button" accessibilityLabel="Add a new pet" className="flex-row items-center gap-1 bg-primary-soft rounded-full pl-2.5 pr-3 py-1.5 active:opacity-80">
            <Ionicons name="add" size={16} color={colors.primary} />
            <Text maxFontSizeMultiplier={1.1} className="text-primary font-bold text-[13px]">Add</Text>
          </Pressable>
        }
      />
      <FlatList
        data={pets}
        horizontal
        showsHorizontalScrollIndicator={false}
        keyExtractor={(p) => p.id}
        snapToInterval={cardW + GAP}
        decelerationRate="fast"
        contentContainerStyle={{ gap: GAP }}
        ListEmptyComponent={
          <Pressable onPress={onAdd} className="w-full rounded-2xl border-2 border-dashed border-orange-200 py-6 items-center active:opacity-80">
            <Ionicons name="add-circle-outline" size={32} color={colors.primary} />
            <Text className="font-bold text-ink mt-1">Add your first pet</Text>
          </Pressable>
        }
        renderItem={({ item }) => (
          <View style={{ width: cardW }} className="rounded-3xl border border-orange-100 bg-white p-3.5">
            <Pressable onPress={() => onOpen(item)} accessibilityRole="button" accessibilityLabel={`Open ${item.name}'s profile`} className="flex-row items-center gap-3 active:opacity-80">
              <PetAvatar emoji={item.emoji} image={item.image} size={64} />
              <View className="flex-1">
                <Text maxFontSizeMultiplier={1.1} className="text-[17px] font-extrabold text-ink" numberOfLines={1}>{item.name}</Text>
                <Text maxFontSizeMultiplier={1.1} className="text-[13px] text-muted" numberOfLines={1}>{item.breed}</Text>
                <Text maxFontSizeMultiplier={1.1} className="text-xs font-medium text-muted mt-0.5" numberOfLines={1}>{item.gender} • {getPetAgeLabel(item)}</Text>
              </View>
              <Pressable hitSlop={8} onPress={() => onFavorite(item)} accessibilityLabel={item.favorite ? 'Remove from favourites' : 'Add to favourites'} className="self-start w-8 h-8 rounded-full bg-pink-soft items-center justify-center">
                <Ionicons name={item.favorite ? 'heart' : 'heart-outline'} size={16} color={colors.pink} />
              </Pressable>
            </Pressable>

            <View className="flex-row gap-1.5 mt-3">
              <Chip label={item.weight} tone="yellow" />
              <Chip label="Active" tone="blue" />
            </View>

            <View className="flex-row items-center justify-between mt-3 pt-3 border-t border-line">
              <View className="flex-row gap-2">
                <Pressable hitSlop={4} onPress={() => onEdit(item)} accessibilityLabel={`Edit ${item.name}`} className={smallBtn}><Ionicons name="pencil" size={14} color={colors.primary} /></Pressable>
                <Pressable hitSlop={4} onPress={() => onDelete(item)} accessibilityLabel={`Delete ${item.name}`} className={smallBtn}><Ionicons name="trash-outline" size={15} color={colors.red} /></Pressable>
              </View>
              <Pressable onPress={() => onOpen(item)} className="flex-row items-center gap-0.5 active:opacity-70">
                <Text maxFontSizeMultiplier={1.1} className="text-primary font-bold text-sm">View Profile</Text>
                <Ionicons name="chevron-forward" size={16} color={colors.primary} />
              </Pressable>
            </View>
          </View>
        )}
      />
    </Card>
  );
}
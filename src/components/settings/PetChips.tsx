import React from 'react';
import { Text, View } from 'react-native';
import { Avatar } from '../Avatar';
import { T } from '../ui';
import { SharedPet } from '../../data/settings';

/** Pets with their photo + name (emoji when no photo). Used on collaborator and shared-with-me cards. */
export default function PetChips({ pets, empty = 'No pets selected.' }: { pets: SharedPet[]; empty?: string }) {
  if (!pets.length) return <Text className={T.small}>{empty}</Text>;
  return (
    <View className="flex-row flex-wrap gap-1.5">
      {pets.map((p, i) => (
        <View key={`${p.id}-${i}`} className="flex-row items-center gap-1.5 bg-primary-soft rounded-full pl-1 pr-3 py-1">
          <Avatar image={p.image} emoji={p.emoji} size={22} className="bg-white" />
          <Text numberOfLines={1} className="text-xs font-semibold text-ink max-w-[130px]">{p.name}</Text>
        </View>
      ))}
    </View>
  );
}
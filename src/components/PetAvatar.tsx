import React from 'react';
import { View } from 'react-native';
import { Avatar } from './Avatar';

/** Pet picture; shows the species emoji when there is no photo or the photo can't be loaded. */
export default function PetAvatar({ emoji, size = 64, image }: { emoji: string; size?: number; image?: string }) {
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2 }} className="border-2 border-line overflow-hidden">
      <Avatar image={image} emoji={emoji} size={size - 4} />
    </View>
  );
}

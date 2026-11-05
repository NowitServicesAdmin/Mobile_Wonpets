import React, { useEffect, useState } from 'react';
import { Image, ImageResizeMode, StyleProp, Text, View, ViewStyle } from 'react-native';
import { cn } from './ui';

/**
 * Round (or rounded-square) picture with an emoji fallback.
 * Falls back when there is no URL OR when the URL fails to load (bad path, offline, 404),
 * so a broken image never leaves an empty hole.
 */
export function Avatar({
  image, emoji = '🐾', size = 44, square = false, className, style, resizeMode = 'cover',
}: {
  image?: string | null; emoji?: string; size?: number; square?: boolean; className?: string; style?: StyleProp<ViewStyle>; resizeMode?: ImageResizeMode;
}) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [image]);
  const radius = square ? Math.round(size * 0.28) : size / 2;
  return (
    <View style={[{ width: size, height: size, borderRadius: radius }, style]} className={cn('bg-primary-soft items-center justify-center overflow-hidden', className)}>
      {image && !failed ? (
        <Image source={{ uri: image }} style={{ width: size, height: size }} resizeMode={resizeMode} onError={() => setFailed(true)} />
      ) : (
        <Text style={{ fontSize: size * 0.5 }}>{emoji}</Text>
      )}
    </View>
  );
}

/** Fill-the-parent picture (product / listing / banner) with an emoji fallback. Parent decides the size. */
export function Photo({ uri, emoji = '🛍️', emojiSize = 40, resizeMode = 'cover', className }: { uri?: string | null; emoji?: string; emojiSize?: number; resizeMode?: ImageResizeMode; className?: string }) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [uri]);
  return (
    <View className={cn('w-full h-full items-center justify-center overflow-hidden bg-[#FBF3EA]', className)}>
      {uri && !failed ? <Image source={{ uri }} style={{ width: '100%', height: '100%' }} resizeMode={resizeMode} onError={() => setFailed(true)} /> : <Text style={{ fontSize: emojiSize }}>{emoji}</Text>}
    </View>
  );
}

export default Avatar;

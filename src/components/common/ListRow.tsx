import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme';
import { Avatar } from '../Avatar';
import { cn } from '../ui';

/**
 * Avatar + title + subtitle(s) + optional right slot. The row pattern behind patients, follow-ups,
 * recent patients and earnings lines. Tappable when `onPress` is given.
 */
export default function ListRow({
  image, emoji = '🐾', avatarSize = 48, title, subtitle, caption, right, onPress, chevron = true, className,
}: {
  image?: string | null; emoji?: string; avatarSize?: number;
  title: string; subtitle?: string; caption?: string;
  right?: React.ReactNode; onPress?: () => void; chevron?: boolean; className?: string;
}) {
  const body = (
    <>
      <Avatar image={image} emoji={emoji} size={avatarSize} />
      <View className="flex-1 gap-0.5">
        <Text className="text-[15px] font-extrabold text-ink" numberOfLines={1}>{title}</Text>
        {!!subtitle && <Text className="text-[13px] text-muted" numberOfLines={1}>{subtitle}</Text>}
        {!!caption && <Text className="text-xs text-muted" numberOfLines={1}>{caption}</Text>}
      </View>
      {right}
      {!!onPress && chevron && <Ionicons name="chevron-forward" size={18} color="#CDBFB0" />}
    </>
  );
  const box = cn('flex-row items-center gap-3 bg-white rounded-2xl border border-line p-3', className);
  return onPress
    ? <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={title} className={cn(box, 'active:bg-cream')}>{body}</Pressable>
    : <View className={box}>{body}</View>;
}

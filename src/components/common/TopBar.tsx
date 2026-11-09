import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../../theme';
import { Avatar } from '../Avatar';
import { cn } from '../ui';

type IconName = keyof typeof Ionicons.glyphMap;
export type TopBarAction = { icon: IconName; label: string; onPress: () => void; badge?: number };

/** Round white icon button with an optional red count badge (used in every top bar). */
export function HeaderButton({ icon, label, onPress, badge, size = 40 }: TopBarAction & { size?: number }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={6}
      onPress={onPress}
      style={{ width: size, height: size }}
      className="rounded-full bg-white border border-line items-center justify-center active:bg-primary-soft"
    >
      <Ionicons name={icon} size={size >= 42 ? 20 : 19} color={colors.text} />
      {!!badge && badge > 0 && (
        <View className="absolute -top-1.5 -right-1.5 bg-red min-w-[18px] h-[18px] rounded-full items-center justify-center px-1 border-2 border-cream">
          <Text className="text-white text-[9px] font-extrabold">{badge > 99 ? '99+' : badge}</Text>
        </View>
      )}
    </Pressable>
  );
}

/**
 * The app's top bar: avatar (optionally a switcher), a title block and a row of round icon buttons.
 * Owner header, collaborator header and doctor header are all this component with different content.
 */
export default function TopBar({
  image, emoji = '🦅', avatarSize = 38, onAvatarPress, avatarLabel, avatarBadge, avatarBadgeClassName,
  title, subtitle, actions = [], actionSize, className,
}: {
  image?: string | null; emoji?: string; avatarSize?: number;
  onAvatarPress?: () => void; avatarLabel?: string;
  /** small icon bubble on the avatar (e.g. the account-switch swap icon) */
  avatarBadge?: IconName; avatarBadgeClassName?: string;
  title: React.ReactNode; subtitle?: React.ReactNode;
  actions?: TopBarAction[]; actionSize?: number; className?: string;
}) {
  const insets = useSafeAreaInsets();
  const avatar = (
    <View className="rounded-full border-2 border-primary p-0.5">
      <Avatar image={image} emoji={emoji} size={avatarSize} />
      {!!avatarBadge && (
        <View className={cn('absolute w-[18px] h-[18px] rounded-full bg-primary border-2 border-cream items-center justify-center', avatarBadgeClassName ?? '-top-1 -left-1')}>
          <Ionicons name={avatarBadge} size={9} color="#fff" />
        </View>
      )}
    </View>
  );
  return (
    <View style={{ paddingTop: insets.top + 8 }} className={cn('px-4 pb-3 bg-cream', className)}>
      <View className="flex-row items-center gap-2">
        {onAvatarPress
          ? <Pressable onPress={onAvatarPress} accessibilityRole="button" accessibilityLabel={avatarLabel} className="active:opacity-80">{avatar}</Pressable>
          : avatar}
        <View className="flex-1 ml-1">
          {typeof title === 'string' ? <Text className="text-[18px] font-black text-ink" numberOfLines={1}>{title}</Text> : title}
          {subtitle}
        </View>
        {actions.map((a) => <HeaderButton key={a.label} {...a} size={actionSize} />)}
      </View>
    </View>
  );
}
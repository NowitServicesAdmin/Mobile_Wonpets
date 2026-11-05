import React from 'react';
import { Text, View } from 'react-native';
import { cn } from '../ui';
import { Avatar } from '../Avatar';
import { ChatKind, PresenceStatus, STATUS_DOT } from '../../data/chat';

/** Per-tab accent, matching the web (vet = sky, collab = purple, resell = orange). Full class strings so NativeWind picks them up. */
export const ACCENT: Record<ChatKind, { label: string; hex: [string, string]; bg: string; bgLight: string; text: string; border: string }> = {
  vet: { label: 'Vet', hex: ['#0EA5E9', '#7DD3FC'], bg: 'bg-[#0EA5E9]', bgLight: 'bg-[#E0F2FE]', text: 'text-[#0284C7]', border: 'border-[#BAE6FD]' },
  collab: { label: 'Collab', hex: ['#8B5CF6', '#A78BFA'], bg: 'bg-[#8B5CF6]', bgLight: 'bg-[#EDE9FE]', text: 'text-[#7C3AED]', border: 'border-[#DDD6FE]' },
  resell: { label: 'Resell', hex: ['#FF6B00', '#F59E0B'], bg: 'bg-primary', bgLight: 'bg-primary-soft', text: 'text-primary', border: 'border-orange-100' },
};

export function ChatAvatar({ emoji, size = 44, status, kind, image }: { emoji: string; size?: number; status?: PresenceStatus; kind: ChatKind; image?: string }) {
  const dot = Math.max(10, Math.round(size * 0.27));
  return (
    <View style={{ width: size, height: size }}>
      <Avatar image={image} emoji={emoji} size={size} className={ACCENT[kind].bgLight} />
      {!!status && <View style={{ width: dot, height: dot, borderRadius: dot / 2 }} className={cn('absolute bottom-0 right-0 border-2 border-white', STATUS_DOT[status])} />}
    </View>
  );
}

export const UnreadBadge = ({ count, className }: { count: number; className?: string }) =>
  count > 0 ? <View className={cn('min-w-[20px] h-5 px-1.5 rounded-full items-center justify-center', className)}><Text className="text-white text-[10px] font-bold">{count > 99 ? '99+' : count}</Text></View> : null;

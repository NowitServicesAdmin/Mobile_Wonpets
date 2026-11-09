import React from 'react';
import { Pressable, Text } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import TopBar from '../common/TopBar';
import { useAccountSwitch } from '../common/useAccountSwitch';
import { StatusDot } from './StatusSheet';
import { STATUS_OPTIONS, useDoctor } from '../../context/DoctorContext';
import { useAuth } from '../../context/AuthContext';
import { useChat } from '../../context/ChatContext';

/** Doctor top bar (the shared TopBar): avatar -> profile (or the account switch when pets are shared), greeting + live status, messages and notifications. */
export default function DoctorHeader({ onStatusPress }: { onStatusPress: () => void }) {
  const nav = useNavigation<any>();
  const { user } = useAuth();
  const { status, unread, profile } = useDoctor();
  const { totalUnread } = useChat();
  const { avatarProps, sheet } = useAccountSwitch(() => nav.navigate('DoctorProfile'), 'Open profile');
  const label = STATUS_OPTIONS.find((o) => o.value === status)?.label ?? 'Available';
  const last = (user?.name ?? 'Doctor').replace(/^dr\.?\s+/i, '').trim().split(' ')[0];

  return (
    <>
    <TopBar
      image={user?.profileImage ?? profile?.image} emoji="🩺"
      {...avatarProps}
      title={`Hello, Dr. ${last} 👋`}
      subtitle={
        <Pressable onPress={onStatusPress} accessibilityRole="button" accessibilityLabel={`Status ${label}. Change`} className="flex-row items-center gap-1.5 mt-0.5 self-start">
          <StatusDot size={9} /><Text className="text-xs text-muted font-semibold">{label}</Text><Text className="text-xs text-primary font-bold">· Change</Text>
        </Pressable>
      }
      actions={[
        { icon: 'search-outline', label: 'Search', onPress: () => nav.navigate('Search') },
        { icon: 'chatbubble-outline', label: 'Messages', onPress: () => nav.navigate('Chat'), badge: totalUnread },
        { icon: 'notifications-outline', label: 'Notifications', onPress: () => nav.navigate('Notifications'), badge: unread },
      ]}
    />
    {sheet}
    </>
  );
}
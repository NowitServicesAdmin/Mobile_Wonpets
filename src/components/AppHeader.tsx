import React from 'react';
import { Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { colors } from '../theme';
import { useAuth } from '../context/AuthContext';
import { useChat } from '../context/ChatContext';
import { useLiveSync } from '../context/LiveSyncContext';
import { areaCity, headerLocation } from '../utils/location';
import { useLiveLocation } from '../context/LocationContext';
import { useSettings } from '../context/SettingsContext';
import { TextSkeleton } from './Skeletons';
import TopBar from './common/TopBar';
import { useAccountSwitch } from './common/useAccountSwitch';

/** Owner top bar - the shared TopBar (same layout as the doctor and shared headers): profile (or the account switch when pets are shared with you), greeting + location, search, chat and notifications. */
export default function AppHeader() {
  const nav = useNavigation<any>();
  const { user } = useAuth();
  const { info, infoLoaded } = useSettings();
  const { place: live, detecting } = useLiveLocation();
  const { unreadByKind } = useChat();
  const { unread } = useLiveSync();
  const chatUnread = Object.values(unreadByKind ?? {}).reduce((a, b) => a + (b || 0), 0);

  const { avatarProps, sheet } = useAccountSwitch(() => nav.navigate('Settings'), 'Open settings');
  const firstName = (user?.name ?? 'Customer').trim().split(' ')[0];
  // where the user is right now (area, city); if location access is off, fall back to the address saved in Settings
  const saved = headerLocation(info, user?.location);
  const place = areaCity(live) || saved;
  const placeLoading = !place && (detecting || !infoLoaded);

  return (
    <>
    <TopBar
      image={user?.profileImage}
      {...avatarProps}
      title={`Hello, ${firstName} 👋`}
      // location is display-only (not tappable)
      subtitle={
        <View className="flex-row items-center gap-1 mt-0.5">
          <Ionicons name="location-sharp" size={13} color={colors.primary} />
          {placeLoading
            ? <TextSkeleton width={120} />
            : <Text className="text-xs text-muted flex-shrink" numberOfLines={1}>{place || 'Location not set'}</Text>}
        </View>
      }
      actions={[
        { icon: 'search-outline', label: 'Search', onPress: () => nav.navigate('Search') },
        { icon: 'chatbubble-outline', label: 'Messages', onPress: () => nav.navigate('Chat'), badge: chatUnread },
        { icon: 'notifications-outline', label: 'Notifications', onPress: () => nav.navigate('Notifications'), badge: unread },
      ]}
    />
    {sheet}
    </>
  );
}
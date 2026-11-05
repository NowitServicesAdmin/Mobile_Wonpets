import React, { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../theme';
import { useAuth } from '../context/AuthContext';
import { useChat } from '../context/ChatContext';
import { useLiveSync } from '../context/LiveSyncContext';
import { areaCity, headerLocation } from '../utils/location';
import { useLiveLocation } from '../context/LocationContext';
import { useSettings } from '../context/SettingsContext';
import { TextSkeleton } from './Skeletons';
import { Avatar } from './Avatar';
import ProfileSwitcher from './ProfileSwitcher';
import { useManaged } from '../context/ManagedContext';

/** Top bar shared by the four tabs. Mirrors the web navbar: profile, greeting + location, search, chat and notifications. The search button opens the Search screen (live results + camera). */
export default function AppHeader() {
  const insets = useSafeAreaInsets();
  const nav = useNavigation<any>();
  const { user } = useAuth();
  const { info, infoLoaded } = useSettings();
  const { place: live, detecting } = useLiveLocation();
  const { unreadByKind } = useChat();
  const { unread } = useLiveSync();
  const { canSwitch } = useManaged();
  const [switcher, setSwitcher] = useState(false);
  const chatUnread = Object.values(unreadByKind ?? {}).reduce((a, b) => a + (b || 0), 0);

  const firstName = (user?.name ?? 'Customer').trim().split(' ')[0];
  // where the user is right now (area, city); if location access is off, fall back to the address saved in Settings
  const saved = headerLocation(info, user?.location);
  const place = areaCity(live) || saved;
  const placeLoading = !place && (detecting || !infoLoaded);

  const Btn = ({ icon, onPress, badge, label }: { icon: keyof typeof Ionicons.glyphMap; onPress: () => void; badge?: number; label: string }) => (
    <Pressable accessibilityLabel={label} hitSlop={6} onPress={onPress} className="w-[40px] h-[40px] rounded-full bg-white border border-line items-center justify-center active:bg-primary-soft">
      <Ionicons name={icon} size={19} color={colors.text} />
      {!!badge && (
        <View className="absolute -top-1.5 -right-1.5 bg-red min-w-[18px] h-[18px] rounded-full items-center justify-center px-1 border-2 border-cream">
          <Text className="text-white text-[9px] font-extrabold">{badge > 99 ? '99+' : badge}</Text>
        </View>
      )}
    </Pressable>
  );

  return (
    <View style={{ paddingTop: insets.top + 8 }} className="px-4 pb-3 bg-cream">
      <View className="flex-row items-center gap-2">
        {/* with shared pets available the avatar opens the account switcher, otherwise it opens the Profile tab as before */}
        <Pressable onPress={() => (canSwitch ? setSwitcher(true) : nav.navigate('Settings'))} accessibilityLabel={canSwitch ? 'Switch account' : 'Open settings'} className="rounded-full border-2 border-primary p-0.5">
          <Avatar image={user?.profileImage} emoji="🦅" size={38} />
          {canSwitch && (
            <View className="absolute -top-1 -left-1 w-[18px] h-[18px] rounded-full bg-primary border-2 border-cream items-center justify-center">
              <Ionicons name="swap-horizontal" size={9} color="#fff" />
            </View>
          )}
        </Pressable>
        <View className="flex-1 ml-1">
          <Text className="text-[18px] font-black text-ink" numberOfLines={1}>Hello, {firstName} 👋</Text>
          {/* location is display-only (not tappable) */}
<View className="flex-row items-center gap-1 mt-0.5">
  <Ionicons name="location-sharp" size={13} color={colors.primary} />
  {placeLoading
    ? <TextSkeleton width={120} />
    : <Text className="text-xs text-muted flex-shrink" numberOfLines={1}>{place || 'Location not set'}</Text>}
</View>
        </View>
        <Btn icon="search-outline" label="Search" onPress={() => nav.navigate('Search')} />
        <Btn icon="chatbubble-outline" label="Messages" onPress={() => nav.navigate('Chat')} badge={chatUnread} />
        <Btn icon="notifications-outline" label="Notifications" onPress={() => nav.navigate('Notifications')} badge={unread} />
      </View>
      <ProfileSwitcher visible={switcher} onClose={() => setSwitcher(false)} />
    </View>
  );
}
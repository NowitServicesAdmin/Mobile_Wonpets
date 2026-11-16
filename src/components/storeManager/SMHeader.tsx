import React from 'react';
import { Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import TopBar from '../common/TopBar';
import { useAccountSwitch } from '../common/useAccountSwitch';
import { colors } from '../../theme';
import { useAuth } from '../../context/AuthContext';
import { useSettings } from '../../context/SettingsContext';
import { useStoreManager } from '../../context/StoreManagerContext';

/** Store manager top bar (the shared TopBar, same layout as the owner and doctor bars):
 *  avatar -> profile (or the account switch when one is available), greeting + store name, search and notifications. */
export default function SMHeader() {
  const nav = useNavigation<any>();
  const { user } = useAuth();
  const { info } = useSettings();
  const { unread } = useStoreManager();
  const { avatarProps, sheet } = useAccountSwitch(() => nav.navigate('SMProfile'), 'Open profile');
  const first = (user?.name ?? 'there').trim().split(' ')[0];
  const store = info.storeName?.trim();

  return (
    <>
      <TopBar
        image={user?.profileImage} emoji="🏪"
        {...avatarProps}
        title={`Hello, ${first} 👋`}
        subtitle={
          <View className="flex-row items-center gap-1.5 mt-0.5">
            <View className="w-2 h-2 rounded-full bg-green" />
            <Ionicons name="storefront" size={12} color={colors.primary} />
            <Text className="text-xs text-muted font-semibold flex-1" numberOfLines={1}>{store || 'Store Manager'}</Text>
          </View>
        }
        actions={[
          { icon: 'search-outline', label: 'Search', onPress: () => nav.navigate('Search') },
          { icon: 'notifications-outline', label: 'Notifications', onPress: () => nav.navigate('Notifications'), badge: unread },
        ]}
      />
      {sheet}
    </>
  );
}

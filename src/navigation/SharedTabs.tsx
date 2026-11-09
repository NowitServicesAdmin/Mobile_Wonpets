import React from 'react';
import { Text, View } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme';
import { TabBar } from './MainTabs';
import TopBar from '../components/common/TopBar';
import { useAccountSwitch } from '../components/common/useAccountSwitch';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { useChat } from '../context/ChatContext';
import { useManaged } from '../context/ManagedContext';
import SharedHomeScreen from '../screens/shared/SharedHomeScreen';
import SharedPetsScreen from '../screens/shared/SharedPetsScreen';

const Tab = createBottomTabNavigator();

/** "Priya", "Priya & Ravi", "Priya, Ravi +1" */
function ownersLabel(names: string[]) {
  const u = Array.from(new Set(names.filter(Boolean)));
  if (u.length === 0) return 'another owner';
  if (u.length === 1) return u[0];
  if (u.length === 2) return `${u[0]} & ${u[1]}`;
  return `${u[0]}, ${u[1]} +${u.length - 2}`;
}

/** Top bar of the shared view - the same TopBar as the owner and doctor headers: avatar (opens the account switch), title + whose pets, messages. */
function SharedHeader() {
  const { user } = useAuth();
  const { accounts } = useManaged();
  const nav = useNavigation<any>();
  const { unreadByKind } = useChat();
  const unread = unreadByKind?.collab ?? 0;
  const { avatarProps, sheet } = useAccountSwitch(() => {}, 'Profile');

  return (
    <>
    <TopBar
      image={user?.profileImage}
      {...avatarProps}
      title={
        <View className="flex-row items-center gap-2">
          <Text className="text-[18px] font-black text-ink flex-shrink" numberOfLines={1}>Shared pets</Text>
          <View className="flex-row items-center gap-1 bg-primary-soft rounded-full px-2 py-0.5">
            <Ionicons name="eye-outline" size={11} color={colors.primary} />
            <Text className="text-[10px] font-extrabold text-primary">VIEW ONLY</Text>
          </View>
        </View>
      }
      subtitle={<Text className="text-xs text-muted" numberOfLines={1}>Caring for {ownersLabel(accounts.map((a) => a.ownerName))}'s pets</Text>}
      actions={[
        { icon: 'search-outline', label: 'Search', onPress: () => nav.navigate('Search') },
        { icon: 'chatbubble-ellipses-outline', label: 'Messages', onPress: () => nav.navigate('Chat', { tab: 'collab' }), badge: unread },
      ]}
    />
    {sheet}
    </>
  );
}

/** Tabs shown while "Shared With Me" is selected (collaborator mode). */
export default function SharedTabs() {
  return (
    <Tab.Navigator tabBar={(p) => <TabBar {...p} />} screenOptions={{ header: () => <SharedHeader /> }}>
      <Tab.Screen name="SharedHome" component={SharedHomeScreen} options={{ title: 'Home' }} />
      <Tab.Screen name="SharedPets" component={SharedPetsScreen} options={{ title: 'Pets' }} />
    </Tab.Navigator>
  );
}
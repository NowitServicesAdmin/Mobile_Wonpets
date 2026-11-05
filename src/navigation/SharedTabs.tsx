import React, { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme';
import { TabBar } from './MainTabs';
import { Avatar } from '../components/Avatar';
import ProfileSwitcher from '../components/ProfileSwitcher';
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

/** Top bar of the collaborator view: avatar = account switcher, title + whose pets, messages button. */
function SharedHeader() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { accounts } = useManaged();
  const [open, setOpen] = useState(false);
  const nav = useNavigation<any>();
  const { unreadByKind } = useChat();
  const unread = unreadByKind?.collab ?? 0;

  return (
    <View style={{ paddingTop: insets.top + 8 }} className="px-4 pb-3 bg-cream">
      <View className="flex-row items-center gap-3">
        <Pressable
          onPress={() => setOpen(true)}
          accessibilityRole="button"
          accessibilityLabel="Switch account"
          className="rounded-full border-2 border-primary p-0.5 active:opacity-80"
        >
          <Avatar image={user?.profileImage} emoji="🦅" size={40} />
          <View className="absolute -bottom-1 -right-1 w-[20px] h-[20px] rounded-full bg-primary border-2 border-cream items-center justify-center">
            <Ionicons name="swap-horizontal" size={10} color="#fff" />
          </View>
        </Pressable>

        <View className="flex-1">
          <View className="flex-row items-center gap-2">
            <Text className="text-[18px] font-black text-ink" numberOfLines={1}>Shared pets</Text>
            <View className="flex-row items-center gap-1 bg-primary-soft rounded-full px-2 py-0.5">
              <Ionicons name="eye-outline" size={11} color={colors.primary} />
              <Text className="text-[10px] font-extrabold text-primary">VIEW ONLY</Text>
            </View>
          </View>
          <Text className="text-xs text-muted" numberOfLines={1}>
            Caring for {ownersLabel(accounts.map((a) => a.ownerName))}'s pets
          </Text>
        </View>

        <Pressable
          onPress={() => nav.navigate('Chat', { tab: 'collab' })}
          accessibilityRole="button"
          accessibilityLabel="Messages"
          hitSlop={6}
          className="w-[42px] h-[42px] rounded-full bg-white border border-line items-center justify-center active:bg-primary-soft"
        >
          <Ionicons name="chatbubble-ellipses-outline" size={20} color={colors.text} />
          {unread > 0 && (
            <View className="absolute -top-1.5 -right-1.5 bg-red min-w-[18px] h-[18px] rounded-full items-center justify-center px-1 border-2 border-cream">
              <Text className="text-white text-[9px] font-extrabold">{unread > 99 ? '99+' : unread}</Text>
            </View>
          )}
        </Pressable>
      </View>
      <ProfileSwitcher visible={open} onClose={() => setOpen(false)} />
    </View>
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
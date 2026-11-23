import React from 'react';
import { ActivityIndicator, Pressable, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../../theme';
import DeliverToBar from './DeliverToBar';
import BrandLogo from '../BrandLogo';
import { HeaderButton, TopBarAction } from '../common/TopBar';

export type HeaderAction = TopBarAction;

/**
 * The store's top block, shared by the Store tab and the product page: cream bar like the rest of the app (back / Won Pet Pro logo / round icon buttons),
 * the search box with camera, the suggestion card (`suggestions`, passed in by the screen) and the "Deliver to" strip.
 * It is pinned (outside the scrolling list), so search and address are always one tap away.
 */
export default function StoreHeader({ navigation, onBack, actions, search, suggestions }: {
  navigation: any;
  onBack?: () => void;
  actions: HeaderAction[];
  search: {
    value: string; onChangeText: (t: string) => void; onFocus?: () => void; onSubmit?: () => void;
    placeholder?: string; onCamera?: () => void; scanning?: boolean;
  };
  suggestions?: React.ReactNode;
}) {
  const { top } = useSafeAreaInsets();
  const { value, onChangeText, onFocus, onSubmit, placeholder = 'Search Won Pet Pro for pet food, toys, accessories…', onCamera, scanning } = search;
  return (
    <View className="bg-cream border-b border-line">
      <View className="px-4 pb-3 gap-3" style={{ paddingTop: top + 8 }}>
        <View className="flex-row items-center gap-2">
          {!!onBack && <HeaderButton icon="arrow-back" label="Back" onPress={onBack} />}
          <View className="flex-1 ml-1">
            <BrandLogo variant="light" size="sm" tagline={false} />
          </View>
          {actions.map((a) => <HeaderButton key={a.label} {...a} />)}
        </View>
        <View className="flex-row items-center gap-2 bg-white border border-line rounded-2xl px-3.5 shadow-sm shadow-orange-800/10">
          <Ionicons name="search-outline" size={18} color={colors.muted} />
          <TextInput
            value={value} onChangeText={onChangeText} onFocus={onFocus} onSubmitEditing={onSubmit}
            placeholder={placeholder} placeholderTextColor="#B8AEA5" className="flex-1 py-2.5 text-ink"
            returnKeyType="search" autoCorrect={false}
          />
          {!!value && <Pressable hitSlop={8} onPress={() => onChangeText('')} accessibilityLabel="Clear search"><Ionicons name="close-circle" size={18} color="#CDBFB0" /></Pressable>}
          {!!onCamera && (scanning
            ? <ActivityIndicator size="small" color={colors.primary} />
            : <Pressable hitSlop={8} onPress={onCamera} accessibilityLabel="Search by photo"><Ionicons name="camera-outline" size={20} color={colors.primary} /></Pressable>)}
        </View>
        {suggestions}
      </View>
      <DeliverToBar navigation={navigation} />
    </View>
  );
}
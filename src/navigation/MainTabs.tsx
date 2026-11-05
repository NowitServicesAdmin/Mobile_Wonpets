import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { createBottomTabNavigator, BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme';
import AppHeader from '../components/AppHeader';
import { useCart } from '../context/CartContext';
import DashboardScreen from '../screens/main/DashboardScreen';
import AppointmentsScreen from '../screens/main/AppointmentsScreen';
import StoreScreen from '../screens/main/StoreScreen';
import SettingsScreen from '../screens/main/SettingsScreen';

const Tab = createBottomTabNavigator();
const icons: Record<string, [keyof typeof Ionicons.glyphMap, keyof typeof Ionicons.glyphMap]> = {
  Dashboard: ['grid-outline', 'grid'],
  Appointments: ['calendar-outline', 'calendar'],
  Store: ['bag-handle-outline', 'bag-handle'],
  Settings: ['person-outline', 'person'], // the Settings screen is now the Profile tab (route name unchanged)
  SharedHome: ['home-outline', 'home'],
  SharedPets: ['paw-outline', 'paw'],
};

/** Floating pill tab bar: the active tab expands into an orange pill with its label, the others show just an icon. */
export function TabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  return (
    <View style={{ backgroundColor: colors.bg, paddingHorizontal: 14, paddingTop: 8, paddingBottom: Math.max(insets.bottom, 10) }}>
      <View
        style={{
          flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 30, padding: 6,
          borderWidth: 1, borderColor: colors.border,
          elevation: 10, shadowColor: '#7C2D12', shadowOpacity: 0.14, shadowRadius: 14, shadowOffset: { width: 0, height: 4 },
        }}
      >
        {state.routes.map((route, index) => {
          const { options } = descriptors[route.key];
          const focused = state.index === index;
          const label = typeof options.tabBarLabel === 'string' ? options.tabBarLabel : options.title ?? route.name;
          const badge = options.tabBarBadge;
          const [off, on] = icons[route.name] ?? ['ellipse-outline', 'ellipse'];

          const onPress = () => {
            const e = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
            if (!focused && !e.defaultPrevented) navigation.navigate({ name: route.name, params: route.params } as never);
          };
          const onLongPress = () => navigation.emit({ type: 'tabLongPress', target: route.key });

          return (
            <Pressable
              key={route.key}
              accessibilityRole="button"
              accessibilityState={focused ? { selected: true } : {}}
              accessibilityLabel={label}
              onPress={onPress}
              onLongPress={onLongPress}
              style={{
                flex: focused ? 2.1 : 1, height: 46, borderRadius: 23, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
                backgroundColor: focused ? colors.primary : 'transparent',
              }}
            >
              <View>
                <Ionicons name={focused ? on : off} size={22} color={focused ? '#fff' : colors.muted} />
                {badge !== undefined && badge !== null && (
                  <View style={{ position: 'absolute', top: -6, right: -9, minWidth: 16, height: 16, paddingHorizontal: 3, borderRadius: 8, backgroundColor: colors.red, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: focused ? colors.primary : '#fff' }}>
                    <Text style={{ color: '#fff', fontSize: 9, fontWeight: '800' }}>{typeof badge === 'number' && badge > 99 ? '99+' : String(badge)}</Text>
                  </View>
                )}
              </View>
              {focused && <Text numberOfLines={1} style={{ color: '#fff', fontWeight: '800', fontSize: 13 }}>{label}</Text>}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

export default function MainTabs() {
  const { cartCount } = useCart();
  return (
    <Tab.Navigator tabBar={(p) => <TabBar {...p} />} screenOptions={{ header: () => <AppHeader /> }}>
      <Tab.Screen name="Dashboard" component={DashboardScreen} />
      <Tab.Screen name="Appointments" component={AppointmentsScreen} />
      <Tab.Screen name="Store" component={StoreScreen} options={{ tabBarBadge: cartCount > 0 ? cartCount : undefined }} />
      <Tab.Screen name="Settings" component={SettingsScreen} options={{ tabBarLabel: 'Profile', headerShown: false }} />
    </Tab.Navigator>
  );
}
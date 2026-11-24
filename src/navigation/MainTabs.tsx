import React from 'react';
import { Image, Pressable, Text, View } from 'react-native';
import { createBottomTabNavigator, BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, gradients, shadows } from '../theme';
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
  Settings: ['person-outline', 'person'], // the Settings screen is the Profile tab (route name unchanged)
  SharedHome: ['home-outline', 'home'],
  SharedPets: ['paw-outline', 'paw'],
  DoctorHome: ['home-outline', 'home'],
  DoctorSchedule: ['calendar-outline', 'calendar'],
  DoctorPatients: ['paw-outline', 'paw'],
  DoctorProfile: ['person-outline', 'person'],
  SMHome: ['home-outline', 'home'],
  SMOrders: ['receipt-outline', 'receipt'],
  SMManage: ['grid-outline', 'grid'],
  SMProfile: ['person-outline', 'person'],
};

const INACTIVE = '#2B2B2B';
const BAR_BG = '#FFF6EE';
const BAR_HEIGHT = 64;
const CENTER_SIZE = 66;
const RING_SIZE = 86;
const LOGO_SIZE = 38;
// Renders the logo as a solid white silhouette (white "W" on orange, like the reference).
// Set to undefined if you want your logo's original colors.
const LOGO_TINT: string | undefined = '#fff';

export function TabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const half = Math.ceil(state.routes.length / 2);

  const renderTab = (route: (typeof state.routes)[number], index: number) => {
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
        style={{ flex: focused ? 1.6 : 1, height: BAR_HEIGHT, alignItems: 'center', justifyContent: 'center' }}
      >
        <View>
          <Ionicons name={focused ? on : off} size={focused ? 26 : 25} color={focused ? colors.primary : INACTIVE} />
          {badge !== undefined && badge !== null && (
            <View
              style={{
                position: 'absolute', top: -6, right: -10, minWidth: 16, height: 16, paddingHorizontal: 3,
                borderRadius: 8, backgroundColor: colors.red, alignItems: 'center', justifyContent: 'center',
                borderWidth: 1.5, borderColor: BAR_BG,
              }}
            >
              <Text style={{ color: '#fff', fontSize: 9, fontWeight: '800' }}>
                {typeof badge === 'number' && badge > 99 ? '99+' : String(badge)}
              </Text>
            </View>
          )}
        </View>

        {/* label + underline only on the active tab */}
        {focused && (
          <>
            <Text
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.75}
              style={{ marginTop: 3, fontSize: 11, fontWeight: '800', color: colors.primary, paddingHorizontal: 2 }}
            >
              {label}
            </Text>
            <View style={{ marginTop: 3, height: 2.5, width: 34, borderRadius: 2, backgroundColor: colors.primary }} />
          </>
        )}
      </Pressable>
    );
  };

  const onCenterPress = () => {
    const first = state.routes[0];
    if (state.index !== 0) navigation.navigate({ name: first.name, params: first.params } as never);
  };

  return (
    <View style={{ backgroundColor: colors.bg, paddingHorizontal: 14, paddingBottom: Math.max(insets.bottom, 10) }}>
      {/* paddingTop leaves room for the raised logo so it stays touchable on Android */}
      <View style={{ paddingTop: 28 }}>
        <View
          style={{
            flexDirection: 'row', alignItems: 'center', backgroundColor: BAR_BG, borderRadius: 32,
            paddingHorizontal: 8,
            ...shadows.float,
          }}
        >
          {/* equal-width groups keep the logo centered no matter which tab is active */}
          <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center' }}>
            {state.routes.slice(0, half).map((r, i) => renderTab(r, i))}
          </View>
          <View style={{ width: RING_SIZE - 16 }} />
          <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center' }}>
            {state.routes.slice(half).map((r, i) => renderTab(r, i + half))}
          </View>
        </View>

        {/* Raised center logo: orange gradient circle, white ring, soft glow */}
        <View pointerEvents="box-none" style={{ position: 'absolute', top: 0, left: 0, right: 0, alignItems: 'center' }}>
          <View
            style={{
              width: RING_SIZE, height: RING_SIZE, borderRadius: RING_SIZE / 2,
              backgroundColor: 'rgba(255,140,40,0.22)', alignItems: 'center', justifyContent: 'center',
            }}
          >
            <Pressable
              onPress={onCenterPress}
              accessibilityRole="button"
              accessibilityLabel="Home"
              style={{
                width: CENTER_SIZE, height: CENTER_SIZE, borderRadius: CENTER_SIZE / 2, overflow: 'hidden',
                alignItems: 'center', justifyContent: 'center',
                borderWidth: 3, borderColor: '#fff',
                shadowColor: colors.primary, shadowOpacity: 0.4, shadowRadius: 10, shadowOffset: { width: 0, height: 3 },
                elevation: 8,
              }}
            >
              <LinearGradient
                colors={gradients.primary}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
              />
              <Image
                source={require('../assets/logo1.png')}
                style={{ width: LOGO_SIZE, height: LOGO_SIZE, tintColor: LOGO_TINT }}
                resizeMode="contain"
              />
            </Pressable>
          </View>
        </View>
      </View>
    </View>
  );
}

export default function MainTabs() {
  const { cartCount } = useCart();
  return (
    <Tab.Navigator tabBar={(p) => <TabBar {...p} />} screenOptions={{ header: () => <AppHeader /> }}>
      <Tab.Screen name="Dashboard" component={DashboardScreen} />
      <Tab.Screen name="Appointments" component={AppointmentsScreen} options={{ tabBarLabel: 'Schedule' }} />
      <Tab.Screen
        name="Store"
        component={StoreScreen}
        options={{ headerShown: false, tabBarLabel: 'Shop', tabBarBadge: cartCount > 0 ? cartCount : undefined }}
      />
      <Tab.Screen name="Settings" component={SettingsScreen} options={{ tabBarLabel: 'Profile', headerShown: false }} />
    </Tab.Navigator>
  );
}
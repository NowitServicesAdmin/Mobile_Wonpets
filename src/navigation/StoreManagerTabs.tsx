import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { TabBar } from './MainTabs';
import SMHeader from '../components/storeManager/SMHeader';
import { useStoreManager } from '../context/StoreManagerContext';
import SMDashboardScreen from '../screens/storeManager/SMDashboardScreen';
import SMOrdersScreen from '../screens/storeManager/SMOrdersScreen';
import SMManageScreen from '../screens/storeManager/SMManageScreen';
import SMProfileScreen from '../screens/storeManager/SMProfileScreen';

const Tab = createBottomTabNavigator();

/** The store manager's four tabs, in the same floating pill tab bar as the owner and doctor apps. */
export default function StoreManagerTabs() {
  const { pendingOrders } = useStoreManager();
  return (
    <Tab.Navigator tabBar={(p) => <TabBar {...p} />} screenOptions={{ header: () => <SMHeader /> }}>
      <Tab.Screen name="SMHome" component={SMDashboardScreen} options={{ title: 'Home' }} />
      <Tab.Screen name="SMOrders" component={SMOrdersScreen} options={{ title: 'Orders', tabBarBadge: pendingOrders > 0 ? pendingOrders : undefined }} />
      <Tab.Screen name="SMManage" component={SMManageScreen} options={{ title: 'Manage' }} />
      <Tab.Screen name="SMProfile" component={SMProfileScreen} options={{ title: 'Profile', headerShown: false }} />
    </Tab.Navigator>
  );
}

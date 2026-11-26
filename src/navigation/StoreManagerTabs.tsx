import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { TabBar } from './MainTabs';
import SMHeader from '../components/storeManager/SMHeader';
import SMDashboardScreen from '../screens/storeManager/SMDashboardScreen';
import SMEarningsScreen from '../screens/storeManager/SMEarningsScreen';
import SMManageScreen from '../screens/storeManager/SMManageScreen';
import SMProfileScreen from '../screens/storeManager/SMProfileScreen';

const Tab = createBottomTabNavigator();

/** The four tabs of the web sidebar - Dashboard, Management, Earnings, Settings - in the same floating pill tab bar as the owner and doctor apps.
 *  (Orders is opened from Management, like on the web.) */
export default function StoreManagerTabs() {
  return (
    <Tab.Navigator tabBar={(p) => <TabBar {...p} />} screenOptions={{ header: () => <SMHeader /> }}>
      <Tab.Screen name="SMHome" component={SMDashboardScreen} options={{ title: 'Dashboard' }} />
      <Tab.Screen name="SMManage" component={SMManageScreen} options={{ title: 'Management' }} />
      <Tab.Screen name="SMEarnings" component={SMEarningsScreen} options={{ title: 'Earnings' }} />
      <Tab.Screen name="SMProfile" component={SMProfileScreen} options={{ title: 'Settings', headerShown: false }} />
    </Tab.Navigator>
  );
}

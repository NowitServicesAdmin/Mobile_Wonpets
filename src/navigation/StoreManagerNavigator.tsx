import React from 'react';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { colors } from '../theme';
import StoreManagerTabs from './StoreManagerTabs';
import SMProductsScreen from '../screens/storeManager/SMProductsScreen';
import SMProductFormScreen from '../screens/storeManager/SMProductFormScreen';
import SMCategoriesScreen from '../screens/storeManager/SMCategoriesScreen';
import SMInventoryScreen from '../screens/storeManager/SMInventoryScreen';
import SMOrderDetailScreen from '../screens/storeManager/SMOrderDetailScreen';
import SMCustomersScreen from '../screens/storeManager/SMCustomersScreen';
import SMReviewsScreen from '../screens/storeManager/SMReviewsScreen';
import SMOffersScreen from '../screens/storeManager/SMOffersScreen';
import SMOfferFormScreen from '../screens/storeManager/SMOfferFormScreen';
import SMReportsScreen from '../screens/storeManager/SMReportsScreen';
import SMEarningsScreen from '../screens/storeManager/SMEarningsScreen';
// shared with the owner / doctor apps
import NotificationsScreen from '../screens/main/NotificationsScreen';
import SearchScreen from '../screens/main/SearchScreen';

const Stack = createNativeStackNavigator();
const theme = { ...DefaultTheme, colors: { ...DefaultTheme.colors, background: colors.bg, primary: colors.primary } };
const page = (title: string) => ({ headerShown: true, title, headerTintColor: colors.text });

/** Everything a signed-in store manager can open (web /storemanager/* pages). */
export default function StoreManagerNavigator() {
  return (
    <NavigationContainer theme={theme}>
      <Stack.Navigator screenOptions={{ headerShown: false, headerStyle: { backgroundColor: colors.bg }, headerShadowVisible: false, headerTitleStyle: { fontWeight: '800', fontSize: 18, color: colors.text } }}>
        <Stack.Screen name="SMMain" component={StoreManagerTabs} />
        <Stack.Screen name="SMProducts" component={SMProductsScreen} options={({ route }: any) => page(route.params?.categoryName || 'Products')} />
        <Stack.Screen name="SMProductForm" component={SMProductFormScreen} options={page('Add Product')} />
        <Stack.Screen name="SMCategories" component={SMCategoriesScreen} options={page('Categories')} />
        <Stack.Screen name="SMInventory" component={SMInventoryScreen} options={page('Inventory')} />
        <Stack.Screen name="SMOrderDetail" component={SMOrderDetailScreen} options={page('Order Details')} />
        <Stack.Screen name="SMCustomers" component={SMCustomersScreen} options={page('Customers')} />
        <Stack.Screen name="SMReviews" component={SMReviewsScreen} options={page('Reviews')} />
        <Stack.Screen name="SMOffers" component={SMOffersScreen} options={page('Coupons & Offers')} />
        <Stack.Screen name="SMOfferForm" component={SMOfferFormScreen} options={page('Create Offer')} />
        <Stack.Screen name="SMReports" component={SMReportsScreen} options={page('Reports & Analytics')} />
        <Stack.Screen name="SMEarnings" component={SMEarningsScreen} options={page('Earnings')} />
        <Stack.Screen name="Notifications" component={NotificationsScreen} options={page('Notifications')} />
        <Stack.Screen name="Search" component={SearchScreen} options={page('Search')} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

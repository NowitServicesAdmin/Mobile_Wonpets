import React from 'react';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuth } from '../context/AuthContext';
import { useManaged } from '../context/ManagedContext';
import { colors } from '../theme';

import SplashScreen from '../screens/auth/SplashScreen';
import OnboardingScreen from '../screens/auth/OnboardingScreen';
import LoginScreen from '../screens/auth/LoginScreen';
import RegisterScreen from '../screens/auth/RegisterScreen';
import OtpScreen from '../screens/auth/OtpScreen';
import MainTabs from './MainTabs';
import SharedTabs from './SharedTabs';
import ProductDetailScreen from '../screens/main/ProductDetailScreen';
import PetProfileScreen from '../screens/main/PetProfileScreen';
import AddPetScreen from '../screens/main/AddPetScreen';
import ManageTasksScreen from '../screens/main/ManageTasksScreen';
import BookAppointmentScreen from '../screens/main/BookAppointmentScreen';
import AppointmentDetailScreen from '../screens/main/AppointmentDetailScreen';
import CartScreen from '../screens/main/CartScreen';
import WishlistScreen from '../screens/main/WishlistScreen';
import OfferProductsScreen from '../screens/main/OfferProductsScreen';
import OrdersScreen from '../screens/main/OrdersScreen';
import OrderDetailScreen from '../screens/main/OrderDetailScreen';
import CheckoutScreen from '../screens/main/CheckoutScreen';
import OrderSuccessScreen from '../screens/main/OrderSuccessScreen';
import NotificationsScreen from '../screens/main/NotificationsScreen';
import PrescriptionScreen from '../screens/main/PrescriptionScreen';
import ResellScreen from '../screens/main/ResellScreen';
import ListingDetailScreen from '../screens/main/ListingDetailScreen';
import CreateListingScreen from '../screens/main/CreateListingScreen';
import MyListingsScreen from '../screens/main/MyListingsScreen';
import ChatScreen from '../screens/main/ChatScreen';
import ChatThreadScreen from '../screens/main/ChatThreadScreen';
import SearchScreen from '../screens/main/SearchScreen';
import VideoCallScreen from '../screens/main/VideoCallScreen';

const Stack = createNativeStackNavigator();
const theme = { ...DefaultTheme, colors: { ...DefaultTheme.colors, background: colors.bg, primary: colors.primary } };

export default function RootNavigator() {
  const { loading, onboarded, user } = useAuth();
  const { isManaged } = useManaged();
  if (loading) return <SplashScreen />;

  return (
    <NavigationContainer theme={theme}>
      <Stack.Navigator screenOptions={{
  headerShown: false,
  headerStyle: { backgroundColor: colors.bg },
  headerShadowVisible: false,
  headerTitleStyle: { fontWeight: '800', fontSize: 18, color: colors.text },
}}>
        {!onboarded ? (
          <Stack.Screen name="Onboarding" component={OnboardingScreen} />
        ) : !user ? (
          <>
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="Register" component={RegisterScreen} />
            <Stack.Screen name="Otp" component={OtpScreen} />
          </>
        ) : isManaged ? (
          // "Shared With Me" mode: only the shared pets' screens (the owner's own stack is not mounted)
          <>
            <Stack.Screen name="SharedMain" component={SharedTabs} />
            <Stack.Screen name="Chat" component={ChatScreen} options={{ headerShown: true, title: 'Messages', headerTintColor: colors.text }} />
            <Stack.Screen name="ChatThread" component={ChatThreadScreen} />
            <Stack.Screen name="Search" component={SearchScreen} options={{ headerShown: true, title: 'Search', headerTintColor: colors.text }} />
          </>
        ) : (
          <>
            <Stack.Screen name="Main" component={MainTabs} />
            <Stack.Screen name="ProductDetail" component={ProductDetailScreen} options={{ headerShown: true, title: '', headerTransparent: true, headerTintColor: colors.text }} />
            <Stack.Screen name="PetProfile" component={PetProfileScreen} options={{ headerShown: true, title: 'Pet Profile', headerTintColor: colors.text }} />
            <Stack.Screen name="AddPet" component={AddPetScreen} options={{ headerShown: true, title: 'Add New Pet', headerTintColor: colors.text }} />
            <Stack.Screen name="ManageTasks" component={ManageTasksScreen} options={{ headerShown: true, title: 'Manage Tasks', headerTintColor: colors.text }} />
            <Stack.Screen name="BookAppointment" component={BookAppointmentScreen} options={{ headerShown: true, title: 'Book Appointment', headerTintColor: colors.text }} />
            <Stack.Screen name="AppointmentDetail" component={AppointmentDetailScreen} options={{ headerShown: true, title: 'Appointment', headerTintColor: colors.text }} />
            <Stack.Screen name="VideoCall" component={VideoCallScreen} options={{ presentation: 'fullScreenModal', gestureEnabled: false }} />
            <Stack.Screen name="Prescription" component={PrescriptionScreen} options={{ headerShown: true, title: 'Prescription', headerTintColor: colors.text }} />
            <Stack.Screen name="Cart" component={CartScreen} options={{ headerShown: true, title: 'My Cart', headerTintColor: colors.text }} />
            <Stack.Screen name="OfferProducts" component={OfferProductsScreen} options={({ route }: any) => ({ headerShown: true, title: route.params?.title || 'Offer products', headerTintColor: colors.text })} />
            <Stack.Screen name="Wishlist" component={WishlistScreen} options={{ headerShown: true, title: 'Favourites', headerTintColor: colors.text }} />
            <Stack.Screen name="Orders" component={OrdersScreen} options={{ headerShown: true, title: 'My Orders', headerTintColor: colors.text }} />
            <Stack.Screen name="OrderDetail" component={OrderDetailScreen} options={{ headerShown: true, title: 'Order Details', headerTintColor: colors.text }} />
            <Stack.Screen name="Checkout" component={CheckoutScreen} options={{ headerShown: true, title: 'Checkout', headerTintColor: colors.text }} />
            <Stack.Screen name="OrderSuccess" component={OrderSuccessScreen} options={{ gestureEnabled: false }} />
            <Stack.Screen name="Notifications" component={NotificationsScreen} options={{ headerShown: true, title: 'Notifications', headerTintColor: colors.text }} />
            <Stack.Screen name="Chat" component={ChatScreen} options={{ headerShown: true, title: 'Messages', headerTintColor: colors.text }} />
            <Stack.Screen name="ChatThread" component={ChatThreadScreen} />
            <Stack.Screen name="Resell" component={ResellScreen} options={{ headerShown: true, title: 'Resell', headerTintColor: colors.text }} />
            <Stack.Screen name="ListingDetail" component={ListingDetailScreen} options={{ headerShown: true, title: 'Listing', headerTintColor: colors.text }} />
            <Stack.Screen name="CreateListing" component={CreateListingScreen} options={({ route }: any) => ({ headerShown: true, title: route.params?.id ? 'Edit Listing' : 'Add New Listing', headerTintColor: colors.text })} />
            <Stack.Screen name="MyListings" component={MyListingsScreen} options={{ headerShown: true, title: 'My Listings', headerTintColor: colors.text }} />
            <Stack.Screen name="Search" component={SearchScreen} options={{ headerShown: true, title: 'Search', headerTintColor: colors.text }} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

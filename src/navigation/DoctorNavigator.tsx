import React from 'react';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { colors } from '../theme';
import DoctorTabs from './DoctorTabs';
import SharedTabs from './SharedTabs';
import { useManaged } from '../context/ManagedContext';
import DoctorAppointmentScreen from '../screens/doctor/DoctorAppointmentScreen';
import PrescriptionFormScreen from '../screens/doctor/PrescriptionFormScreen';
import PrescriptionViewScreen from '../screens/doctor/PrescriptionViewScreen';
import MedicalRecordFormScreen from '../screens/doctor/MedicalRecordFormScreen';
import PatientDetailScreen from '../screens/doctor/PatientDetailScreen';
import FollowUpsScreen from '../screens/doctor/FollowUpsScreen';
import PrescriptionsScreen from '../screens/doctor/PrescriptionsScreen';
import MedicalRecordsScreen from '../screens/doctor/MedicalRecordsScreen';
import EarningsScreen from '../screens/doctor/EarningsScreen';
import AvailabilityScreen from '../screens/doctor/AvailabilityScreen';
import DoctorLanguageScreen from '../screens/doctor/DoctorLanguageScreen';
// shared with the owner app
import NotificationsScreen from '../screens/main/NotificationsScreen';
import ChatScreen from '../screens/main/ChatScreen';
import ChatThreadScreen from '../screens/main/ChatThreadScreen';
import SearchScreen from '../screens/main/SearchScreen';

const Stack = createNativeStackNavigator();
const theme = { ...DefaultTheme, colors: { ...DefaultTheme.colors, background: colors.bg, primary: colors.primary } };
const page = (title: string) => ({ headerShown: true, title, headerTintColor: colors.text });

/** Everything a signed-in doctor can open. Chat and Notifications are the very same screens the owner uses. */
export default function DoctorNavigator() {
  const { isManaged } = useManaged();
  return (
    <NavigationContainer theme={theme}>
      <Stack.Navigator screenOptions={{ headerShown: false, headerStyle: { backgroundColor: colors.bg }, headerShadowVisible: false, headerTitleStyle: { fontWeight: '800', fontSize: 18, color: colors.text } }}>
        {isManaged ? (
          // "Shared With Me" mode (same as the owner app): only the shared pets' screens, the doctor's own stack is not mounted
          <>
            <Stack.Screen name="SharedMain" component={SharedTabs} />
            <Stack.Screen name="Chat" component={ChatScreen} options={page('Messages')} />
            <Stack.Screen name="ChatThread" component={ChatThreadScreen} />
            <Stack.Screen name="Search" component={SearchScreen} options={page('Search')} />
          </>
        ) : (
          <>
        <Stack.Screen name="DoctorMain" component={DoctorTabs} />
        <Stack.Screen name="DoctorAppointment" component={DoctorAppointmentScreen} options={page('Appointment')} />
        <Stack.Screen name="PrescriptionForm" component={PrescriptionFormScreen} options={page('Prescription')} />
        <Stack.Screen name="PrescriptionView" component={PrescriptionViewScreen} options={page('Prescription')} />
        <Stack.Screen name="MedicalRecordForm" component={MedicalRecordFormScreen} options={page('Medical record')} />
        <Stack.Screen name="PatientDetail" component={PatientDetailScreen} options={page('Patient')} />
        <Stack.Screen name="FollowUps" component={FollowUpsScreen} options={page('Follow-ups')} />
        <Stack.Screen name="Prescriptions" component={PrescriptionsScreen} options={page('Prescriptions')} />
        <Stack.Screen name="MedicalRecords" component={MedicalRecordsScreen} options={page('Medical Records')} />
        <Stack.Screen name="Earnings" component={EarningsScreen} options={page('Earnings')} />
        <Stack.Screen name="Availability" component={AvailabilityScreen} options={page('Availability')} />
        <Stack.Screen name="DoctorLanguage" component={DoctorLanguageScreen} options={page('Language')} />
        <Stack.Screen name="Notifications" component={NotificationsScreen} options={page('Notifications')} />
        <Stack.Screen name="Chat" component={ChatScreen} options={page('Messages')} />
        <Stack.Screen name="ChatThread" component={ChatThreadScreen} />
        <Stack.Screen name="Search" component={SearchScreen} options={page('Search')} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

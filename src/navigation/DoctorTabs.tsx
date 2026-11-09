import React, { useState } from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { TabBar } from './MainTabs';
import DoctorHeader from '../components/doctor/DoctorHeader';
import StatusSheet from '../components/doctor/StatusSheet';
import { useDoctor } from '../context/DoctorContext';
import { doctorService } from '../services/doctor.service';
import DoctorHomeScreen from '../screens/doctor/DoctorHomeScreen';
import DoctorScheduleScreen from '../screens/doctor/DoctorScheduleScreen';
import PatientsScreen from '../screens/doctor/PatientsScreen';
import DoctorProfileScreen from '../screens/doctor/DoctorProfileScreen';

const Tab = createBottomTabNavigator();

/** The doctor's four tabs, in the same floating pill tab bar as the owner app. */
export default function DoctorTabs() {
  const [statusOpen, setStatusOpen] = useState(false);
  const { pendingBadge } = useBadges();
  return (
    <>
      <Tab.Navigator tabBar={(p) => <TabBar {...p} />} screenOptions={{ header: () => <DoctorHeader onStatusPress={() => setStatusOpen(true)} /> }}>
        <Tab.Screen name="DoctorHome" component={DoctorHomeScreen} options={{ title: 'Home' }} />
        <Tab.Screen name="DoctorSchedule" component={DoctorScheduleScreen} options={{ title: 'Schedule', tabBarBadge: pendingBadge }} />
        <Tab.Screen name="DoctorPatients" component={PatientsScreen} options={{ title: 'Patients' }} />
        <Tab.Screen name="DoctorProfile" component={DoctorProfileScreen} options={{ title: 'Profile', headerShown: false }} />
      </Tab.Navigator>
      <StatusSheet visible={statusOpen} onClose={() => setStatusOpen(false)} />
    </>
  );
}

/** Number of booking requests waiting for an answer (badge on the Schedule tab). Refreshes with the live tick. */
function useBadges() {
  const { tick } = useDoctor();
  const [n, setN] = React.useState(0);
  React.useEffect(() => {
    let live = true;
    doctorService.pending().then((l) => live && setN(l.length), () => {});
    return () => { live = false; };
  }, [tick]);
  return { pendingBadge: n > 0 ? n : undefined };
}

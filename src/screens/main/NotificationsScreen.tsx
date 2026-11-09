import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme';
import { Empty, T, cn } from '../../components/ui';
import { toast } from '../../components/WonPetsAlert';
import { Notice } from '../../data/mock';
import { notificationsService } from '../../services/notifications.service';
import { errorMessage } from '../../services/api';
import { NotificationsSkeleton } from '../../components/Skeletons';
import { useLiveSync } from '../../context/LiveSyncContext';
import { getDoctorNotificationTarget, getNotificationTargetFor, getStoreNotificationTarget } from '../../utils/notificationNavigation';
import { useStoreManager } from '../../context/StoreManagerContext';
import { useAuth } from '../../context/AuthContext';
import { useDoctor } from '../../context/DoctorContext';


export default function NotificationsScreen({ navigation }: any) {
  const [notices, setNotices] = useState<Notice[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try { setNotices((await notificationsService.list()).notices); }
    catch (e) { toast.error(errorMessage(e)); }
    finally { setLoading(false); }
  }, []);
  const role = useAuth().user?.role;
  const isDoctor = role === 'doctor';
  const isStore = role === 'store_manager';
  // owners are kept fresh by LiveSync, doctors by DoctorContext, store managers by StoreManagerContext
  const owner = useLiveSync();
  const doctor = useDoctor();
  const store = useStoreManager();
  const tick = isDoctor ? doctor.tick : isStore ? store.tick : owner.tick;
  // first load, then silently reload whenever live sync sees something new
  useEffect(() => { load(); }, [load, tick]);

  const markOne = (n: Notice) => {
    if (!n.unread) return;
    setNotices((l) => l.map((x) => (x.id === n.id ? { ...x, unread: false } : x)));
    notificationsService.markRead(n.id).catch(() => setNotices((l) => l.map((x) => (x.id === n.id ? { ...x, unread: true } : x))));
  };

  const open = (n: Notice) => {
    markOne(n);
    const target = isDoctor ? getDoctorNotificationTarget(n) : isStore ? getStoreNotificationTarget(n) : getNotificationTargetFor(n);
    if (!target) return; // informational only - marking it read is enough
    navigation.navigate(target.name, target.params);
  };

  const markAll = () => {
    setNotices((l) => l.map((x) => ({ ...x, unread: false })));
    notificationsService.markAllRead().then(() => { if (isStore) store.syncNow(); }).catch((e) => { toast.error(errorMessage(e)); load(); });
  };

  if (loading) return <NotificationsSkeleton />;
  return (
    <FlatList className="flex-1 bg-cream" contentContainerClassName="p-4 gap-2.5 pb-8" data={notices} keyExtractor={(n) => n.id}
      refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false); }}
      ListEmptyComponent={<Empty emoji="🔔" title="No notifications" body="You're all caught up." />}
      ListHeaderComponent={notices.some((n) => n.unread) ? <Pressable onPress={markAll} className="mb-2"><Text className="text-primary font-bold text-right">Mark all as read</Text></Pressable> : undefined}
      renderItem={({ item }) => (
        <Pressable onPress={() => open(item)} className={cn('flex-row gap-3 p-3.5 rounded-2xl border', item.unread ? 'bg-primary-soft border-primary/30' : 'bg-white border-line')}>
          <View className="w-10 h-10 rounded-full bg-white items-center justify-center"><Ionicons name={item.icon as any} size={20} color={colors.primary} /></View>
          <View className="flex-1"><Text className={T.h3}>{item.title}</Text><Text className={T.body}>{item.body}</Text><Text className={T.small + ' mt-1'}>{item.time}</Text></View>
          {item.unread && <View className="w-2.5 h-2.5 rounded-full bg-primary mt-1.5" />}
        </Pressable>
      )} />
  );
}

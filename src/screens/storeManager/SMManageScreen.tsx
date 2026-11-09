import React from 'react';
import { Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme';
import { Gradient, cn } from '../../components/ui';
import { Skeleton, SkeletonScreen } from '../../components/Skeletons';
import { TONES, DTone } from '../../components/doctor/DoctorUI';
import { useRemote } from '../../hooks/useRemote';
import { Overview, smService } from '../../services/storeManager.service';
import { useStoreManager } from '../../context/StoreManagerContext';

type Icon = keyof typeof Ionicons.glyphMap;
type Card = { title: string; desc: string; key?: keyof Overview; sub: string; icon: Icon; tone: DTone; go: string };

/** The web "Management Overview": one card per area of the store, each with its live count. */
const CARDS: Card[] = [
  { title: 'Products', desc: 'Add, edit and manage products & pets', key: 'products', sub: 'Total products', icon: 'cube', tone: 'purple', go: 'SMProducts' },
  { title: 'Categories', desc: 'Organise products and pets', key: 'categories', sub: 'Categories', icon: 'grid', tone: 'orange', go: 'SMCategories' },
  { title: 'Inventory', desc: 'Track stock levels', key: 'inventory', sub: 'Low stock items', icon: 'layers', tone: 'green', go: 'SMInventory' },
  { title: 'Orders', desc: 'Process and ship orders', key: 'orders', sub: 'Total orders', icon: 'clipboard', tone: 'blue', go: 'SMOrders' },
  { title: 'Customers', desc: 'See who buys from you', key: 'customers', sub: 'Customers', icon: 'people', tone: 'pink', go: 'SMCustomers' },
  { title: 'Reviews', desc: 'Approve or hide reviews', key: 'reviews', sub: 'Reviews', icon: 'star', tone: 'amber', go: 'SMReviews' },
  { title: 'Coupons & Offers', desc: 'Run discounts and coupons', key: 'offers', sub: 'Active offers', icon: 'pricetags', tone: 'red', go: 'SMOffers' },
  { title: 'Reports', desc: 'Sales reports & exports', sub: 'Analytics', icon: 'bar-chart', tone: 'blue', go: 'SMReports' },
];

export default function SMManageScreen({ navigation }: any) {
  const { tick } = useStoreManager();
  const ov = useRemote(() => smService.overview(), [], tick);

  return (
    <ScrollView className="flex-1 bg-cream" contentContainerClassName="p-4 gap-4 pb-10"
      refreshControl={<RefreshControl refreshing={ov.refreshing} onRefresh={ov.reload} tintColor={colors.primary} />}>
      <View>
        <Text className="text-[22px] font-black text-ink">Management</Text>
        <Text className="text-[13px] text-muted">Handle all your store data and operations in one place.</Text>
      </View>

      {/* earnings banner */}
      <Pressable onPress={() => navigation.navigate('SMEarnings')} accessibilityRole="button" className="active:opacity-90">
        <Gradient className="rounded-3xl p-4 flex-row items-center gap-3 overflow-hidden" colorsArr={['#FB923C', '#F97316']}>
          <View className="w-12 h-12 rounded-2xl bg-white/25 items-center justify-center"><Ionicons name="wallet" size={24} color="#fff" /></View>
          <View className="flex-1">
            <Text className="text-white text-[16px] font-extrabold">Earnings & Payouts</Text>
            <Text className="text-white/90 text-xs">Revenue trend, payouts and transactions</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#fff" />
        </Gradient>
      </Pressable>

      {ov.loading && !ov.data ? (
        <SkeletonScreen className="flex-row flex-wrap gap-3">
          {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="w-[48.4%] h-[150px] rounded-3xl" />)}
        </SkeletonScreen>
      ) : (
        <View className="flex-row flex-wrap gap-3">
          {CARDS.map((c) => {
            const t = TONES[c.tone];
            const value = c.key ? ov.data?.[c.key] ?? '—' : '';
            return (
              <Pressable key={c.title} onPress={() => navigation.navigate(c.go)} accessibilityRole="button" accessibilityLabel={c.title}
                className="w-[48.4%] bg-white rounded-3xl border border-orange-100 p-3.5 active:bg-orange-50">
                <View className="flex-row items-center justify-between">
                  <View className={cn('w-11 h-11 rounded-2xl items-center justify-center', t.soft)}><Ionicons name={c.icon} size={21} color={t.fg} /></View>
                  <Ionicons name="arrow-forward" size={16} color="#CDBFB0" />
                </View>
                <Text className="text-[15px] font-extrabold text-slate-800 mt-2.5" numberOfLines={1}>{c.title}</Text>
                <Text className="text-[11px] text-slate-500 leading-[14px]" numberOfLines={2}>{c.desc}</Text>
                <View className="flex-row items-end gap-1.5 mt-2.5">
                  {value !== '' && <Text className="text-[22px] font-black text-slate-800 leading-6">{value}</Text>}
                  <Text className={cn('text-[11px] font-semibold mb-0.5', t.text)}>{c.sub}</Text>
                </View>
              </Pressable>
            );
          })}
        </View>
      )}
    </ScrollView>
  );
}

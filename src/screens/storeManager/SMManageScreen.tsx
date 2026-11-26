import React from 'react';
import { Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme';
import { Skeleton, SkeletonScreen } from '../../components/Skeletons';
import { SMTitle, SM_PAD, SM_TINT, numShort } from '../../components/storeManager/SMUI';
import { useRemote } from '../../hooks/useRemote';
import { smService } from '../../services/storeManager.service';
import { useStoreManager } from '../../context/StoreManagerContext';

type Icon = keyof typeof Ionicons.glyphMap;
type Card = { title: string; desc: string; value: (o: Awaited<ReturnType<typeof load>>) => number; sub: string; btn: string; icon: Icon; tint: keyof typeof SM_TINT; go: string };

const load = async () => {
  const [overview, completed] = await Promise.all([smService.overview(), smService.reportOrders().catch(() => 0)]);
  return { overview, completed };
};

/** The six cards of the web "Management Overview" - same titles, descriptions, counts and buttons. */
const CARDS: Card[] = [
  { title: 'Products', desc: 'Add, edit and manage all your store products.', value: (o) => o.overview.products, sub: 'Total Products', btn: 'Manage Products', icon: 'cube', tint: 'purple', go: 'SMProducts' },
  { title: 'Categories', desc: 'Organize products in different categories.', value: (o) => o.overview.categories, sub: 'Total Categories', btn: 'Manage Categories', icon: 'grid', tint: 'orange', go: 'SMCategories' },
  { title: 'Orders', desc: 'View and manage all customer orders.', value: (o) => o.overview.orders, sub: 'Total Orders', btn: 'Manage Orders', icon: 'clipboard', tint: 'blue', go: 'SMOrders' },
  { title: 'Reviews', desc: 'Manage customer reviews and ratings.', value: (o) => o.overview.reviews, sub: 'Total Reviews', btn: 'Manage Reviews', icon: 'star', tint: 'amber', go: 'SMReviews' },
  { title: 'Coupons & Offers', desc: 'Create and manage discounts and offers.', value: (o) => o.overview.offers, sub: 'Active Offers', btn: 'Manage Coupons', icon: 'pricetag', tint: 'green', go: 'SMOffers' },
  { title: 'Reports', desc: 'View detailed reports and analytics.', value: (o) => o.completed, sub: 'Completed Orders', btn: 'View Reports', icon: 'trending-up', tint: 'pink', go: 'SMReports' },
];

export default function SMManageScreen({ navigation }: any) {
  const { tick } = useStoreManager();
  const ov = useRemote(load, [], tick);

  return (
    <ScrollView className="flex-1 bg-cream" contentContainerClassName={SM_PAD}
      refreshControl={<RefreshControl refreshing={ov.refreshing} onRefresh={ov.reload} tintColor={colors.primary} />}>
      <SMTitle title="Management Overview" subtitle="Handle all your store data and operations in one place." />

      {ov.loading && !ov.data ? (
        <SkeletonScreen className="flex-row flex-wrap gap-2.5">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="w-[48.6%] h-[150px] rounded-2xl" />)}
        </SkeletonScreen>
      ) : (
        <View className="flex-row flex-wrap gap-2.5">
          {CARDS.map((c) => {
            const t = SM_TINT[c.tint];
            const v = ov.data ? numShort(c.value(ov.data)) : '—';
            return (
              <Pressable key={c.title} onPress={() => navigation.navigate(c.go)} accessibilityRole="button" accessibilityLabel={c.title}
                className="w-[48.6%] bg-white rounded-2xl border border-line p-3 active:bg-primary-soft">
                <View className="flex-row items-center gap-2">
                  <View style={{ backgroundColor: t.bg }} className="w-10 h-10 rounded-xl items-center justify-center"><Ionicons name={c.icon} size={20} color={t.fg} /></View>
                  <Text className="flex-1 text-[14px] font-extrabold text-ink" numberOfLines={2}>{c.title}</Text>
                </View>
                <Text className="text-[11px] text-muted leading-[14px] mt-1.5" numberOfLines={2}>{c.desc}</Text>
                <Text className="text-[22px] font-black text-ink leading-7 mt-1.5">{v}</Text>
                <Text className="text-[11px] text-muted">{c.sub}</Text>
                <View style={{ backgroundColor: t.bg }} className="flex-row items-center justify-center gap-1 rounded-full py-1.5 mt-2">
                  <Text style={{ color: t.fg }} className="text-[11.5px] font-bold" numberOfLines={1}>{c.btn}</Text>
                  <Ionicons name="arrow-forward" size={12} color={t.fg} />
                </View>
              </Pressable>
            );
          })}
        </View>
      )}
    </ScrollView>
  );
}

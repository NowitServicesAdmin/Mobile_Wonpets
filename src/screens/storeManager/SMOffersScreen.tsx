import React, { useMemo, useState } from 'react';
import { FlatList, Pressable, RefreshControl, Switch, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme';
import { Empty, cn } from '../../components/ui';
import { Avatar } from '../../components/Avatar';
import { WishlistSkeleton } from '../../components/Skeletons';
import { WonPetsAlert, toast } from '../../components/WonPetsAlert';
import SearchBar from '../../components/common/SearchBar';
import { Bar, LoadError, OfferBadge, RowAction, SMStat, SMStatGrid, SM_PAD, SM_TINT, fmtDayMonth, inrShort, numShort } from '../../components/storeManager/SMUI';
import { useRemote } from '../../hooks/useRemote';
import { errorMessage } from '../../services/api';
import { SMOffer, smService } from '../../services/storeManager.service';
import { useStoreManager } from '../../context/StoreManagerContext';

export const THEME_COLORS: Record<string, string> = { orange: '#F97316', blue: '#3B82F6', green: '#22C55E', yellow: '#EAB308', red: '#EF4444', violet: '#8B5CF6' };

/** Coupons & Offers (web OffersPage): every coupon with its period, usage and an on/off switch. */
export default function SMOffersScreen({ navigation }: any) {
  const { tick } = useStoreManager();
  const q = useRemote(async () => {
    const [offers, stats] = await Promise.all([smService.offers(), smService.offerStats().catch(() => null)]);
    return { offers, stats };
  }, [], tick);
  const [search, setSearch] = useState('');
  const [toggling, setToggling] = useState<string | null>(null);

  const all = q.data?.offers ?? [];
  const list = useMemo(() => {
    const k = search.trim().toLowerCase();
    return all.filter((o) => (!k || `${o.code} ${o.title} ${o.highlight}`.toLowerCase().includes(k)));
  }, [all, search]);

  const toggle = async (o: SMOffer) => {
    setToggling(o.id);
    try {
      await smService.toggleOffer(o.id);
      toast.success(o.isActive ? 'Offer turned off' : 'Offer turned on');
      q.reloadQuiet();
    } catch (e) { toast.error(errorMessage(e, 'Could not change the offer')); } finally { setToggling(null); }
  };
  const remove = async (o: SMOffer) => {
    const r = await WonPetsAlert.delete('Delete offer?', `Coupon ${o.code} will be removed.`, { confirmText: 'Yes, delete' });
    if (!r.isConfirmed) return;
    try { await smService.deleteOffer(o.id); toast.success('Offer deleted'); q.reloadQuiet(); }
    catch (e) { toast.error(errorMessage(e, 'Unable to delete offer')); }
  };

  if (q.loading && !q.data) return <WishlistSkeleton />;
  if (q.error && !q.data) return <LoadError message={q.error} onRetry={q.reload} />;
  const s = q.data?.stats;
  const stats: SMStat[] = [
    { title: 'Active Offers', value: numShort(s?.active ?? all.filter((o) => o.status === 'Active').length), icon: 'pricetags', ...SM_TINT.green },
    { title: 'Scheduled', value: numShort(s?.scheduled ?? 0), icon: 'calendar', ...SM_TINT.blue },
    { title: 'Expired', value: numShort(s?.expired ?? 0), icon: 'time', ...SM_TINT.red },
    { title: 'Total Usage', value: numShort(s?.usage ?? 0), icon: 'bar-chart', ...SM_TINT.orange },
  ];

  return (
    <View className="flex-1 bg-cream">
      <FlatList
        data={list} keyExtractor={(o) => o.id} contentContainerClassName={SM_PAD}
        refreshControl={<RefreshControl refreshing={q.refreshing} onRefresh={q.reload} tintColor={colors.primary} />}
        ListHeaderComponent={
          <View className="gap-2.5 mb-0.5">
            <Text className="text-[11.5px] text-muted -mb-1">Create and manage discount coupons</Text>
            <SMStatGrid stats={stats} />
            <View className="flex-row items-center gap-2">
              <View className="flex-1"><SearchBar value={search} onChangeText={setSearch} placeholder="Search coupons..." /></View>
              <Pressable onPress={() => navigation.navigate('SMOfferForm')} accessibilityRole="button" accessibilityLabel="Create Coupon" className="flex-row items-center gap-1 bg-primary rounded-xl px-3 h-11 active:opacity-80">
                <Ionicons name="add" size={17} color="#fff" /><Text className="text-white font-extrabold text-[12.5px]">Create</Text>
              </Pressable>
            </View>
          </View>
        }
        ListEmptyComponent={<Empty emoji="🏷️" title={all.length ? 'No matching offers' : 'No offers yet'} body={all.length ? 'Try another search.' : 'Create a coupon to run a discount campaign.'} />}
        renderItem={({ item: o }) => {
          const accent = THEME_COLORS[o.theme] ?? THEME_COLORS.orange;
          const used = o.maxUsage ? o.usedCount / o.maxUsage : 0;
          return (
            <Pressable onPress={() => navigation.navigate('SMOfferForm', { id: o.id })} accessibilityRole="button" accessibilityLabel={`Offer ${o.code}`}
              className={cn('bg-white rounded-2xl border border-line overflow-hidden active:opacity-90', o.status === 'Expired' && 'opacity-80')}>
              <View style={{ backgroundColor: accent }} className="h-1.5" />
              <View className="p-3">
                <View className="flex-row items-center gap-3">
                  <Avatar image={o.productImage} emoji="🏷️" size={52} square />
                  <View className="flex-1">
                    <Text className="font-extrabold text-ink" numberOfLines={1}>{o.title || o.code}</Text>
                    <View className="flex-row items-center gap-1.5 mt-0.5">
                      <View style={{ borderColor: accent }} className="border border-dashed rounded-md px-1.5 py-0.5"><Text style={{ color: accent }} className="font-black text-[12px] tracking-wider">{o.code}</Text></View>
                      <OfferBadge status={o.status} />
                    </View>
                    {!!o.highlight && <Text className="text-[11px] text-primary mt-0.5" numberOfLines={1}>{o.highlight}</Text>}
                  </View>
                  <View className="items-end">
                    <Text style={{ color: accent }} className="text-[20px] font-black">{o.discountType === 'Flat' ? inrShort(o.discount) : `${o.discount}%`}</Text>
                    <Text className="text-[10px] text-muted">{o.discountType === 'Flat' ? 'flat' : 'off'}</Text>
                  </View>
                </View>
                <View className="flex-row items-center gap-1.5 mt-3">
                  <Ionicons name="calendar-outline" size={13} color={colors.muted} />
                  <Text className="text-[12px] text-muted flex-1">{fmtDayMonth(o.startDate)} → {fmtDayMonth(o.endDate)}</Text>
                  {o.minimumOrderAmount > 0 && <Text className="text-[11px] text-muted">Min {inrShort(o.minimumOrderAmount)}</Text>}
                </View>
                <View className="mt-2.5">
                  <View className="flex-row justify-between mb-1"><Text className="text-[11px] text-muted">Used {numShort(o.usedCount)} / {o.maxUsage ? numShort(o.maxUsage) : '∞'}</Text><Text className="text-[11px] font-bold text-muted">{Math.round(used * 100)}%</Text></View>
                  <Bar ratio={used} color={accent} />
                </View>
                <View className="flex-row items-center gap-2 mt-2 pt-2 border-t border-line">
                  <Switch value={o.isActive} disabled={toggling === o.id} onValueChange={() => toggle(o)} trackColor={{ false: '#E5DDD3', true: colors.primary }} thumbColor="#fff" ios_backgroundColor="#E5DDD3" />
                  <Text className="flex-1 text-[12.5px] font-semibold text-muted">{o.isActive ? 'Enabled' : 'Disabled'}</Text>
                  <RowAction icon="create-outline" tone="blue" label={`Edit ${o.code}`} onPress={() => navigation.navigate('SMOfferForm', { id: o.id })} />
                  <RowAction icon="trash-outline" tone="red" label={`Delete ${o.code}`} onPress={() => remove(o)} />
                </View>
              </View>
            </Pressable>
          );
        }}
      />
    </View>
  );
}

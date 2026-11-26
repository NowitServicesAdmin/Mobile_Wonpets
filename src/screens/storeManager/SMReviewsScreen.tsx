import React, { useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, RefreshControl, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme';
import { Empty, cn } from '../../components/ui';
import { NotificationsSkeleton } from '../../components/Skeletons';
import { toast } from '../../components/WonPetsAlert';
import SearchBar from '../../components/common/SearchBar';
import { Badge, LoadError, SMStat, SMStatGrid, SM_PAD, SM_TINT, fmtDayMonth, numShort } from '../../components/storeManager/SMUI';
import { useRemote } from '../../hooks/useRemote';
import { errorMessage } from '../../services/api';
import { SMReview, smService } from '../../services/storeManager.service';
import { useStoreManager } from '../../context/StoreManagerContext';

const Stars = ({ value }: { value: number }) => (
  <View className="flex-row gap-0.5">
    {[1, 2, 3, 4, 5].map((i) => <Ionicons key={i} name={value >= i ? 'star' : value >= i - 0.5 ? 'star-half' : 'star-outline'} size={13} color="#F5B301" />)}
  </View>
);

/** Reviews (web ReviewsPage): four stat cards, search, and each review with Approve / Reject while it is pending. */
export default function SMReviewsScreen() {
  const { tick } = useStoreManager();
  const q = useRemote(() => smService.reviews(), [], tick);
  const [search, setSearch] = useState('');
  const [busy, setBusy] = useState<string | null>(null);

  const all = q.data?.reviews ?? [];
  const list = useMemo(() => {
    const k = search.trim().toLowerCase();
    return all.filter((r) => !k || `${r.customer} ${r.product} ${r.text}`.toLowerCase().includes(k));
  }, [all, search]);

  const moderate = async (r: SMReview, approve: boolean) => {
    setBusy(`${r.id}:${approve}`);
    try {
      await (approve ? smService.approveReview(r.id) : smService.rejectReview(r.id));
      toast.success(approve ? 'Review approved' : 'Review rejected');
      q.setData((d) => d && { ...d, reviews: d.reviews.map((x) => (x.id === r.id ? { ...x, status: approve ? 'Approved' : 'Rejected' } : x)) });
      q.reloadQuiet();
    } catch (e) { toast.error(errorMessage(e, approve ? 'Unable to approve review.' : 'Unable to reject review.')); } finally { setBusy(null); }
  };

  if (q.loading && !q.data) return <NotificationsSkeleton />;
  if (q.error && !q.data) return <LoadError message={q.error} onRetry={q.reload} />;
  const s = q.data!.stats;
  const stats: SMStat[] = [
    { title: 'Average Rating', value: s.average ? `★ ${s.average}` : '—', icon: 'star', ...SM_TINT.amber },
    { title: 'Pending Reviews', value: numShort(s.pending), icon: 'time', ...SM_TINT.orange },
    { title: 'Approved Reviews', value: numShort(s.approved), icon: 'checkmark-circle', ...SM_TINT.green },
    { title: 'Rejected Reviews', value: numShort(s.rejected), icon: 'close-circle', ...SM_TINT.red },
  ];

  return (
    <FlatList
      className="flex-1 bg-cream" contentContainerClassName={SM_PAD}
      data={list} keyExtractor={(r) => r.id}
      refreshControl={<RefreshControl refreshing={q.refreshing} onRefresh={q.reload} tintColor={colors.primary} />}
      ListHeaderComponent={
        <View className="gap-2.5 mb-0.5">
          <Text className="text-[11.5px] text-muted -mb-1">Manage customer reviews and ratings</Text>
          <SMStatGrid stats={stats} />
          <SearchBar value={search} onChangeText={setSearch} placeholder="Search reviews..." />
        </View>
      }
      ListEmptyComponent={<Empty emoji="⭐" title="No reviews found" body={all.length ? 'Try another search term' : 'Customer reviews of your products will appear here.'} />}
      renderItem={({ item: r }) => (
        <View className="bg-white rounded-2xl border border-line p-3">
          <View className="flex-row items-center gap-2.5">
            <View className="w-9 h-9 rounded-full bg-orange-100 items-center justify-center"><Text className="text-primary font-bold">{(r.customer.charAt(0) || 'U').toUpperCase()}</Text></View>
            <View className="flex-1">
              <Text className="font-bold text-ink text-[13.5px]" numberOfLines={1}>{r.customer}</Text>
              <Text className="text-[11.5px] text-primary" numberOfLines={1}>{r.product}</Text>
            </View>
            <Badge label={r.status} tone={r.status === 'Approved' ? 'green' : r.status === 'Rejected' ? 'red' : 'orange'} />
          </View>
          <View className="flex-row items-center gap-2 mt-2"><Stars value={r.rating} /><Text className="text-[11px] text-muted">{fmtDayMonth(r.createdAt)}</Text></View>
          {!!r.text && <Text className="text-[13px] text-muted leading-5 mt-1">{r.text}</Text>}
          {r.status === 'Pending' && (
            <View className="flex-row gap-2 mt-2.5">
              {([[true, 'Approve', '#16A34A', '#DCFCE7'], [false, 'Reject', '#DC2626', '#FEE2E2']] as const).map(([ok, label, fg, bg]) => (
                <Pressable key={label} disabled={!!busy} onPress={() => moderate(r, ok)} style={{ backgroundColor: bg }} className={cn('flex-1 h-9 rounded-xl flex-row items-center justify-center gap-1.5 active:opacity-70', !!busy && 'opacity-60')}>
                  {busy === `${r.id}:${ok}` ? <ActivityIndicator size="small" color={fg} /> : null}
                  <Text style={{ color: fg }} className="font-bold text-[13px]">{label}</Text>
                </Pressable>
              ))}
            </View>
          )}
        </View>
      )}
    />
  );
}

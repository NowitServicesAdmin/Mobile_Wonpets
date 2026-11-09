import React, { useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, RefreshControl, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme';
import { Empty, cn } from '../../components/ui';
import { NotificationsSkeleton } from '../../components/Skeletons';
import { toast } from '../../components/WonPetsAlert';
import SearchBar from '../../components/common/SearchBar';
import FilterChips from '../../components/common/FilterChips';
import { WebStatGrid } from '../../components/doctor/DoctorUI';
import { Badge, LoadError, fmtDate } from '../../components/storeManager/SMUI';
import { useRemote } from '../../hooks/useRemote';
import { errorMessage } from '../../services/api';
import { SMReview, smService } from '../../services/storeManager.service';
import { useStoreManager } from '../../context/StoreManagerContext';

const Stars = ({ value }: { value: number }) => (
  <View className="flex-row gap-0.5">
    {[1, 2, 3, 4, 5].map((i) => <Ionicons key={i} name={value >= i ? 'star' : value >= i - 0.5 ? 'star-half' : 'star-outline'} size={14} color="#F5B301" />)}
  </View>
);

/** Reviews (web ReviewsPage): approve or reject what customers wrote about your products. Pending ones come first. */
export default function SMReviewsScreen() {
  const { tick } = useStoreManager();
  const q = useRemote(() => smService.reviews(), [], tick);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<string[]>([]);
  const [busy, setBusy] = useState<string | null>(null);

  const all = q.data?.reviews ?? [];
  const list = useMemo(() => {
    const k = search.trim().toLowerCase();
    const order = { Pending: 0, Approved: 1, Rejected: 2 } as const;
    return all
      .filter((r) => (!filter.length || filter.includes(r.status)) && (!k || `${r.customer} ${r.product} ${r.text}`.toLowerCase().includes(k)))
      .sort((a, b) => order[a.status] - order[b.status] || (b.createdAt ?? '').localeCompare(a.createdAt ?? ''));
  }, [all, search, filter]);

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

  return (
    <FlatList
      className="flex-1 bg-cream" contentContainerClassName="p-4 gap-3 pb-10"
      data={list} keyExtractor={(r) => r.id}
      refreshControl={<RefreshControl refreshing={q.refreshing} onRefresh={q.reload} tintColor={colors.primary} />}
      ListHeaderComponent={
        <View className="gap-3.5 mb-1">
          <WebStatGrid stats={[
            { title: 'Average Rating', value: s.average ? `★ ${s.average}` : '—', icon: 'star', tone: 'amber' },
            { title: 'Pending', value: s.pending, icon: 'time', tone: 'orange', caption: 'Need approval', onPress: () => setFilter(['Pending']) },
            { title: 'Approved', value: s.approved, icon: 'checkmark-circle', tone: 'green', caption: 'Published', onPress: () => setFilter(['Approved']) },
            { title: 'Rejected', value: s.rejected, icon: 'close-circle', tone: 'red', caption: 'Hidden', onPress: () => setFilter(['Rejected']) },
          ]} />
          <SearchBar value={search} onChangeText={setSearch} placeholder="Search by customer, product or text…" />
          <FilterChips active={filter} onChange={setFilter} allCount={all.length}
            options={[
              { key: 'Pending', label: 'Pending', count: s.pending, color: '#EA580C', soft: '#FFEDD5' },
              { key: 'Approved', label: 'Approved', count: s.approved, color: '#16A34A', soft: '#DCFCE7' },
              { key: 'Rejected', label: 'Rejected', count: s.rejected, color: '#DC2626', soft: '#FEE2E2' },
            ]} />
        </View>
      }
      ListEmptyComponent={<Empty emoji="⭐" title={all.length ? 'No matching reviews' : 'No reviews yet'} body={all.length ? 'Try another search term.' : 'Customer reviews of your products will appear here.'} />}
      renderItem={({ item: r }) => (
        <View className={cn('bg-white rounded-3xl border p-3.5', r.status === 'Pending' ? 'border-orange-200' : 'border-orange-100')}>
          <View className="flex-row items-center gap-3">
            <View className="w-10 h-10 rounded-full bg-orange-100 items-center justify-center"><Text className="text-orange-500 font-bold">{r.customer.charAt(0).toUpperCase()}</Text></View>
            <View className="flex-1">
              <Text className="font-bold text-slate-800" numberOfLines={1}>{r.customer}</Text>
              <Text className="text-xs text-orange-500" numberOfLines={1}>{r.product}</Text>
            </View>
            <Badge label={r.status} tone={r.status === 'Approved' ? 'green' : r.status === 'Rejected' ? 'red' : 'orange'} />
          </View>
          <View className="flex-row items-center gap-2 mt-2.5"><Stars value={r.rating} /><Text className="text-[11px] text-slate-400">{fmtDate(r.createdAt)}</Text></View>
          {!!r.text && <Text className="text-[13.5px] text-slate-600 leading-5 mt-1.5">{r.text}</Text>}
          {r.status === 'Pending' && (
            <View className="flex-row gap-2 mt-3 pt-3 border-t border-slate-100">
              {([[true, 'Approve', 'checkmark', '#16A34A', '#DCFCE7'], [false, 'Reject', 'close', '#DC2626', '#FEE2E2']] as const).map(([ok, label, icon, fg, bg]) => (
                <Pressable key={label} disabled={!!busy} onPress={() => moderate(r, ok)} style={{ backgroundColor: bg }} className={cn('flex-1 h-10 rounded-xl flex-row items-center justify-center gap-1.5 active:opacity-70', !!busy && 'opacity-60')}>
                  {busy === `${r.id}:${ok}` ? <ActivityIndicator size="small" color={fg} /> : <Ionicons name={icon} size={15} color={fg} />}
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

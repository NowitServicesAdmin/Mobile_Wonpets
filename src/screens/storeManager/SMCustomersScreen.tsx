import React, { useMemo, useState } from 'react';
import { FlatList, Linking, Pressable, RefreshControl, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme';
import { Empty, cn } from '../../components/ui';
import { Avatar } from '../../components/Avatar';
import { ChatListSkeleton } from '../../components/Skeletons';
import SearchBar from '../../components/common/SearchBar';
import BottomSheet from '../../components/common/BottomSheet';
import InfoGrid from '../../components/common/InfoField';
import LoadMoreFooter from '../../components/LoadMoreFooter';
import { WebStatGrid } from '../../components/doctor/DoctorUI';
import { Badge, LoadError, fmtDate, inr0 } from '../../components/storeManager/SMUI';
import { useRemote } from '../../hooks/useRemote';
import { useInfiniteSlice } from '../../hooks/useInfiniteSlice';
import { Customer, smService } from '../../services/storeManager.service';
import { useStoreManager } from '../../context/StoreManagerContext';

type Sort = 'spent' | 'orders' | 'name';

/** Customers (web CustomersPage): everyone who ordered from the store, with orders and total spent. */
export default function SMCustomersScreen() {
  const { tick } = useStoreManager();
  const q = useRemote(() => smService.customers(), [], tick);
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<Sort>('spent');
  const [view, setView] = useState<Customer | null>(null);

  const all = q.data?.customers ?? [];
  const list = useMemo(() => {
    const k = search.trim().toLowerCase();
    const out = all.filter((c) => !k || c.name.toLowerCase().includes(k) || c.email.toLowerCase().includes(k));
    return out.sort(sort === 'spent' ? (a, b) => b.totalSpent - a.totalSpent : sort === 'orders' ? (a, b) => b.orders - a.orders : (a, b) => a.name.localeCompare(b.name));
  }, [all, search, sort]);
  const page = useInfiniteSlice(list, 15, `${search}|${sort}`);

  if (q.loading && !q.data) return <ChatListSkeleton />;
  if (q.error && !q.data) return <LoadError message={q.error} onRetry={q.reload} />;
  const s = q.data!.stats;

  return (
    <>
      <FlatList
        className="flex-1 bg-cream" contentContainerClassName="p-4 gap-2.5 pb-10"
        data={page.items} keyExtractor={(c) => c.id}
        refreshControl={<RefreshControl refreshing={q.refreshing} onRefresh={q.reload} tintColor={colors.primary} />}
        onEndReached={page.loadMore} onEndReachedThreshold={0.4}
        ListHeaderComponent={
          <View className="gap-3.5 mb-1">
            <WebStatGrid stats={[
              { title: 'Total Customers', value: s.total, icon: 'people', tone: 'red' },
              { title: 'Active', value: s.active, icon: 'person', tone: 'green' },
              { title: 'New This Month', value: s.newThisMonth, icon: 'person-add', tone: 'blue' },
              { title: 'Returning', value: s.returning, icon: 'repeat', tone: 'purple', caption: 'Repeat buyers' },
            ]} />
            <SearchBar value={search} onChangeText={setSearch} placeholder="Search customers…" />
            <View className="flex-row items-center gap-2">
              <Text className="text-xs text-muted flex-1">{list.length} customer{list.length === 1 ? '' : 's'}</Text>
              {([['spent', 'Top spenders'], ['orders', 'Most orders'], ['name', 'A–Z']] as [Sort, string][]).map(([k, l]) => (
                <Pressable key={k} onPress={() => setSort(k)} className={cn('px-2.5 py-1.5 rounded-full border', sort === k ? 'bg-primary border-primary' : 'bg-white border-line')}>
                  <Text className={cn('text-[11.5px] font-bold', sort === k ? 'text-white' : 'text-ink')}>{l}</Text>
                </Pressable>
              ))}
            </View>
          </View>
        }
        ListEmptyComponent={<Empty emoji="🧑‍🤝‍🧑" title={all.length ? 'No matching customers' : 'No customers yet'} body={all.length ? 'Try another name or email.' : 'People who order from your store appear here.'} />}
        ListFooterComponent={list.length ? <LoadMoreFooter hasMore={page.hasMore} total={page.total} noun="customers" /> : undefined}
        renderItem={({ item: c }) => (
          <Pressable onPress={() => setView(c)} accessibilityRole="button" accessibilityLabel={c.name} className="flex-row items-center gap-3 bg-white rounded-2xl border border-orange-100 p-3 active:bg-orange-50/40">
            <Avatar image={c.image} emoji="🧑" size={46} />
            <View className="flex-1">
              <Text className="font-bold text-slate-800" numberOfLines={1}>{c.name}</Text>
              <Text className="text-xs text-slate-500" numberOfLines={1}>{c.email || '—'}</Text>
              <Text className="text-[11px] text-slate-400 mt-0.5">{c.orders} order{c.orders === 1 ? '' : 's'}{c.orders > 1 ? ' · returning' : ''}</Text>
            </View>
            <View className="items-end gap-1">
              <Text className="font-extrabold text-green-600">{inr0(c.totalSpent)}</Text>
              <Badge label={c.status} tone={c.status === 'Active' ? 'green' : 'slate'} />
            </View>
          </Pressable>
        )}
      />

      <BottomSheet visible={!!view} onClose={() => setView(null)} title="Customer Details">
        {!!view && (
          <>
            <View className="items-center gap-1.5">
              <View className="rounded-full p-0.5 bg-orange-300"><View className="rounded-full bg-white p-0.5"><Avatar image={view.image} emoji="🧑" size={72} /></View></View>
              <Text className="text-[18px] font-black text-ink">{view.name}</Text>
              {!!view.email && <Text className="text-[13px] text-muted">{view.email}</Text>}
            </View>
            <View className="bg-white rounded-3xl border border-line p-4">
              <InfoGrid items={[['Orders', view.orders], ['Total spent', inr0(view.totalSpent)], ['Average order', view.orders ? inr0(view.totalSpent / view.orders) : '—'], ['Status', view.status], ['Customer since', fmtDate(view.joinedAt)], ['Type', view.orders > 1 ? 'Returning' : 'First-time']]} />
            </View>
            {!!view.email && (
              <Pressable onPress={() => Linking.openURL(`mailto:${view.email}`)} className="flex-row items-center justify-center gap-2 h-12 rounded-2xl bg-blue-50 active:opacity-70">
                <Ionicons name="mail" size={18} color={colors.blue} /><Text className="font-extrabold text-blue">Email customer</Text>
              </Pressable>
            )}
          </>
        )}
      </BottomSheet>
    </>
  );
}

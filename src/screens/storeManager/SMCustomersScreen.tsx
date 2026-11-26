import React, { useMemo, useState } from 'react';
import { FlatList, Pressable, RefreshControl, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme';
import { Empty } from '../../components/ui';
import { Avatar } from '../../components/Avatar';
import { ChatListSkeleton } from '../../components/Skeletons';
import SearchBar from '../../components/common/SearchBar';
import BottomSheet from '../../components/common/BottomSheet';
import InfoGrid from '../../components/common/InfoField';
import LoadMoreFooter from '../../components/LoadMoreFooter';
import { Badge, LoadError, SMStat, SMStatGrid, SM_PAD, SM_TINT, inr0, numShort } from '../../components/storeManager/SMUI';
import { useRemote } from '../../hooks/useRemote';
import { useInfiniteSlice } from '../../hooks/useInfiniteSlice';
import { Customer, smService } from '../../services/storeManager.service';
import { useStoreManager } from '../../context/StoreManagerContext';

/** Customers (web CustomersPage): four stat cards, search, and each customer with orders, total spent and status. */
export default function SMCustomersScreen() {
  const { tick } = useStoreManager();
  const q = useRemote(() => smService.customers(), [], tick);
  const [search, setSearch] = useState('');
  const [view, setView] = useState<Customer | null>(null);

  const all = q.data?.customers ?? [];
  const list = useMemo(() => {
    const k = search.trim().toLowerCase();
    return all.filter((c) => !k || c.name.toLowerCase().includes(k) || c.email.toLowerCase().includes(k));
  }, [all, search]);
  const page = useInfiniteSlice(list, 15, search);

  if (q.loading && !q.data) return <ChatListSkeleton />;
  if (q.error && !q.data) return <LoadError message={q.error} onRetry={q.reload} />;
  const s = q.data!.stats;
  const stats: SMStat[] = [
    { title: 'Total Customers', value: numShort(s.total), icon: 'people', ...SM_TINT.red, caption: 'Registered customers' },
    { title: 'Active Customers', value: numShort(s.active), icon: 'person', ...SM_TINT.green, caption: 'Currently active' },
    { title: 'New This Month', value: numShort(s.newThisMonth), icon: 'person-add', ...SM_TINT.blue, caption: 'Recently joined' },
    { title: 'Returning', value: numShort(s.returning), icon: 'repeat', ...SM_TINT.purple, caption: 'Repeat buyers' },
  ];

  return (
    <>
      <FlatList
        className="flex-1 bg-cream" contentContainerClassName={SM_PAD}
        data={page.items} keyExtractor={(c) => c.id}
        refreshControl={<RefreshControl refreshing={q.refreshing} onRefresh={q.reload} tintColor={colors.primary} />}
        onEndReached={page.loadMore} onEndReachedThreshold={0.4}
        ListHeaderComponent={
          <View className="gap-2.5 mb-0.5">
            <Text className="text-[11.5px] text-muted -mb-1">Manage your store customers</Text>
            <SMStatGrid stats={stats} />
            <SearchBar value={search} onChangeText={setSearch} placeholder="Search customers..." />
            <Text className="text-[11.5px] text-muted">{list.length} Customers</Text>
          </View>
        }
        ListEmptyComponent={<Empty emoji="🧑‍🤝‍🧑" title={all.length ? 'No matching customers' : 'No customers yet'} body={all.length ? 'Try another name or email.' : 'People who order from your store appear here.'} />}
        ListFooterComponent={list.length ? <LoadMoreFooter hasMore={page.hasMore} total={page.total} noun="customers" /> : undefined}
        renderItem={({ item: c }) => (
          <Pressable onPress={() => setView(c)} accessibilityRole="button" accessibilityLabel={c.name} className="flex-row items-center gap-2.5 bg-white rounded-2xl border border-line p-2.5 active:bg-primary-soft">
            <Avatar image={c.image} emoji="🧑" size={40} />
            <View className="flex-1">
              <Text className="font-bold text-ink text-[13.5px]" numberOfLines={1}>{c.name}</Text>
              <Text className="text-[11.5px] text-muted" numberOfLines={1}>{c.email || '—'}</Text>
              <Text className="text-[11px] text-muted">{numShort(c.orders)} order{c.orders === 1 ? '' : 's'} · {inr0(c.totalSpent)}</Text>
            </View>
            <View className="items-end gap-1">
              <Badge label={c.status} tone={c.status === 'Active' ? 'green' : 'slate'} />
              <Ionicons name="eye-outline" size={17} color={colors.primary} />
            </View>
          </Pressable>
        )}
      />

      <BottomSheet visible={!!view} onClose={() => setView(null)} title="Customer Details">
        {!!view && (
          <>
            <View className="items-center gap-1">
              <View className="rounded-full p-0.5 bg-orange-300"><View className="rounded-full bg-white p-0.5"><Avatar image={view.image} emoji="🧑" size={64} /></View></View>
              <Text className="text-[17px] font-black text-ink">{view.name}</Text>
              {!!view.email && <Text className="text-[12.5px] text-muted">{view.email}</Text>}
            </View>
            <View className="bg-white rounded-2xl border border-line p-3">
              <InfoGrid items={[['Orders', view.orders], ['Total Spent', inr0(view.totalSpent)], ['Status', view.status]]} />
            </View>
          </>
        )}
      </BottomSheet>
    </>
  );
}

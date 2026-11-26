import React, { useMemo, useState } from 'react';
import { FlatList, Pressable, RefreshControl, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme';
import { Button, Empty } from '../../components/ui';
import { Avatar } from '../../components/Avatar';
import { WishlistSkeleton } from '../../components/Skeletons';
import { toast } from '../../components/WonPetsAlert';
import SearchBar from '../../components/common/SearchBar';
import BottomSheet from '../../components/common/BottomSheet';
import CustomDropdown from '../../components/CustomDropdown';
import LoadMoreFooter from '../../components/LoadMoreFooter';
import { Badge, LoadError, SMCard, SMCardHead, SMStat, SMStatGrid, SM_PAD, SM_TINT, StockBadge, numShort } from '../../components/storeManager/SMUI';
import { useRemote } from '../../hooks/useRemote';
import { useInfiniteSlice } from '../../hooks/useInfiniteSlice';
import { errorMessage } from '../../services/api';
import { LOW_STOCK_LIMIT, SMProduct, smService, stockStatus } from '../../services/storeManager.service';
import { useStoreManager } from '../../context/StoreManagerContext';

/** Same four options as the web select. "All" shows what needs attention (inactive, low or out of stock). */
const FILTERS = ['All', 'Low Stock', 'Out Of Stock', 'Inactive'].map((l) => ({ label: l, value: l }));
const AVAIL = [{ label: 'Active', value: 'Active' }, { label: 'Inactive', value: 'Inactive' }];

/** Inventory (web InventoryPage): stat cards, inventory alerts, top low stock items, searchable item list and the stock editor. */
export default function SMInventoryScreen() {
  const { tick, syncNow } = useStoreManager();
  const q = useRemote(() => smService.products(), [], tick);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('All');
  const [edit, setEdit] = useState<SMProduct | null>(null);
  const [stock, setStock] = useState('');
  const [avail, setAvail] = useState('Active');
  const [saving, setSaving] = useState(false);

  const all = q.data ?? [];
  const list = useMemo(() => {
    const k = search.trim().toLowerCase();
    return all.filter((p) => {
      const st = stockStatus(p.stock);
      const ok = filter === 'All' ? p.status === 'Inactive' || st !== 'In Stock'
        : filter === 'Inactive' ? p.status === 'Inactive' : st === filter;
      return ok && (!k || `${p.name} ${p.categoryName}`.toLowerCase().includes(k));
    });
  }, [all, search, filter]);
  const page = useInfiniteSlice(list, 10, `${search}|${filter}`);

  const open = (p: SMProduct) => { setEdit(p); setStock(String(p.stock)); setAvail(p.status); };
  const save = async () => {
    if (!edit) return;
    if (stock === '') return toast.error('Stock is required');
    const n = Number(stock);
    if (!(n >= 0)) return toast.error('Stock cannot be negative');
    setSaving(true);
    try {
      const res = await smService.updateStock(edit.id, n, avail as 'Active' | 'Inactive');
      toast.success(res.message || 'Inventory updated successfully');
      q.setData((l) => l?.map((x) => (x.id === edit.id ? { ...x, stock: n, status: avail as 'Active' | 'Inactive' } : x)));
      setEdit(null);
      syncNow();
    } catch (e) { toast.error(errorMessage(e, 'Failed to update inventory')); } finally { setSaving(false); }
  };

  if (q.loading && !q.data) return <WishlistSkeleton />;
  if (q.error && !q.data) return <LoadError message={q.error} onRetry={q.reload} />;

  const active = all.filter((p) => p.status === 'Active');
  const stats: SMStat[] = [
    { title: 'Total Products', value: numShort(all.length), icon: 'cube', ...SM_TINT.blue },
    { title: 'In Stock', value: numShort(active.filter((p) => p.stock > LOW_STOCK_LIMIT).length), icon: 'checkmark-circle', ...SM_TINT.green },
    { title: 'Low Stock', value: numShort(active.filter((p) => p.stock > 0 && p.stock <= LOW_STOCK_LIMIT).length), icon: 'warning', ...SM_TINT.orange },
    { title: 'Out Of Stock', value: numShort(active.filter((p) => p.stock === 0).length), icon: 'close-circle', ...SM_TINT.red },
    { title: 'Inactive', value: numShort(all.filter((p) => p.status === 'Inactive').length), icon: 'pause-circle', ...SM_TINT.slate },
  ];
  const alerts = active.filter((p) => p.stock <= LOW_STOCK_LIMIT).sort((a, b) => a.stock - b.stock);

  const header = (
    <View className="gap-2.5 mb-0.5">
      <Text className="text-[11.5px] text-muted -mb-1">Monitor and manage your inventory</Text>
      <SMStatGrid stats={stats} cols={3} />
      <SMCard>
        <SMCardHead title="Inventory Alerts" right={<Badge label={`${alerts.length} Critical Items`} tone="red" />} />
        {alerts.length ? alerts.slice(0, 5).map((p) => (
          <View key={p.id} className="flex-row items-center gap-2 py-1.5 border-t border-line">
            <View className="flex-1"><Text className="font-semibold text-ink text-[13px]" numberOfLines={1}>{p.name}</Text><Text className="text-[11px] text-muted">Remaining Stock: {p.stock}</Text></View>
            <StockBadge status={stockStatus(p.stock)} />
          </View>
        )) : <Text className="text-[12px] text-muted">Nothing is running low.</Text>}
        {alerts.length > 5 && <Text className="text-[11px] text-muted mt-1">+{alerts.length - 5} more - find them in the list below</Text>}
      </SMCard>
      <SMCard>
        <SMCardHead title="Top Low Stock Items" right={<Text className="text-[12px] font-semibold text-primary">Reorder Soon</Text>} />
        {alerts.length ? alerts.slice(0, 5).map((p) => (
          <View key={p.id} className="flex-row items-center gap-2 py-1.5 border-t border-line">
            <View className="flex-1"><Text className="font-semibold text-ink text-[13px]" numberOfLines={1}>{p.name}</Text><Text className="text-[11px] text-muted">Current Stock</Text></View>
            <View className="w-9 h-9 rounded-xl bg-red-100 items-center justify-center"><Text className="font-bold text-red-600">{numShort(p.stock)}</Text></View>
          </View>
        )) : <Text className="text-[12px] text-muted">No low stock items.</Text>}
      </SMCard>
      <View className="flex-row items-center justify-between"><Text className="text-[15px] font-extrabold text-ink">Inventory Items</Text><Text className="text-[11.5px] text-muted">{list.length} Items</Text></View>
      <View className="flex-row gap-2">
        <View className="flex-[1.6]"><SearchBar value={search} onChangeText={setSearch} placeholder="Search by product or category..." /></View>
        <View className="flex-1"><CustomDropdown value={filter} onChange={setFilter} options={FILTERS} searchable={false} title="Filter" placeholder="All" /></View>
      </View>
    </View>
  );

  return (
    <View className="flex-1 bg-cream">
      <FlatList
        data={page.items} keyExtractor={(p) => p.id} contentContainerClassName={SM_PAD}
        ListHeaderComponent={header}
        refreshControl={<RefreshControl refreshing={q.refreshing} onRefresh={q.reload} tintColor={colors.primary} />}
        onEndReached={page.loadMore} onEndReachedThreshold={0.4}
        ListEmptyComponent={<Empty emoji="📦" title="No inventory found" body="Try changing the search or filter." />}
        ListFooterComponent={list.length ? <LoadMoreFooter hasMore={page.hasMore} total={page.total} noun="items" /> : undefined}
        renderItem={({ item: p }) => (
          <View className="flex-row items-center gap-2.5 bg-white rounded-2xl border border-line p-2.5">
            <Avatar image={p.images[0]} emoji={p.itemType === 'pet' ? '🐾' : '📦'} size={44} square />
            <View className="flex-1 gap-0.5">
              <Text className="font-bold text-ink text-[13.5px]" numberOfLines={1}>{p.name}</Text>
              <Text className="text-[11px] text-muted" numberOfLines={1}>{p.categoryName || 'No category'} · Stock {numShort(p.stock)}</Text>
              <View className="flex-row gap-1.5"><Badge label={p.status === 'Active' ? 'Active' : 'Inactive'} tone={p.status === 'Active' ? 'green' : 'slate'} /><StockBadge status={stockStatus(p.stock)} /></View>
            </View>
            <Pressable onPress={() => open(p)} accessibilityRole="button" accessibilityLabel={`Update stock for ${p.name}`} className="flex-row items-center gap-1 px-2.5 py-1.5 rounded-lg bg-orange-100 active:opacity-70">
              <Ionicons name="create-outline" size={13} color="#EA580C" /><Text className="text-orange-600 font-bold text-[12px]">Update</Text>
            </Pressable>
          </View>
        )}
      />

      <BottomSheet visible={!!edit} onClose={() => setEdit(null)} title="Update Inventory"
        footer={<Button disabled={saving} title={saving ? 'Saving...' : 'Save Changes'} onPress={save} />}>
        <View className="bg-white rounded-2xl border border-line p-3 gap-2.5">
          <View><Text className="text-[12px] font-semibold text-muted mb-1">Product</Text><Text className="font-bold text-ink">{edit?.name}</Text></View>
          <View>
            <Text className="text-[12px] font-semibold text-muted mb-1">Current Stock</Text>
            <TextInput value={stock} onChangeText={(v) => setStock(v.replace(/[^\d]/g, ''))} keyboardType="number-pad" selectTextOnFocus className="border border-orange-200 rounded-xl px-3 py-2.5 text-ink text-[16px]" />
          </View>
          <View><Text className="text-[12px] font-semibold text-muted mb-1">Availability</Text><CustomDropdown value={avail} onChange={setAvail} options={AVAIL} searchable={false} title="Availability" /></View>
        </View>
      </BottomSheet>
    </View>
  );
}

import React, { useMemo, useState } from 'react';
import { FlatList, Pressable, RefreshControl, ScrollView, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme';
import { Button, Empty, cn } from '../../components/ui';
import { Avatar } from '../../components/Avatar';
import { WishlistSkeleton } from '../../components/Skeletons';
import { toast } from '../../components/WonPetsAlert';
import SearchBar from '../../components/common/SearchBar';
import BottomSheet from '../../components/common/BottomSheet';
import LoadMoreFooter from '../../components/LoadMoreFooter';
import { TONES, DTone } from '../../components/doctor/DoctorUI';
import { Badge, LoadError, StockBadge, SwitchRow } from '../../components/storeManager/SMUI';
import { useRemote } from '../../hooks/useRemote';
import { useInfiniteSlice } from '../../hooks/useInfiniteSlice';
import { errorMessage } from '../../services/api';
import { LOW_STOCK_LIMIT, SMProduct, smService, stockStatus } from '../../services/storeManager.service';
import { useStoreManager } from '../../context/StoreManagerContext';

type Icon = keyof typeof Ionicons.glyphMap;
type Filter = 'attention' | 'Low Stock' | 'Out Of Stock' | 'Inactive' | 'all';
const FILTERS: { key: Filter; label: string }[] = [
  { key: 'attention', label: 'Needs attention' }, { key: 'Low Stock', label: 'Low stock' }, { key: 'Out Of Stock', label: 'Out of stock' },
  { key: 'Inactive', label: 'Inactive' }, { key: 'all', label: 'All items' },
];

/** Inventory (web InventoryPage): stock alerts and a quick stock / availability editor. */
export default function SMInventoryScreen({ navigation }: any) {
  const { tick, syncNow } = useStoreManager();
  const q = useRemote(() => smService.products(), [], tick);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<Filter>('attention');
  const [edit, setEdit] = useState<SMProduct | null>(null);
  const [stock, setStock] = useState('');
  const [active, setActive] = useState(true);
  const [saving, setSaving] = useState(false);

  const all = q.data ?? [];
  const list = useMemo(() => {
    const k = search.trim().toLowerCase();
    return all.filter((p) => {
      const st = stockStatus(p.stock);
      const ok = filter === 'all' ? true
        : filter === 'attention' ? p.status === 'Inactive' || st !== 'In Stock'
          : filter === 'Inactive' ? p.status === 'Inactive' : st === filter;
      return ok && (!k || `${p.name} ${p.categoryName} ${p.itemType} ${p.description}`.toLowerCase().includes(k));
    }).sort((a, b) => a.stock - b.stock);
  }, [all, search, filter]);
  const page = useInfiniteSlice(list, 12, `${search}|${filter}`);

  const open = (p: SMProduct) => { setEdit(p); setStock(String(p.stock)); setActive(p.status === 'Active'); };
  const bump = (n: number) => setStock((s) => String(Math.max(0, (Number(s) || 0) + n)));
  const save = async () => {
    if (!edit) return;
    if (stock === '') return toast.error('Stock is required');
    const n = Number(stock);
    if (!(n >= 0)) return toast.error('Stock cannot be negative');
    setSaving(true);
    try {
      const res = await smService.updateStock(edit.id, n, active ? 'Active' : 'Inactive');
      toast.success(res.message || 'Inventory updated');
      q.setData((l) => l?.map((x) => (x.id === edit.id ? { ...x, stock: n, status: active ? 'Active' : 'Inactive' } : x)));
      setEdit(null);
      syncNow();
    } catch (e) { toast.error(errorMessage(e, 'Failed to update inventory')); } finally { setSaving(false); }
  };

  if (q.loading && !q.data) return <WishlistSkeleton />;
  if (q.error && !q.data) return <LoadError message={q.error} onRetry={q.reload} />;

  const activeItems = all.filter((p) => p.status === 'Active');
  const stats: { label: string; value: number; icon: Icon; tone: DTone; f: Filter }[] = [
    { label: 'Total', value: all.length, icon: 'cube', tone: 'blue', f: 'all' },
    { label: 'In stock', value: activeItems.filter((p) => p.stock > LOW_STOCK_LIMIT).length, icon: 'checkmark-circle', tone: 'green', f: 'all' },
    { label: 'Low stock', value: activeItems.filter((p) => p.stock > 0 && p.stock <= LOW_STOCK_LIMIT).length, icon: 'warning', tone: 'orange', f: 'Low Stock' },
    { label: 'Out of stock', value: activeItems.filter((p) => p.stock === 0).length, icon: 'close-circle', tone: 'red', f: 'Out Of Stock' },
    { label: 'Inactive', value: all.filter((p) => p.status === 'Inactive').length, icon: 'pause-circle', tone: 'purple', f: 'Inactive' },
  ];
  const critical = activeItems.filter((p) => p.stock <= LOW_STOCK_LIMIT).sort((a, b) => a.stock - b.stock);

  const header = (
    <View className="gap-3.5 mb-1">
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="gap-2.5 pr-2">
        {stats.map((s) => (
          <Pressable key={s.label} onPress={() => setFilter(s.f)} className="w-[104px] bg-white rounded-2xl border border-orange-100 p-3 active:bg-orange-50">
            <View className={cn('w-9 h-9 rounded-xl items-center justify-center mb-1.5', TONES[s.tone].soft)}><Ionicons name={s.icon} size={17} color={TONES[s.tone].fg} /></View>
            <Text className="text-[20px] font-black text-slate-800">{s.value}</Text>
            <Text className="text-[11px] text-slate-500">{s.label}</Text>
          </Pressable>
        ))}
      </ScrollView>

      {critical.length > 0 && (
        <View className="bg-white rounded-3xl border border-red-100 p-3.5">
          <View className="flex-row items-center gap-2 mb-2.5">
            <Ionicons name="alert-circle" size={18} color={colors.red} />
            <Text className="flex-1 font-extrabold text-ink">Reorder soon</Text>
            <Badge label={`${critical.length} critical`} tone="red" />
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="gap-2.5">
            {critical.slice(0, 8).map((p) => (
              <Pressable key={p.id} onPress={() => open(p)} className="w-[132px] rounded-2xl border border-slate-100 p-2.5 active:bg-orange-50">
                <View className="flex-row items-center justify-between">
                  <Avatar image={p.images[0]} emoji={p.itemType === 'pet' ? '🐾' : '📦'} size={34} square />
                  <View className={cn('min-w-[34px] h-[34px] px-1 rounded-xl items-center justify-center', p.stock === 0 ? 'bg-red-100' : 'bg-orange-100')}>
                    <Text className={cn('font-black', p.stock === 0 ? 'text-red-600' : 'text-orange-600')}>{p.stock}</Text>
                  </View>
                </View>
                <Text className="text-[12px] font-semibold text-slate-700 mt-1.5" numberOfLines={2}>{p.name}</Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      )}

      <SearchBar value={search} onChangeText={setSearch} placeholder="Search by product or category…" />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="gap-2 pr-4">
        {FILTERS.map((f) => (
          <Pressable key={f.key} onPress={() => setFilter(f.key)} className={cn('px-3.5 py-2 rounded-full border', filter === f.key ? 'bg-ink border-ink' : 'bg-white border-line')}>
            <Text className={cn('font-bold text-[13px]', filter === f.key ? 'text-white' : 'text-ink')}>{f.label}</Text>
          </Pressable>
        ))}
      </ScrollView>
      <Text className="text-xs text-muted">{list.length} item{list.length === 1 ? '' : 's'} · lowest stock first</Text>
    </View>
  );

  return (
    <View className="flex-1 bg-cream">
      <FlatList
        data={page.items} keyExtractor={(p) => p.id} contentContainerClassName="p-4 gap-2.5 pb-10"
        ListHeaderComponent={header}
        refreshControl={<RefreshControl refreshing={q.refreshing} onRefresh={q.reload} tintColor={colors.primary} />}
        onEndReached={page.loadMore} onEndReachedThreshold={0.4}
        ListEmptyComponent={<Empty emoji={filter === 'attention' ? '✅' : '📦'} title={filter === 'attention' ? 'All stocked up' : 'No inventory found'} body={filter === 'attention' ? 'Nothing is low, out of stock or hidden.' : 'Try changing the search or filter.'} />}
        ListFooterComponent={list.length ? <LoadMoreFooter hasMore={page.hasMore} total={page.total} noun="items" /> : undefined}
        renderItem={({ item: p }) => (
          <View className="flex-row items-center gap-3 bg-white rounded-2xl border border-orange-100 p-3">
            <Avatar image={p.images[0]} emoji={p.itemType === 'pet' ? '🐾' : '📦'} size={52} square />
            <View className="flex-1 gap-1">
              <Text className="font-bold text-slate-800" numberOfLines={1}>{p.name}</Text>
              <Text className="text-[11px] text-slate-500" numberOfLines={1}>{p.categoryName || 'Uncategorised'} · {p.itemType === 'pet' ? 'Pet' : 'Product'}</Text>
              <View className="flex-row gap-1.5">
                <StockBadge status={stockStatus(p.stock)} />
                {p.status === 'Inactive' && <Badge label="Inactive" tone="slate" />}
              </View>
            </View>
            <View className="items-center gap-1.5">
              <Text className="text-[18px] font-black text-slate-800">{p.stock}</Text>
              <Pressable onPress={() => open(p)} accessibilityRole="button" accessibilityLabel={`Update stock for ${p.name}`} className="flex-row items-center gap-1 px-2.5 py-1.5 rounded-lg bg-orange-100 active:opacity-70">
                <Ionicons name="create-outline" size={13} color="#EA580C" /><Text className="text-orange-600 font-bold text-[12px]">Update</Text>
              </Pressable>
            </View>
          </View>
        )}
      />

      <BottomSheet visible={!!edit} onClose={() => setEdit(null)} title="Update Inventory" subtitle={edit?.name}
        footer={<Button disabled={saving} title={saving ? 'Saving…' : 'Save'} onPress={save} />}>
        <View className="bg-white rounded-3xl border border-line p-4 items-center gap-3">
          <Text className="text-xs text-muted">Units in stock</Text>
          <View className="flex-row items-center gap-3">
            <Pressable onPress={() => bump(-1)} accessibilityLabel="Decrease" className="w-12 h-12 rounded-2xl bg-orange-100 items-center justify-center active:opacity-70"><Ionicons name="remove" size={22} color="#EA580C" /></Pressable>
            <TextInput value={stock} onChangeText={(v) => setStock(v.replace(/[^\d]/g, ''))} keyboardType="number-pad" selectTextOnFocus
              className="w-28 text-center text-[32px] font-black text-ink border-b-2 border-orange-200 py-1" />
            <Pressable onPress={() => bump(1)} accessibilityLabel="Increase" className="w-12 h-12 rounded-2xl bg-orange-100 items-center justify-center active:opacity-70"><Ionicons name="add" size={22} color="#EA580C" /></Pressable>
          </View>
          <View className="flex-row gap-2">
            {[10, 25, 50, 100].map((n) => (
              <Pressable key={n} onPress={() => bump(n)} className="px-3 py-1.5 rounded-full bg-cream border border-line active:bg-primary-soft"><Text className="font-bold text-ink text-[12.5px]">+{n}</Text></Pressable>
            ))}
          </View>
          {stock !== '' && <StockBadge status={stockStatus(Number(stock))} />}
        </View>
        <SwitchRow title="Available for sale" hint={active ? 'Customers can see and buy it' : 'Hidden from the store'} value={active} onChange={setActive} />
        {!!edit && (
          <Pressable onPress={() => { const id = edit.id; setEdit(null); navigation.navigate('SMProductForm', { id }); }} className="flex-row items-center justify-center gap-1.5 py-2">
            <Ionicons name="create-outline" size={15} color={colors.primary} /><Text className="text-primary font-bold">Edit full product details</Text>
          </Pressable>
        )}
      </BottomSheet>
    </View>
  );
}

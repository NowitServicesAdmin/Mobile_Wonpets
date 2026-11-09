import React, { useMemo, useState } from 'react';
import { FlatList, Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme';
import { Empty, cn } from '../../components/ui';
import { Avatar, Photo } from '../../components/Avatar';
import { WishlistSkeleton } from '../../components/Skeletons';
import { WonPetsAlert, toast } from '../../components/WonPetsAlert';
import SearchBar from '../../components/common/SearchBar';
import FilterChips from '../../components/common/FilterChips';
import BottomSheet from '../../components/common/BottomSheet';
import InfoGrid from '../../components/common/InfoField';
import LoadMoreFooter from '../../components/LoadMoreFooter';
import { TONES, DTone } from '../../components/doctor/DoctorUI';
import { Badge, Fab, LoadError, RowAction, StockBadge, inr0 } from '../../components/storeManager/SMUI';
import { useRemote } from '../../hooks/useRemote';
import { useInfiniteSlice } from '../../hooks/useInfiniteSlice';
import { errorMessage } from '../../services/api';
import { SMProduct, smService, stockStatus } from '../../services/storeManager.service';
import { useStoreManager } from '../../context/StoreManagerContext';

type Icon = keyof typeof Ionicons.glyphMap;
type Sort = 'newest' | 'name-asc' | 'name-desc' | 'price-asc' | 'price-desc' | 'stock-asc' | 'stock-desc';
const SORTS: { key: Sort; label: string; icon: Icon }[] = [
  { key: 'newest', label: 'Newest first', icon: 'time-outline' },
  { key: 'name-asc', label: 'Name A → Z', icon: 'text-outline' },
  { key: 'name-desc', label: 'Name Z → A', icon: 'text-outline' },
  { key: 'price-asc', label: 'Price low → high', icon: 'arrow-up' },
  { key: 'price-desc', label: 'Price high → low', icon: 'arrow-down' },
  { key: 'stock-asc', label: 'Stock low → high', icon: 'arrow-up' },
  { key: 'stock-desc', label: 'Stock high → low', icon: 'arrow-down' },
];
const FILTERS = [
  { key: 'product', label: 'Products', color: '#2563EB', soft: '#DBEAFE' },
  { key: 'pet', label: 'Pets', color: '#B45309', soft: '#FEF3C7' },
  { key: 'Low Stock', label: 'Low stock', color: '#EA580C', soft: '#FFEDD5' },
  { key: 'Out Of Stock', label: 'Out of stock', color: '#DC2626', soft: '#FEE2E2' },
  { key: 'Inactive', label: 'Inactive', color: '#475569', soft: '#F1F5F9' },
];

/** Every product and pet listing in the store. Open with { category, categoryName } to show one category. */
export default function SMProductsScreen({ navigation, route }: any) {
  const { tick } = useStoreManager();
  const q = useRemote(() => smService.products(), [], tick);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<string[]>([]);
  const [sort, setSort] = useState<Sort>('newest');
  const [sortOpen, setSortOpen] = useState(false);
  const [view, setView] = useState<SMProduct | null>(null);
  const [category, setCategory] = useState<{ id: string; name: string } | null>(route.params?.category ? { id: route.params.category, name: route.params.categoryName || 'Category' } : null);

  const all = q.data ?? [];
  const list = useMemo(() => {
    const k = search.trim().toLowerCase();
    const types = filter.filter((f) => f === 'product' || f === 'pet');
    const states = filter.filter((f) => f !== 'product' && f !== 'pet');
    const out = all.filter((p) =>
      (!category || p.categoryId === category.id) &&
      (!types.length || types.includes(p.itemType)) &&
      (!states.length || states.some((s) => (s === 'Inactive' ? p.status === 'Inactive' : stockStatus(p.stock) === s))) &&
      (!k || `${p.name} ${p.categoryName} ${p.breed} ${p.productId ?? ''}`.toLowerCase().includes(k)));
    const by: Record<Sort, (a: SMProduct, b: SMProduct) => number> = {
      newest: (a, b) => (b.createdAt ?? '').localeCompare(a.createdAt ?? ''),
      'name-asc': (a, b) => a.name.localeCompare(b.name), 'name-desc': (a, b) => b.name.localeCompare(a.name),
      'price-asc': (a, b) => a.finalPrice - b.finalPrice, 'price-desc': (a, b) => b.finalPrice - a.finalPrice,
      'stock-asc': (a, b) => a.stock - b.stock, 'stock-desc': (a, b) => b.stock - a.stock,
    };
    return [...out].sort(by[sort]);
  }, [all, search, filter, sort, category]);
  const page = useInfiniteSlice(list, 10, `${search}|${filter.join()}|${sort}|${category?.id}`);

  const remove = async (p: SMProduct) => {
    const r = await WonPetsAlert.delete('Delete product?', `"${p.name}" will be removed from your store.`, { confirmText: 'Yes, delete' });
    if (!r.isConfirmed) return;
    try {
      const res = await smService.deleteProduct(p.id);
      toast.success(res.message || 'Product deleted');
      setView(null);
      q.setData((l) => l?.filter((x) => x.id !== p.id));
      q.reloadQuiet();
    } catch (e) { toast.error(errorMessage(e, 'Delete failed')); }
  };
  const edit = (p: SMProduct) => { setView(null); navigation.navigate('SMProductForm', { id: p.id }); };

  if (q.loading && !q.data) return <WishlistSkeleton />;
  if (q.error && !q.data) return <LoadError message={q.error} onRetry={q.reload} />;

  const stats: { label: string; value: number; icon: Icon; tone: DTone }[] = [
    { label: 'Total', value: all.length, icon: 'cube', tone: 'purple' },
    { label: 'In stock', value: all.filter((p) => stockStatus(p.stock) === 'In Stock').length, icon: 'checkmark-circle', tone: 'green' },
    { label: 'Low stock', value: all.filter((p) => stockStatus(p.stock) === 'Low Stock').length, icon: 'warning', tone: 'orange' },
    { label: 'Out of stock', value: all.filter((p) => stockStatus(p.stock) === 'Out Of Stock').length, icon: 'close-circle', tone: 'red' },
    { label: 'Pets in store', value: all.filter((p) => p.itemType === 'pet' && p.status === 'Active').reduce((s, p) => s + p.stock, 0), icon: 'paw', tone: 'amber' },
  ];

  const header = (
    <View className="gap-3.5 mb-1">
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="gap-2.5 pr-2">
        {stats.map((s) => (
          <View key={s.label} className="w-[104px] bg-white rounded-2xl border border-orange-100 p-3">
            <View className={cn('w-9 h-9 rounded-xl items-center justify-center mb-1.5', TONES[s.tone].soft)}><Ionicons name={s.icon} size={17} color={TONES[s.tone].fg} /></View>
            <Text className="text-[20px] font-black text-slate-800">{s.value}</Text>
            <Text className="text-[11px] text-slate-500" numberOfLines={1}>{s.label}</Text>
          </View>
        ))}
      </ScrollView>
      <SearchBar value={search} onChangeText={setSearch} placeholder="Search products, pets, breeds…" trailing={{ icon: 'swap-vertical', label: 'Sort', onPress: () => setSortOpen(true) }} />
      {!!category && (
        <Pressable onPress={() => setCategory(null)} className="self-start flex-row items-center gap-1.5 bg-orange-100 rounded-full pl-3 pr-2 py-1.5">
          <Ionicons name="grid" size={13} color="#EA580C" />
          <Text className="text-orange-700 font-bold text-[13px]">{category.name}</Text>
          <Ionicons name="close-circle" size={16} color="#EA580C" />
        </Pressable>
      )}
      <FilterChips options={FILTERS} active={filter} onChange={setFilter} allCount={all.length} />
      <Text className="text-xs text-muted">{list.length} result{list.length === 1 ? '' : 's'} · {SORTS.find((s) => s.key === sort)?.label}</Text>
    </View>
  );

  return (
    <View className="flex-1 bg-cream">
      <FlatList
        data={page.items} keyExtractor={(p) => p.id}
        contentContainerClassName="p-4 gap-3 pb-28"
        ListHeaderComponent={header}
        refreshControl={<RefreshControl refreshing={q.refreshing} onRefresh={q.reload} tintColor={colors.primary} />}
        onEndReached={page.loadMore} onEndReachedThreshold={0.4}
        ListEmptyComponent={<Empty emoji="📦" title={all.length ? 'No matching products' : 'No products yet'} body={all.length ? 'Try another search or filter.' : 'Tap "Add Product" to list your first item.'} />}
        ListFooterComponent={list.length ? <LoadMoreFooter hasMore={page.hasMore} total={page.total} noun="products" /> : undefined}
        renderItem={({ item: p }) => (
          <Pressable onPress={() => setView(p)} accessibilityRole="button" accessibilityLabel={p.name} className="flex-row gap-3 bg-white rounded-3xl border border-orange-100 p-3 active:bg-orange-50/40">
            <Avatar image={p.images[0]} emoji={p.itemType === 'pet' ? '🐾' : '📦'} size={76} square />
            <View className="flex-1 gap-1">
              <View className="flex-row items-center gap-1.5">
                <Text className="flex-1 font-extrabold text-slate-800" numberOfLines={1}>{p.name}</Text>
                {p.status === 'Inactive' && <Badge label="Inactive" tone="slate" />}
              </View>
              <Text className="text-[11px] text-slate-500" numberOfLines={1}>{p.itemType === 'pet' ? `🐾 Pet${p.breed ? ` · ${p.breed}` : ''}` : 'Product'} · {p.categoryName || 'Uncategorised'}</Text>
              <View className="flex-row items-center gap-1.5">
                <Text className="font-black text-green-600">{inr0(p.finalPrice)}</Text>
                {p.discount > 0 && <><Text className="text-[11px] text-slate-400 line-through">{inr0(p.price)}</Text><Badge label={`${p.discount}% OFF`} tone="green" /></>}
              </View>
              <View className="flex-row items-center gap-2">
                <StockBadge status={stockStatus(p.stock)} />
                <Text className="text-[11px] text-slate-500">{p.stock} units</Text>
                {p.reviews > 0 && <Text className="text-[11px] text-amber-600">★ {p.rating.toFixed(1)}</Text>}
              </View>
            </View>
            <View className="gap-1.5">
              <RowAction icon="create-outline" tone="blue" label={`Edit ${p.name}`} onPress={() => edit(p)} />
              <RowAction icon="trash-outline" tone="red" label={`Delete ${p.name}`} onPress={() => remove(p)} />
            </View>
          </Pressable>
        )}
      />
      <Fab label="Add Product" onPress={() => navigation.navigate('SMProductForm', category ? { category: category.id } : undefined)} />

      {/* sort */}
      <BottomSheet visible={sortOpen} onClose={() => setSortOpen(false)} title="Sort products">
        <View className="bg-white rounded-3xl border border-line overflow-hidden">
          {SORTS.map((s, i) => (
            <Pressable key={s.key} onPress={() => { setSort(s.key); setSortOpen(false); }} className={cn('flex-row items-center gap-3 px-4 py-3.5 active:bg-cream', i > 0 && 'border-t border-line')}>
              <Ionicons name={s.icon} size={18} color={sort === s.key ? colors.primary : colors.muted} />
              <Text className={cn('flex-1 text-[15px]', sort === s.key ? 'font-extrabold text-primary' : 'font-semibold text-ink')}>{s.label}</Text>
              {sort === s.key && <Ionicons name="checkmark-circle" size={20} color={colors.primary} />}
            </Pressable>
          ))}
        </View>
      </BottomSheet>

      {/* details */}
      <BottomSheet visible={!!view} onClose={() => setView(null)} title={view?.name ?? ''} subtitle={view?.productId ? `ID: ${view.productId}` : undefined}
        footer={view ? (
          <View className="flex-row gap-2.5">
            <Pressable onPress={() => remove(view)} className="flex-1 h-12 rounded-2xl bg-red-soft flex-row items-center justify-center gap-1.5"><Ionicons name="trash-outline" size={18} color={colors.red} /><Text className="text-red font-extrabold">Delete</Text></Pressable>
            <Pressable onPress={() => edit(view)} className="flex-[2] h-12 rounded-2xl bg-primary flex-row items-center justify-center gap-1.5"><Ionicons name="create-outline" size={18} color="#fff" /><Text className="text-white font-extrabold">Edit</Text></Pressable>
          </View>
        ) : undefined}>
        {!!view && (
          <>
            {view.images.length > 0 ? (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="gap-2.5">
                {view.images.map((u) => <View key={u} className="w-[150px] h-[150px] rounded-2xl overflow-hidden border border-line"><Photo uri={u} /></View>)}
              </ScrollView>
            ) : <View className="h-[120px] rounded-2xl overflow-hidden"><Photo emoji={view.itemType === 'pet' ? '🐾' : '📦'} /></View>}
            <View className="flex-row flex-wrap gap-2">
              <Badge label={view.itemType === 'pet' ? 'Pet' : 'Product'} tone={view.itemType === 'pet' ? 'amber' : 'blue'} />
              <Badge label={view.status} tone={view.status === 'Active' ? 'green' : 'slate'} />
              <StockBadge status={stockStatus(view.stock)} />
            </View>
            <View className="bg-white rounded-3xl border border-line p-4">
              <InfoGrid items={[
                ['Category', view.categoryName || 'Uncategorised'],
                ['Price', inr0(view.price)],
                ['Discount', view.discount ? `${view.discount}%` : '—'],
                ['Selling price', inr0(view.finalPrice)],
                ['Stock', `${view.stock} units`],
                ['Weight', view.weight ? `${view.weight} kg` : '—'],
                ['Rating', view.reviews ? `★ ${view.rating.toFixed(1)} (${view.reviews})` : 'No reviews'],
                ...(view.itemType === 'pet' ? ([['Breed', view.breed], ['Age', view.age], ['Gender', view.gender]] as [string, string][]) : []),
              ]} />
            </View>
            <View className="bg-white rounded-3xl border border-line p-4">
              <Text className="font-extrabold text-ink mb-1">Description</Text>
              <Text className="text-[13.5px] text-slate-600 leading-5">{view.description || 'No description added.'}</Text>
            </View>
          </>
        )}
      </BottomSheet>
    </View>
  );
}

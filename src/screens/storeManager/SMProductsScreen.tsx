import React, { useMemo, useState } from 'react';
import { FlatList, Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme';
import { Empty, cn } from '../../components/ui';
import { Avatar, Photo } from '../../components/Avatar';
import { WishlistSkeleton } from '../../components/Skeletons';
import { WonPetsAlert, toast } from '../../components/WonPetsAlert';
import SearchBar from '../../components/common/SearchBar';
import CustomDropdown from '../../components/CustomDropdown';
import BottomSheet from '../../components/common/BottomSheet';
import InfoGrid from '../../components/common/InfoField';
import LoadMoreFooter from '../../components/LoadMoreFooter';
import { Badge, LoadError, RowAction, SMStat, SMStatGrid, SM_PAD, SM_TINT, StockBadge, inr0, numShort } from '../../components/storeManager/SMUI';
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
const STATUS_OPTS = [{ value: '', label: 'All statuses' }, { value: 'Active', label: 'Active' }, { value: 'Inactive', label: 'Inactive' }];
const TYPE_OPTS = [{ value: '', label: 'All types' }, { value: 'product', label: 'Products' }, { value: 'pet', label: 'Pets' }];

/** Every product and pet listing in the store. Open with { category, categoryName } to show one category. */
export default function SMProductsScreen({ navigation, route }: any) {
  const { tick } = useStoreManager();
  const q = useRemote(async () => ({ products: await smService.products(), cats: await smService.categories().catch(() => []) }), [], tick);
  const [search, setSearch] = useState('');
  const [statusF, setStatusF] = useState('');
  const [typeF, setTypeF] = useState('');
  const [catF, setCatF] = useState('');
  const [sort, setSort] = useState<Sort>('newest');
  const [sortOpen, setSortOpen] = useState(false);
  const [view, setView] = useState<SMProduct | null>(null);
  const [category, setCategory] = useState<{ id: string; name: string } | null>(route.params?.category ? { id: route.params.category, name: route.params.categoryName || 'Category' } : null);

  const all = q.data?.products ?? [];
  const cats = q.data?.cats ?? [];
  const list = useMemo(() => {
    const k = search.trim().toLowerCase();
    const out = all.filter((p) =>
      (!category || p.categoryId === category.id) &&
      (!statusF || p.status === statusF) && (!typeF || p.itemType === typeF) && (!catF || p.categoryId === catF) &&
      (!k || `${p.name} ${p.categoryName} ${p.breed} ${p.productId ?? ''}`.toLowerCase().includes(k)));
    const by: Record<Sort, (a: SMProduct, b: SMProduct) => number> = {
      newest: (a, b) => (b.createdAt ?? '').localeCompare(a.createdAt ?? ''),
      'name-asc': (a, b) => a.name.localeCompare(b.name), 'name-desc': (a, b) => b.name.localeCompare(a.name),
      'price-asc': (a, b) => a.finalPrice - b.finalPrice, 'price-desc': (a, b) => b.finalPrice - a.finalPrice,
      'stock-asc': (a, b) => a.stock - b.stock, 'stock-desc': (a, b) => b.stock - a.stock,
    };
    return [...out].sort(by[sort]);
  }, [all, search, statusF, typeF, catF, sort, category]);
  const page = useInfiniteSlice(list, 10, `${search}|${statusF}|${typeF}|${catF}|${sort}|${category?.id}`);

  const remove = async (p: SMProduct) => {
    const r = await WonPetsAlert.delete('Delete product?', `"${p.name}" will be removed from your store.`, { confirmText: 'Yes, delete' });
    if (!r.isConfirmed) return;
    try {
      const res = await smService.deleteProduct(p.id);
      toast.success(res.message || 'Product deleted');
      setView(null);
      q.setData((l) => l && { ...l, products: l.products.filter((x) => x.id !== p.id) });
      q.reloadQuiet();
    } catch (e) { toast.error(errorMessage(e, 'Delete failed')); }
  };
  const edit = (p: SMProduct) => { setView(null); navigation.navigate('SMProductForm', { id: p.id }); };

  if (q.loading && !q.data) return <WishlistSkeleton />;
  if (q.error && !q.data) return <LoadError message={q.error} onRetry={q.reload} />;

  const stats: SMStat[] = [
    { title: 'Total Products', value: numShort(all.length), icon: 'cube', ...SM_TINT.purple },
    { title: 'Active', value: numShort(all.filter((p) => p.status === 'Active').length), icon: 'checkmark-circle', ...SM_TINT.green },
    { title: 'Low Stock', value: numShort(all.filter((p) => stockStatus(p.stock) === 'Low Stock').length), icon: 'warning', ...SM_TINT.orange },
    { title: 'Out Of Stock', value: numShort(all.filter((p) => stockStatus(p.stock) === 'Out Of Stock').length), icon: 'close-circle', ...SM_TINT.red },
    { title: 'Pets In Store', value: numShort(all.filter((p) => p.itemType === 'pet' && p.status === 'Active').reduce((n, p) => n + p.stock, 0)), icon: 'paw', ...SM_TINT.amber },
  ];
  const catOpts = [{ value: '', label: 'All categories' }, ...cats.map((c) => ({ value: c.id, label: c.name }))];

  const header = (
    <View className="gap-2.5 mb-0.5">
      <Text className="text-[11.5px] text-muted -mb-1">Manage your products and pets</Text>
      <SMStatGrid stats={stats} cols={3} />
      <View className="flex-row gap-2">
        <View className="flex-1"><CustomDropdown value={statusF} onChange={setStatusF} options={STATUS_OPTS} searchable={false} title="Status" placeholder="All statuses" /></View>
        <View className="flex-1"><CustomDropdown value={typeF} onChange={setTypeF} options={TYPE_OPTS} searchable={false} title="Type" placeholder="All types" /></View>
      </View>
      <CustomDropdown value={catF} onChange={setCatF} options={catOpts} title="Category" placeholder="All categories" />
      <SearchBar value={search} onChangeText={setSearch} placeholder="Search products..." trailing={{ icon: 'swap-vertical', label: 'Sort', onPress: () => setSortOpen(true) }} />
      {!!category && (
        <Pressable onPress={() => setCategory(null)} className="self-start flex-row items-center gap-1.5 bg-orange-100 rounded-full pl-3 pr-2 py-1">
          <Ionicons name="grid" size={13} color="#EA580C" />
          <Text className="text-orange-700 font-bold text-[13px]">{category.name}</Text>
          <Ionicons name="close-circle" size={16} color="#EA580C" />
        </Pressable>
      )}
      <View className="flex-row items-center justify-between">
        <Text className="text-[11.5px] text-muted">{numShort(list.length)} product{list.length === 1 ? '' : 's'} · {SORTS.find((x) => x.key === sort)?.label}</Text>
        <Pressable onPress={() => navigation.navigate('SMProductForm', category ? { category: category.id } : undefined)} accessibilityRole="button" accessibilityLabel="Add Product" className="flex-row items-center gap-1 bg-primary rounded-xl px-3 py-2 active:opacity-80">
          <Ionicons name="add" size={16} color="#fff" /><Text className="text-white font-extrabold text-[12.5px]">Add Product</Text>
        </Pressable>
      </View>
    </View>
  );

  return (
    <View className="flex-1 bg-cream">
      <FlatList
        data={page.items} keyExtractor={(p) => p.id}
        contentContainerClassName={SM_PAD}
        ListHeaderComponent={header}
        refreshControl={<RefreshControl refreshing={q.refreshing} onRefresh={q.reload} tintColor={colors.primary} />}
        onEndReached={page.loadMore} onEndReachedThreshold={0.4}
        ListEmptyComponent={<Empty emoji="📦" title={all.length ? 'No matching products' : 'No products yet'} body={all.length ? 'Try another search or filter.' : 'Tap "Add item" to list your first one.'} />}
        ListFooterComponent={list.length ? <LoadMoreFooter hasMore={page.hasMore} total={page.total} noun="products" /> : undefined}
        renderItem={({ item: p }) => (
          <Pressable onPress={() => setView(p)} accessibilityRole="button" accessibilityLabel={p.name} className="flex-row gap-2.5 bg-white rounded-2xl border border-line p-2.5 active:bg-primary-soft">
            <Avatar image={p.images[0]} emoji={p.itemType === 'pet' ? '🐾' : '📦'} size={64} square />
            <View className="flex-1 gap-1">
              <View className="flex-row items-center gap-1.5">
                <Text className="flex-1 font-extrabold text-ink" numberOfLines={1}>{p.name}</Text>
                {p.status === 'Inactive' && <Badge label="Inactive" tone="slate" />}
              </View>
              <Text className="text-[11px] text-muted" numberOfLines={1}>{p.itemType === 'pet' ? `🐾 Pet${p.breed ? ` · ${p.breed}` : ''}` : 'Product'} · {p.categoryName || 'Uncategorised'}</Text>
              <View className="flex-row items-center gap-1.5">
                <Text className="font-black text-green-600">{inr0(p.finalPrice)}</Text>
                {p.discount > 0 && <><Text className="text-[11px] text-muted line-through">{inr0(p.price)}</Text><Badge label={`${p.discount}% off`} tone="green" /></>}
              </View>
              <View className="flex-row items-center gap-2">
                <StockBadge status={stockStatus(p.stock)} />
                <Text className="text-[11px] text-muted">{numShort(p.stock)} pcs</Text>
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
              <Text className="text-[13.5px] text-muted leading-5">{view.description || 'No description added.'}</Text>
            </View>
          </>
        )}
      </BottomSheet>
    </View>
  );
}

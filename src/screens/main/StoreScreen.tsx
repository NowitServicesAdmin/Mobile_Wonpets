import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FlatList, Image, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme';
import { Empty, IconButton, T, cn } from '../../components/ui';
import { Product } from '../../data/mock';
import { CarouselSlide, Category, offersService, productsService } from '../../services/store.service';
import OfferCarousel, { OfferTarget } from '../../components/store/OfferCarousel';
import StoreFilterSheet, { StoreFilters, noStoreFilters, priceLabel, storeFilterCount } from '../../components/store/StoreFilterSheet';
import LoadMoreFooter from '../../components/LoadMoreFooter';
import { CategoryRowSkeleton, OfferCarouselSkeleton, ProductGridSkeleton } from '../../components/Skeletons';
import { errorMessage } from '../../services/api';
import { useCart } from '../../context/CartContext';
import { toast } from '../../components/WonPetsAlert';

export function ProductCard({ item, navigation }: { item: Product; navigation: any }) {
  const { wishlist, toggleWishlist, addToCart } = useCart();
  return (
    <Pressable className="flex-1 bg-white rounded-3xl p-2.5 mb-3 gap-[3px] border border-line shadow-md shadow-orange-800/10" onPress={() => navigation.navigate('ProductDetail', { id: item.id })}>
      <View className="h-[120px] rounded-2xl bg-[#FBF3EA] items-center justify-center mb-1.5">
        {item.image ? <Image source={{ uri: item.image }} className="w-full h-full rounded-2xl" resizeMode="cover" /> : <Text className="text-[56px]">{item.emoji}</Text>}
        {item.off > 0 && <View className="absolute top-1.5 left-1.5 bg-red rounded-full px-2 py-[3px]"><Text className="text-white text-[10px] font-extrabold">{item.off}% OFF</Text></View>}
        <Pressable className="absolute top-1.5 right-1.5 w-7 h-7 rounded-full bg-white items-center justify-center" onPress={() => toggleWishlist(item.id)}>
          <Ionicons name={wishlist.includes(item.id) ? 'heart' : 'heart-outline'} size={16} color={colors.red} />
        </Pressable>
        <View className="absolute bottom-1.5 left-1.5 bg-neutral-700 rounded-full px-2 py-[3px]"><Text className="text-white text-[10px] font-bold">{item.source}</Text></View>
      </View>
      <Text className="text-primary text-[10px] font-bold">{item.category.toUpperCase()}</Text>
      <Text className={T.h3} numberOfLines={1}>{item.name}</Text>
      <View className="flex-row items-baseline gap-1.5">
        <Text className="text-primary-dark text-[17px] font-black">₹{item.price.toLocaleString('en-IN')}</Text>
        {item.mrp > item.price && <Text className="text-muted text-xs line-through">₹{item.mrp.toLocaleString('en-IN')}</Text>}
      </View>
      <View className="flex-row items-center justify-between">
        <Text className={T.small}>⭐ {item.rating.toFixed(1)} ({item.reviews})</Text>
        <Pressable onPress={async () => { if (item.itemType === 'pet') return navigation.navigate('ProductDetail', { id: item.id }); if (await addToCart(item.id)) toast.success('Added to cart'); }} className="w-[34px] h-[34px] rounded-full border-[1.5px] border-primary items-center justify-center"><Ionicons name="cart-outline" size={18} color={colors.primary} /></Pressable>
      </View>
    </Pressable>
  );
}

const PAGE_SIZE = 12;

/** Icon for a category tile - picked from the name, so new categories added by the admin still get a sensible icon. */
const categoryIcon = (name: string): keyof typeof Ionicons.glyphMap => {
  const n = name.toLowerCase();
  if (/pet|dog|cat|bird|fish|reptile|aqua/.test(n)) return 'paw-outline';
  if (/food|treat|nutri/.test(n)) return 'fast-food-outline';
  if (/bed|sleep/.test(n)) return 'bed-outline';
  if (/groom|shampoo|bath/.test(n)) return 'cut-outline';
  if (/health|medic|care/.test(n)) return 'medkit-outline';
  if (/toy|play/.test(n)) return 'football-outline';
  if (/access|collar|leash/.test(n)) return 'ribbon-outline';
  return 'pricetag-outline';
};

export default function StoreScreen({ navigation, route }: any) {
  const { wishlist, cartCount } = useCart();
  const mode = 'Store' as 'Store' | 'ReSell'; // the ReSell pill opens the Resell marketplace screen instead of filtering

  // Coming from an offer banner: Store { storeManagerId, onOffer, category } (same params the web uses)
  const offerStore: string | undefined = route?.params?.storeManagerId;
  const offerOnly: boolean = !!offerStore && !!route?.params?.onOffer;
  const offerCategory: string | undefined = route?.params?.category;

  const [q, setQ] = useState('');
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState<StoreFilters>(noStoreFilters);
  const [sheet, setSheet] = useState(false);
  const [allCats, setAllCats] = useState<Category[]>([]);
  const [catsLoading, setCatsLoading] = useState(true);
  const [slides, setSlides] = useState<CarouselSlide[]>([]);
  const [slidesLoading, setSlidesLoading] = useState(true);
  const [items, setItems] = useState<Product[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [moreFailed, setMoreFailed] = useState(false);
  const [failed, setFailed] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const reqId = useRef(0);
  const listRef = useRef<FlatList<Product>>(null);

  const mains = useMemo(() => allCats.filter((c) => !c.parent), [allCats]);
  const subs = useMemo(() => (filters.cat ? allCats.filter((c) => c.parent === filters.cat) : []), [allCats, filters.cat]);
  // a sub-category narrows its parent; otherwise the main category
  const categoryId = filters.sub || filters.cat || undefined;

  const loadMeta = useCallback(() => {
    setCatsLoading(true); setSlidesLoading(true);
    productsService.categories().then(setAllCats, () => {}).finally(() => setCatsLoading(false));
    offersService.carousel().then(setSlides, () => setSlides([])).finally(() => setSlidesLoading(false));
  }, []);
  useEffect(() => { loadMeta(); }, [loadMeta]);

  // wait for the user to stop typing before searching
  useEffect(() => { const t = setTimeout(() => setSearch(q.trim()), 400); return () => clearTimeout(t); }, [q]);

  // an offer can point at a main or a sub category - select it (and its parent) once categories are known
  useEffect(() => {
    if (!offerCategory || !allCats.length) return;
    const c = allCats.find((x) => x.id === offerCategory);
    if (!c) return;
    setFilters((f) => ({ ...f, cat: c.parent || c.id, sub: c.parent ? c.id : null }));
  }, [offerCategory, allCats]);

  // page 1 replaces the list (new search / filter); later pages are appended as the user scrolls
  const load = useCallback(async (p: number, append = false) => {
    const id = ++reqId.current;
    if (append) { setLoadingMore(true); setMoreFailed(false); }
    else { setLoading(true); setLoadingMore(false); setMoreFailed(false); setFailed(false); }
    try {
      const r = await productsService.list({
        page: p, limit: PAGE_SIZE, search, category: categoryId,
        maxPrice: filters.maxPrice || undefined, storeManagerId: offerStore, onOffer: offerOnly || filters.onSale,
      });
      if (id !== reqId.current) return; // a newer request replaced this one
      setItems((prev) => (append ? [...prev, ...r.items.filter((n) => !prev.some((x) => x.id === n.id))] : r.items));
      setPage(r.page); setTotalPages(r.totalPages); setTotal(r.total);
    } catch (e) {
      if (id !== reqId.current) return;
      if (append) { setMoreFailed(true); toast.error(errorMessage(e)); }
      else { setItems([]); setFailed(true); toast.error(errorMessage(e)); }
    } finally { if (id === reqId.current) { setLoading(false); setLoadingMore(false); } }
  }, [search, categoryId, filters.maxPrice, filters.onSale, offerStore, offerOnly]);
  // any change to search / filters starts again from page 1
  useEffect(() => { load(1); }, [load]);

  const hasMore = page < totalPages;
  const loadMore = useCallback(() => {
    if (loading || loadingMore || moreFailed || !hasMore) return;
    load(page + 1, true);
  }, [loading, loadingMore, moreFailed, hasMore, page, load]);

  const toTop = () => listRef.current?.scrollToOffset({ offset: 0, animated: true });
  const applyFilters = (f: StoreFilters) => { setFilters(f); toTop(); };
  const clearAll = () => { setFilters(noStoreFilters); setQ(''); if (offerStore) navigation.setParams({ storeManagerId: undefined, onOffer: undefined, category: undefined }); };

  const openOffer = (t: OfferTarget) => {
    if (t.kind === 'product') return navigation.navigate('ProductDetail', { id: t.id });
    if (t.kind === 'products') return navigation.navigate('OfferProducts', { ids: t.ids, title: t.title });
    // store / category: filter this screen (a plain store link just opens the store with that manager's products)
    setQ('');
    navigation.setParams({ storeManagerId: t.storeManagerId, onOffer: t.storeManagerId ? true : undefined, category: t.kind === 'category' ? t.category : undefined });
    if (t.kind !== 'category') setFilters(noStoreFilters);
    toTop();
  };

  const filterCount = storeFilterCount(filters);
  const hasAnything = filterCount > 0 || !!search || !!offerStore;
  const storeName = items[0]?.source;
  const activeCatName = allCats.find((c) => c.id === filters.cat)?.name;
  const heading = offerStore ? (offerOnly ? 'Products on Offer' : 'Store Products') : filters.sub ? allCats.find((c) => c.id === filters.sub)?.name : activeCatName ?? 'All Listings';

  return (
    <>
    <FlatList
      ref={listRef}
      className="flex-1 bg-cream"
      contentContainerClassName="p-4 pb-8"
      columnWrapperClassName="gap-3"
      numColumns={2}
      data={loading ? [] : items}
      keyExtractor={(p) => p.id}
      refreshing={refreshing}
      onRefresh={async () => { setRefreshing(true); loadMeta(); await load(1); setRefreshing(false); }}
      onEndReached={loadMore}
      onEndReachedThreshold={0.5}
      ListFooterComponent={loading || failed ? null : <LoadMoreFooter loading={loadingMore} hasMore={hasMore} failed={moreFailed} onRetry={loadMore} total={total} noun="items" />}
      ListEmptyComponent={
        loading ? <ProductGridSkeleton count={6} />
        : failed ? <Empty emoji="📡" title="Couldn't load the store" body="Check your connection and pull down to try again." />
        : <Empty emoji="🔍" title="Nothing found" body={hasAnything ? 'Try a different search, or clear the filters.' : 'There are no listings yet.'} />
      }
      ListHeaderComponent={
        <View className="gap-3.5 mb-3.5">
          <View className="flex-row items-center gap-2 bg-white border border-line rounded-3xl px-3.5">
            <Ionicons name="search-outline" size={18} color={colors.muted} />
            <TextInput value={q} onChangeText={setQ} placeholder="Search for pets, food, toys, grooming…" placeholderTextColor="#B8AEA5" className="flex-1 py-3" returnKeyType="search" />
            {!!q && <Pressable hitSlop={8} onPress={() => setQ('')} accessibilityLabel="Clear search"><Ionicons name="close-circle" size={17} color="#C9BFB5" /></Pressable>}
            <Pressable hitSlop={8} accessibilityLabel="Search by image" onPress={() => navigation.navigate('Search', { camera: true })}><Ionicons name="camera-outline" size={20} color={colors.primary} /></Pressable>
          </View>

          <View className="flex-row items-center gap-2.5">
            <View className="flex-row bg-amber-100 rounded-full p-1">
              {(['Store', 'ReSell'] as const).map((m) => (
                <Pressable key={m} onPress={() => (m === 'ReSell' ? navigation.navigate('Resell') : undefined)} className={cn('px-[18px] py-2 rounded-full', mode === m && 'bg-primary')}>
                  <Text className={cn('font-extrabold', mode === m ? 'text-white' : 'text-primary-dark')}>{m}</Text>
                </Pressable>
              ))}
            </View>
            <View className="flex-1" />
            <IconButton name="options-outline" badge={filterCount} onPress={() => setSheet(true)} />
            <IconButton name="clipboard-outline" onPress={() => navigation.navigate('Orders')} />
            <IconButton name="heart-outline" badge={wishlist.length} onPress={() => navigation.navigate('Wishlist')} />
            <IconButton name="cart-outline" badge={cartCount} onPress={() => navigation.navigate('Cart')} />
          </View>

          {slidesLoading ? <OfferCarouselSkeleton /> : <OfferCarousel slides={slides} onOpen={openOffer} />}

          {!!offerStore && (
            <View className="flex-row flex-wrap items-center justify-between gap-2 rounded-2xl border border-orange-200 bg-primary-soft px-4 py-3">
              <Text className="text-sm text-ink flex-shrink">Showing {offerOnly ? 'products on offer' : 'products'} from <Text className="font-bold text-primary-dark">{storeName || 'this store'}</Text></Text>
              <Pressable onPress={clearAll}><Text className="text-sm font-bold text-primary">View all</Text></Pressable>
            </View>
          )}

          <View className="flex-row items-center justify-between">
            <Text className={T.h2}>Shop by Category</Text>
            {filterCount > 0 && <Pressable hitSlop={8} onPress={() => setFilters(noStoreFilters)}><Text className="text-primary font-bold text-sm">Clear filters</Text></Pressable>}
          </View>
          {catsLoading ? <CategoryRowSkeleton /> : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="gap-2.5">
              <Pressable onPress={() => setFilters((f) => ({ ...f, cat: null, sub: null }))} className={cn('items-center gap-1.5 py-3.5 px-5 rounded-2xl border bg-white', !filters.cat ? 'border-primary bg-primary-soft' : 'border-line')}>
                <Ionicons name="grid-outline" size={22} color={colors.primary} />
                <Text className="font-semibold text-ink">All</Text>
              </Pressable>
              {mains.map((c) => (
                <Pressable key={c.id} onPress={() => setFilters((f) => ({ ...f, cat: f.cat === c.id ? null : c.id, sub: null }))} className={cn('items-center gap-1.5 py-3.5 px-5 rounded-2xl border bg-white', filters.cat === c.id ? 'border-primary bg-primary-soft' : 'border-line')}>
                  <Ionicons name={categoryIcon(c.name)} size={22} color={colors.primary} />
                  <Text className="font-semibold text-ink">{c.name}</Text>
                </Pressable>
              ))}
            </ScrollView>
          )}

          {subs.length > 0 && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="gap-2">
              {[{ id: '', name: 'All' } as Category, ...subs].map((c) => {
                const on = (filters.sub ?? '') === c.id;
                return (
                  <Pressable key={c.id || 'all'} onPress={() => setFilters((f) => ({ ...f, sub: c.id || null }))} className={cn('px-4 py-2 rounded-xl', on ? 'bg-primary' : 'bg-white border border-line')}>
                    <Text className={cn('text-sm font-semibold', on ? 'text-white' : 'text-ink')}>{c.name}</Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          )}

          {(filters.maxPrice > 0 || filters.onSale) && (
            <View className="flex-row flex-wrap gap-2">
              {filters.maxPrice > 0 && (
                <Pressable onPress={() => setFilters((f) => ({ ...f, maxPrice: 0 }))} className="flex-row items-center gap-1 bg-primary-soft rounded-full px-3 py-1.5"><Text className="text-xs font-bold text-primary-dark">{priceLabel(filters.maxPrice)}</Text><Ionicons name="close" size={13} color={colors.primaryDark} /></Pressable>
              )}
              {filters.onSale && (
                <Pressable onPress={() => setFilters((f) => ({ ...f, onSale: false }))} className="flex-row items-center gap-1 bg-primary-soft rounded-full px-3 py-1.5"><Text className="text-xs font-bold text-primary-dark">On sale</Text><Ionicons name="close" size={13} color={colors.primaryDark} /></Pressable>
              )}
            </View>
          )}

          <View className="flex-row items-baseline justify-between">
            <Text className={T.h2}>{heading}</Text>
            {!loading && !failed && <Text className={T.small}>{total} {total === 1 ? 'item' : 'items'}</Text>}
          </View>
        </View>
      }
      renderItem={({ item }) => <ProductCard item={item} navigation={navigation} />}
    />
    <StoreFilterSheet visible={sheet} value={filters} categories={allCats} onClose={() => setSheet(false)} onApply={applyFilters} />
    </>
  );
}
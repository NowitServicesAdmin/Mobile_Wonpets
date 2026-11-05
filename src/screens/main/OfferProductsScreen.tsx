import React, { useCallback, useEffect, useState } from 'react';
import { FlatList } from 'react-native';
import { Empty } from '../../components/ui';
import { ProductGridSkeleton } from '../../components/Skeletons';
import { Product } from '../../data/mock';
import { productsService } from '../../services/store.service';
import { ProductCard } from './StoreScreen';

/**
 * Opened from an offer banner that points at several hand-picked products
 * (e.g. Cat bed + Dog bed + Mouse cage). Shows exactly those products.
 * Params: { ids: string[], title?: string }
 */
export default function OfferProductsScreen({ route, navigation }: any) {
  const ids: string[] = route.params?.ids ?? [];
  const [items, setItems] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    // one request per product; a product that was removed simply drops out of the list
    const res = await Promise.allSettled(ids.map((id) => productsService.get(id)));
    setItems(res.flatMap((r) => (r.status === 'fulfilled' ? [r.value.product] : [])));
    setLoading(false);
  }, [ids.join(',')]);
  useEffect(() => { load(); }, [load]);

  return (
    <FlatList
      className="flex-1 bg-cream" contentContainerClassName="p-4 pb-8" columnWrapperClassName="gap-3" numColumns={2}
      data={loading ? [] : items} keyExtractor={(p) => p.id}
      refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false); }}
      ListEmptyComponent={loading ? <ProductGridSkeleton count={ids.length > 1 ? Math.min(ids.length, 6) : 2} /> : <Empty emoji="🛍️" title="These products are no longer available" body="The store may have removed them from this offer." />}
      renderItem={({ item }) => <ProductCard item={item} navigation={navigation} />}
    />
  );
}

import React from 'react';
import { FlatList } from 'react-native';
import { Empty } from '../../components/ui';
import { useCart } from '../../context/CartContext';
import { ProductCard } from './StoreScreen';
import { WishlistSkeleton } from '../../components/Skeletons';

export default function WishlistScreen({ navigation }: any) {
  const { wishlist, wishlistProducts, loaded } = useCart();
  const list = wishlistProducts.filter((p) => wishlist.includes(p.id));
  if (!loaded.wishlist) return <WishlistSkeleton />;
  return (
    <FlatList className="flex-1 bg-cream" contentContainerClassName="p-4 pb-8" columnWrapperClassName="gap-3" numColumns={2} data={list} keyExtractor={(p) => p.id}
      ListEmptyComponent={<Empty emoji="💔" title="No favourites yet" body="Tap the heart on any product to save it here." />}
      renderItem={({ item }) => <ProductCard item={item} navigation={navigation} />} />
  );
}

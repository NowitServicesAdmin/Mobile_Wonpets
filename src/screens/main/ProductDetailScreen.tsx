import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Image, Linking, Pressable, ScrollView, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme';
import { Button, Card, Chip, T, cn } from '../../components/ui';
import { toast, WonPetsAlert } from '../../components/WonPetsAlert';
import { Product } from '../../data/mock';
import ReviewsTab from '../../components/store/ReviewsTab';
import QuestionsTab from '../../components/store/QuestionsTab';
import { Stars } from '../../components/store/Stars';
import { useCart } from '../../context/CartContext';
import { productsService } from '../../services/store.service';
import { errorMessage } from '../../services/api';
import { ProductDetailSkeleton } from '../../components/Skeletons';
import PetContactSheet from '../../components/store/PetContactSheet';

const tabs = ['Specifications', 'Description', 'Reviews', 'Questions'] as const;

export default function ProductDetailScreen({ route, navigation }: any) {
  const [p, setP] = useState<Product | null>(null);
  const [related, setRelated] = useState<Product[]>([]);
  const [error, setError] = useState('');
  const { addToCart, wishlist, toggleWishlist, cartCount } = useCart();
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [contactOpen, setContactOpen] = useState(false);
  const [imgIdx, setImgIdx] = useState(0);
  const [tab, setTab] = useState<(typeof tabs)[number]>('Specifications');

  useEffect(() => {
    productsService.get(route.params.id).then((r) => { setP(r.product); setRelated(r.related); }, (e) => setError(errorMessage(e)));
  }, [route.params.id]);

  if (!p) return error ? <View className="flex-1 bg-cream items-center justify-center p-6"><Text className={T.body}>{error}</Text></View> : <ProductDetailSkeleton />;

  const isPet = p.itemType === 'pet';
  const img = p.images?.[imgIdx] ?? p.image;

  const add = async () => {
    if (busy) return;
    setBusy(true);
    if (await addToCart(p.id, qty)) { setAdded(true); toast.success('Added to cart'); }
    setBusy(false);
  };

  return (
    <ScrollView className="flex-1 bg-cream" contentContainerClassName="pb-10">
      <View className="h-[300px] bg-[#F7EEE4] items-center justify-center">
        {img ? <Image source={{ uri: img }} className="w-full h-full" resizeMode="contain" /> : <Text className="text-[120px]">{p.emoji}</Text>}
        {(p.images?.length ?? 0) > 1 && (
          <View className="absolute bottom-3 flex-row gap-2">
            {p.images!.map((u, i) => <Pressable key={u} onPress={() => setImgIdx(i)} className={cn('w-2.5 h-2.5 rounded-full', i === imgIdx ? 'bg-primary' : 'bg-white/80')} />)}
          </View>
        )}
      </View>
      <View className="p-4 gap-2.5">
        <View className="flex-row justify-between items-center">
          <Chip label={p.category} />
          <Pressable onPress={() => toggleWishlist(p.id)} className="w-10 h-10 rounded-xl bg-white border border-line items-center justify-center">
            <Ionicons name={wishlist.includes(p.id) ? 'heart' : 'heart-outline'} size={20} color={colors.red} />
          </Pressable>
        </View>
        <Text className={T.h1}>{p.name}</Text>
        <Pressable onPress={() => setTab('Reviews')} className="flex-row items-center gap-2 flex-wrap">
          {p.reviews > 0 ? <><Stars value={Math.round(p.rating * 2) / 2} size={14} /><Text className={T.body}>{p.rating.toFixed(1)} ({p.reviews} {p.reviews === 1 ? 'Review' : 'Reviews'})</Text></> : <Text className={T.body}>No reviews yet</Text>}
          <Text className={T.body}>· {p.source}</Text>
        </Pressable>
        <View className="flex-row items-baseline gap-2.5 bg-primary-soft rounded-2xl p-4">
          <Text className="text-[28px] font-black text-primary-dark">₹{p.price.toLocaleString('en-IN')}</Text>
          {p.mrp > p.price && <Text className="text-[15px] text-muted line-through">₹{p.mrp.toLocaleString('en-IN')}</Text>}
          {p.off > 0 && <Text className="text-green font-extrabold">{p.off}% OFF</Text>}
        </View>
        <Text className={cn('font-bold', p.stock > 0 ? 'text-green' : 'text-red')}>{p.stock > 0 ? (p.stock <= 10 ? `● Only ${p.stock} left` : '● In Stock') : '● Out of stock'}</Text>

        {isPet ? (
          <Button title="Contact the store to buy" icon={<Ionicons name="call-outline" size={18} color="#fff" />} onPress={() => setContactOpen(true)} />
        ) : (
          <>
            <Text className={T.h3}>Quantity</Text>
            <View className="flex-row items-center justify-between w-[130px] border-[1.5px] border-ink rounded-2xl px-3.5 py-2.5">
              <Pressable onPress={() => setQty(Math.max(1, qty - 1))}><Ionicons name="remove" size={20} color={colors.text} /></Pressable>
              <Text className="text-base font-extrabold">{qty}</Text>
              <Pressable onPress={() => setQty(Math.min(Math.max(p.stock, 1), qty + 1))}><Ionicons name="add" size={20} color={colors.text} /></Pressable>
            </View>
            <View className="flex-row gap-2.5">
              <Button title={busy ? 'Adding…' : 'Add To Cart'} disabled={busy || p.stock < 1} className="flex-1" onPress={add} />
              {added && <Button title={`Cart (${cartCount})`} variant="outline" className="flex-1" onPress={() => navigation.navigate('Cart')} />}
            </View>
          </>
        )}

        <Card className="mt-3">
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="gap-4 mb-3">
            {tabs.map((t) => (
              <Pressable key={t} onPress={() => setTab(t)}>
                <Text className={cn('font-bold pb-1.5', tab === t ? 'text-primary border-b-2 border-primary' : 'text-muted')}>{t}</Text>
              </Pressable>
            ))}
          </ScrollView>
          {tab === 'Specifications' && (
            <View className="gap-2.5">
              {[['Category', p.category], ['Item Type', p.itemType ?? 'product'], ...(p.breed ? [['Breed', p.breed]] : []), ['Stock', String(p.stock)], ['Status', p.stock > 0 ? 'In Stock' : 'Out of stock']].map(([k, v]) => (
                <View key={k} className="flex-row justify-between bg-cream rounded-2xl p-3"><Text className={T.body}>{k}</Text><Text className={T.h3}>{v}</Text></View>
              ))}
            </View>
          )}
          {tab === 'Description' && <Text className={T.body}>{p.description || 'No description provided.'}</Text>}
          {tab === 'Reviews' && <ReviewsTab productId={p.id} />}
          {tab === 'Questions' && <QuestionsTab productId={p.id} />}
        </Card>

        {related.length > 0 && (
          <View className="mt-3 gap-2">
            <Text className={T.h2}>You may also like</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="gap-3">
              {related.map((r) => (
                <Pressable key={r.id} onPress={() => navigation.push('ProductDetail', { id: r.id })} className="w-36 bg-white border border-line rounded-2xl p-2.5 gap-1">
                  <View className="h-24 rounded-xl bg-[#FBF3EA] items-center justify-center overflow-hidden">{r.image ? <Image source={{ uri: r.image }} className="w-full h-full" /> : <Text className="text-4xl">{r.emoji}</Text>}</View>
                  <Text className={T.h3} numberOfLines={1}>{r.name}</Text>
                  <Text className="text-primary-dark font-black">₹{r.price.toLocaleString('en-IN')}</Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        )}
      </View>
      {isPet && <PetContactSheet visible={contactOpen} productId={p.id} petName={p.name} onClose={() => setContactOpen(false)} />}
    </ScrollView>
  );
}

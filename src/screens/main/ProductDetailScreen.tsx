import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Image, Keyboard, Pressable, ScrollView, Share, Text, useWindowDimensions, View, type ScrollViewInstance } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../../theme';
import { Button, T, cn } from '../../components/ui';
import { toast } from '../../components/WonPetsAlert';
import { Product } from '../../data/mock';
import ReviewsTab from '../../components/store/ReviewsTab';
import QuestionsTab from '../../components/store/QuestionsTab';
import { Stars } from '../../components/store/Stars';
import { useCart } from '../../context/CartContext';
import { productsService } from '../../services/store.service';
import { errorMessage } from '../../services/api';
import { ProductDetailSkeleton } from '../../components/Skeletons';
import PetContactSheet from '../../components/store/PetContactSheet';
import { describeOffer } from '../../utils/orders';
import { Suggestion, useSuggestions } from '../../hooks/useSuggestions';
import SuggestionDropdown from '../../components/common/SuggestionDropdown';
import StoreHeader from '../../components/store/StoreHeader';

const tabs = ['Details', 'Description', 'Reviews', 'Q&A'] as const;
type Tab = (typeof tabs)[number];
const inr = (n: number) => `₹${n.toLocaleString('en-IN')}`;

/** Shared store header (back / cart, live store search with suggestions, deliver-to). Suggestions are store products only. */
function ProductHeader({ navigation, cartCount }: { navigation: any; cartCount: number }) {
  const [q, setQ] = useState('');
  const sg = useSuggestions(q, async (term): Promise<Suggestion[]> => {
    const r = await productsService.list({ page: 1, limit: 5, search: term });
    return r.items.map((x) => ({ id: x.id, title: x.name, subtitle: inr(x.price), image: x.image, emoji: x.emoji }));
  });
  const pick = (x: Suggestion) => { sg.hide(); Keyboard.dismiss(); setQ(''); navigation.push('ProductDetail', { id: x.id }); };
  // full results live on the Store tab
  const seeAll = () => { sg.hide(); Keyboard.dismiss(); const term = q.trim(); setQ(''); navigation.navigate('Main', { screen: 'Store', params: { q: term } }); };
  return (
    <StoreHeader
      navigation={navigation}
      onBack={() => navigation.goBack()}
      actions={[{ icon: 'cart-outline', label: 'Cart', onPress: () => navigation.navigate('Cart'), badge: cartCount }]}
      search={{ value: q, onChangeText: (t) => { setQ(t); sg.show(); }, onFocus: sg.show, onSubmit: seeAll }}
      suggestions={sg.visible ? <SuggestionDropdown label="Store" items={sg.items} loading={sg.loading} query={q} onPick={pick} onSeeAll={seeAll} /> : undefined}
    />
  );
}

export default function ProductDetailScreen({ route, navigation }: any) {
  const [p, setP] = useState<Product | null>(null);
  const [related, setRelated] = useState<Product[]>([]);
  const [error, setError] = useState('');
  const { addToCart, wishlist, toggleWishlist, cartCount, offers } = useCart();
  const [qty, setQty] = useState(1);
  const [busy, setBusy] = useState<'cart' | 'buy' | ''>('');
  const [contactOpen, setContactOpen] = useState(false);
  const [imgIdx, setImgIdx] = useState(0);
  const [tab, setTab] = useState<Tab>('Details');
  const { width } = useWindowDimensions();
  const { bottom } = useSafeAreaInsets();
  const scroller = useRef<ScrollViewInstance>(null);
  const tabsY = useRef(0);

  useEffect(() => {
    setP(null); setError(''); setQty(1); setImgIdx(0); setTab('Details');
    productsService.get(route.params.id).then((r) => { setP(r.product); setRelated(r.related); }, (e) => setError(errorMessage(e)));
  }, [route.params.id]);

  const bestOffer = useMemo(() => offers.find((o) => o.isBest) ?? offers[0], [offers]);

  const header = <ProductHeader navigation={navigation} cartCount={cartCount} />;
  if (!p) {
    return (
      <View className="flex-1 bg-cream">
        {header}
        {error ? <View className="flex-1 items-center justify-center p-6"><Text className={T.body}>{error}</Text></View> : <ProductDetailSkeleton />}
      </View>
    );
  }

  const isPet = p.itemType === 'pet';
  const inStock = p.stock > 0;
  const images = p.images?.length ? p.images : p.image ? [p.image] : [];
  const imgW = width - 32; // framed card with 16px margins
  const imgH = Math.min(250, Math.round(imgW * 0.62)); // short image keeps price + buttons on the first screen
  const liked = wishlist.includes(p.id);

  const openTab = (t: Tab) => {
    setTab(t);
    scroller.current?.scrollTo({ y: Math.max(tabsY.current - 4, 0), animated: true });
  };

  const add = async () => {
    if (busy) return;
    setBusy('cart');
    if (await addToCart(p.id, qty)) toast.success('Added to cart');
    setBusy('');
  };
  // Buy Now: put it in the cart, then go straight to checkout
  const buyNow = async () => {
    if (busy) return;
    setBusy('buy');
    const ok = await addToCart(p.id, qty);
    setBusy('');
    if (ok) navigation.navigate('Checkout');
  };
  const share = () => Share.share({ message: `${p.name} - ${inr(p.price)} on WonPets` }).catch(() => {});

  const rows: [string, string][] = [
    ['Brand', p.brand ?? p.source],
    ['Item Type', p.itemType === 'pet' ? 'Pet' : 'Product'],
    ['Category', p.category],
    ...(p.breed ? [['Breed', p.breed] as [string, string]] : []),
    ['Stock', String(p.stock)],
    ['Status', inStock ? 'In Stock' : 'Out of stock'],
  ];

  return (
    <View className="flex-1 bg-cream">
      {header}
      <ScrollView ref={scroller} className="flex-1" keyboardShouldPersistTaps="handled" contentContainerClassName="pb-6" showsVerticalScrollIndicator={false}>
        {/* title block */}
        <View className="px-4 pt-3 gap-1">
          <View className="flex-row items-center justify-between">
            <Text className="flex-1 text-[11px] font-extrabold tracking-widest text-muted uppercase" numberOfLines={1}>{p.brand ?? p.source}</Text>
            <Pressable onPress={() => openTab('Reviews')} className="flex-row items-center gap-1">
              {p.reviews > 0
                ? <><Text className="text-[13px] font-bold text-primary-dark">{p.rating.toFixed(1)}</Text><Stars value={Math.round(p.rating * 2) / 2} size={13} /><Text className="text-[13px] text-muted">({p.reviews} {p.reviews === 1 ? 'Review' : 'Reviews'})</Text></>
                : <Text className="text-[13px] text-muted">No reviews yet</Text>}
            </Pressable>
          </View>
          <Text className="text-[19px] font-black text-primary-dark leading-6" numberOfLines={2}>{p.name}</Text>
          {!!p.badge && <View className="self-start flex-row items-center bg-primary rounded-full px-3 py-1 mt-0.5"><Text className="text-white font-bold text-xs">{p.badge}</Text></View>}
        </View>

        {/* image: swipe to change, heart + share on top */}
        <View className="mx-4 mt-3 bg-white rounded-3xl border border-orange-100 overflow-hidden shadow-md shadow-orange-500/20" style={{ height: imgH }}>
          {images.length ? (
            <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false} onMomentumScrollEnd={(e) => setImgIdx(Math.round(e.nativeEvent.contentOffset.x / imgW))}>
              {images.map((u) => <Image key={u} source={{ uri: u }} style={{ width: imgW, height: imgH }} resizeMode="contain" />)}
            </ScrollView>
          ) : <View className="flex-1 items-center justify-center bg-[#F7EEE4]"><Text className="text-[96px]">{p.emoji}</Text></View>}
          <View className="absolute right-2.5 top-2.5 gap-2">
            <Pressable onPress={share} accessibilityLabel="Share" className="w-9 h-9 rounded-full bg-white border border-line items-center justify-center"><Ionicons name="share-social-outline" size={19} color={colors.text} /></Pressable>
            <Pressable onPress={() => toggleWishlist(p.id)} accessibilityLabel="Favourite" className="w-9 h-9 rounded-full bg-white border border-line items-center justify-center"><Ionicons name={liked ? 'heart' : 'heart-outline'} size={20} color={colors.red} /></Pressable>
          </View>
          {images.length > 1 && (
            <View className="absolute bottom-2 self-center flex-row gap-1.5">
              {images.map((u, i) => <View key={u} className={cn('h-2 rounded-full', i === imgIdx ? 'w-4 bg-primary' : 'w-2 bg-orange-200')} />)}
            </View>
          )}
        </View>

        {/* price, stock, seller */}
        <View className="px-4 pt-4 gap-0.5">
          <View className="flex-row items-end gap-2.5">
            {p.off > 0 && <Text className="text-[22px] font-light text-red">-{p.off}%</Text>}
            <Text className="text-[32px] font-black text-primary leading-9">{inr(p.price)}</Text>
            {p.mrp > p.price && <Text className="text-[13px] text-muted pb-1">M.R.P.: <Text className="line-through">{inr(p.mrp)}</Text></Text>}
          </View>
          <Text className="text-xs text-muted">Inclusive of all taxes</Text>
          <Text className={cn('font-bold mt-1', inStock ? 'text-green' : 'text-red')}>{inStock ? (p.stock <= 10 ? `Only ${p.stock} left in stock` : 'In stock') : 'Out of stock'}</Text>
          <Text className="text-[13px] text-muted">Sold by <Text className="font-bold text-primary-dark">{p.source}</Text></Text>
        </View>

        {/* offers (only when the store really has coupons) */}
        {!isPet && !!bestOffer && (
          <Pressable onPress={() => navigation.navigate('Cart')} className="mx-4 mt-3 flex-row items-center gap-3 bg-white border border-line rounded-2xl px-3.5 py-3 active:bg-primary-soft">
            <View className="w-9 h-9 rounded-full bg-primary-soft items-center justify-center"><Ionicons name="pricetag" size={16} color={colors.primary} /></View>
            <View className="flex-1">
              <Text className="font-extrabold text-ink">Available Offers</Text>
              <Text className="text-[13px] text-muted" numberOfLines={1}>{bestOffer.code} · {describeOffer(bestOffer)}</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.primary} />
          </Pressable>
        )}

        {/* trust strip */}
        <View className="flex-row mx-4 mt-3 py-2.5 border-y border-line">
          {([['shield-checkmark-outline', 'Genuine\nProducts'], ['ribbon-outline', 'Quality\nAssured'], ['lock-closed-outline', 'Secure\nPayments']] as const).map(([ic, label], i) => (
            <View key={ic} className={cn('flex-1 flex-row items-center justify-center gap-1.5', i > 0 && 'border-l border-line')}>
              <Ionicons name={ic} size={22} color={colors.primary} />
              <Text className="text-[12px] text-muted leading-4">{label}</Text>
            </View>
          ))}
        </View>

        {/* tabs */}
        <View className="mt-1" onLayout={(e) => { tabsY.current = e.nativeEvent.layout.y; }}>
          <View className="flex-row border-b border-line">
            {tabs.map((t) => {
              const label = t === 'Reviews' ? `Reviews (${p.reviews})` : t;
              return (
                <Pressable key={t} onPress={() => setTab(t)} className={cn('flex-1 items-center py-3 border-b-[3px]', tab === t ? 'border-primary' : 'border-transparent')}>
                  <Text className={cn('font-bold text-[13px]', tab === t ? 'text-primary' : 'text-muted')} numberOfLines={1}>{label}</Text>
                </Pressable>
              );
            })}
          </View>
          <View className="px-4 pt-3">
            {tab === 'Details' && (
              <View className="rounded-2xl overflow-hidden border border-line">
                {rows.map(([k, v], i) => (
                  <View key={k} className={cn('flex-row justify-between px-3.5 py-2.5', i % 2 === 0 ? 'bg-primary-soft' : 'bg-white')}>
                    <Text className={T.body}>{k}</Text>
                    <Text className={cn('font-bold text-ink', k === 'Status' && (inStock ? 'text-green' : 'text-red'))}>{v}</Text>
                  </View>
                ))}
              </View>
            )}
            {tab === 'Description' && <Text className={T.body}>{p.description || 'No description provided.'}</Text>}
            {tab === 'Reviews' && <ReviewsTab productId={p.id} />}
            {tab === 'Q&A' && <QuestionsTab productId={p.id} />}
          </View>
        </View>

        {related.length > 0 && (
          <View className="mt-5 gap-2">
            <Text className={cn(T.h2, 'px-4')}>You may also like</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="gap-3 px-4">
              {related.map((r) => (
                <Pressable key={r.id} onPress={() => navigation.push('ProductDetail', { id: r.id })} className="w-36 bg-white border border-orange-100 rounded-2xl p-2.5 gap-1 shadow-sm shadow-orange-500/20">
                  <View className="h-24 rounded-xl bg-primary-soft items-center justify-center overflow-hidden">{r.image ? <Image source={{ uri: r.image }} className="w-full h-full" resizeMode="contain" /> : <Text className="text-4xl">{r.emoji}</Text>}</View>
                  <Text className={T.h3} numberOfLines={1}>{r.name}</Text>
                  <Text className="text-primary-dark font-black">{inr(r.price)}</Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        )}
      </ScrollView>

      {/* pinned buy bar - always on screen, so nobody has to scroll to buy */}
      <View className="flex-row items-center gap-2.5 bg-white border-t border-line px-4 pt-3 shadow-lg shadow-orange-500/20" style={{ paddingBottom: Math.max(bottom, 12) }}>
        {isPet ? (
          <Button title="Contact the store to buy" className="flex-1" icon={<Ionicons name="call-outline" size={18} color="#fff" />} onPress={() => setContactOpen(true)} />
        ) : (
          <>
            <View className="flex-row items-center gap-2 border-[1.5px] border-line rounded-2xl px-2.5 h-[50px]">
              <Pressable hitSlop={6} disabled={qty <= 1} onPress={() => setQty(qty - 1)} accessibilityLabel="Decrease quantity"><Ionicons name="remove" size={20} color={qty <= 1 ? '#C9BFB5' : colors.primary} /></Pressable>
              <Text className="text-base font-extrabold w-10 text-center">{qty}</Text>
              <Pressable hitSlop={6} disabled={qty >= p.stock} onPress={() => setQty(Math.min(Math.max(p.stock, 1), qty + 1))} accessibilityLabel="Increase quantity"><Ionicons name="add" size={20} color={qty >= p.stock ? '#C9BFB5' : colors.primary} /></Pressable>
            </View>
            <Pressable disabled={!!busy || !inStock} onPress={add} className={cn('flex-1 h-[50px] flex-row items-center justify-center gap-1.5 rounded-2xl border-[1.5px] border-primary bg-primary-soft active:opacity-80', (!!busy || !inStock) && 'opacity-50')}>
              {busy === 'cart' ? <ActivityIndicator size="small" color={colors.primary} /> : <Ionicons name="cart-outline" size={18} color={colors.primary} />}
              <Text className="font-bold text-primary-dark" numberOfLines={1}>Add to Cart</Text>
            </Pressable>
            <Pressable disabled={!!busy || !inStock} onPress={buyNow} className={cn('flex-1 h-[50px] flex-row items-center justify-center gap-1.5 rounded-2xl bg-primary active:opacity-80', (!!busy || !inStock) && 'opacity-50')}>
              {busy === 'buy' ? <ActivityIndicator size="small" color="#fff" /> : <Ionicons name="flash" size={18} color="#fff" />}
              <Text className="font-bold text-white" numberOfLines={1}>Buy Now</Text>
            </Pressable>
          </>
        )}
      </View>

      {isPet && <PetContactSheet visible={contactOpen} productId={p.id} petName={p.name} onClose={() => setContactOpen(false)} />}
    </View>
  );
}
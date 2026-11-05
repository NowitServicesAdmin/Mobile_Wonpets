import React, { useEffect, useRef, useState } from 'react';
import { Image, Linking, Pressable, ScrollView, Share, Text, View, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../../theme';
import { Button, Empty, T, cn } from '../../components/ui';
import { HeartButton, ListingCard } from '../../components/resell/ListingBits';
import { WonPetsAlert, toast } from '../../components/WonPetsAlert';
import { timeAgo } from '../../data/resell';
import { useResell } from '../../context/ResellContext';
import { useChat } from '../../context/ChatContext';
import { inr } from '../../utils/orders';
import { ListingDetailSkeleton } from '../../components/Skeletons';

type IconName = React.ComponentProps<typeof Ionicons>['name'];
const Row = ({ k, v }: { k: string; v?: string | number }) => (v === undefined || v === '' ? null : <View className="flex-row justify-between items-center py-2.5 border-b border-line"><Text className={T.body}>{k}</Text><Text className="text-sm font-bold text-ink">{v}</Text></View>);
const Fact = ({ icon, label, value, box, color }: { icon: IconName; label: string; value: string; box: string; color: string }) => (
  <View className="flex-1 bg-white border border-line rounded-2xl p-3 gap-2 items-center">
    <View className={cn('w-9 h-9 rounded-xl items-center justify-center', box)}><Ionicons name={icon} size={17} color={color} /></View>
    <View className="items-center"><Text className="text-[10px] text-muted font-semibold">{label}</Text><Text className="text-[13px] font-extrabold text-ink" numberOfLines={1}>{value}</Text></View>
  </View>
);
const Block = ({ icon, title, children }: { icon: IconName; title: string; children: React.ReactNode }) => (
  <View className="bg-white rounded-3xl border border-line p-4 gap-2.5">
    <View className="flex-row items-center gap-2"><View className="w-7 h-7 rounded-lg bg-primary-soft items-center justify-center"><Ionicons name={icon} size={14} color={colors.primary} /></View><Text className={T.h2}>{title}</Text></View>
    {children}
  </View>
);

export default function ListingDetailScreen({ route, navigation }: any) {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { listings, addRecent, markSold, deleteListing, loadListing } = useResell();
  const { startConversation } = useChat();
  const l = listings.find((x) => x.id === route.params.id);
  const [page, setPage] = useState(0);
  const counted = useRef(false);
  const [chatting, setChatting] = useState(false);
  const [fetching, setFetching] = useState(true);
  // fetch the full listing (seller details, phone) - the list only has the basics
  useEffect(() => { setFetching(true); loadListing(route.params.id).finally(() => setFetching(false)); }, [route.params.id]);
  useEffect(() => { if (l && !counted.current && l.sellerId !== 'me') { counted.current = true; addRecent(l.id); } }, [l?.id]);
  if (!l && fetching) return <ListingDetailSkeleton />;
  if (!l) return <View className="flex-1 bg-cream justify-center"><Empty emoji="🔎" title="Listing not found" body="It may have been removed by the seller." /></View>;

  const seller = l.seller ?? { name: 'Seller', emoji: '🙂', phone: '', since: '' };
  const mine = l.sellerId === 'me';
  const sold = l.status === 'Sold';
  const slides = l.photos.length ? l.photos : [''];
  const off = l.originalPrice && l.originalPrice > l.price ? Math.round((1 - l.price / l.originalPrice) * 100) : 0;
  const similar = listings.filter((x) => x.id !== l.id && x.status === 'Available' && x.isActive && (x.category === l.category || x.listingType === l.listingType)).slice(0, 6);
  const fromSeller = l.seller?.listingsCount ?? listings.filter((x) => x.sellerId === l.sellerId && x.status === 'Available' && x.isActive).length;

  const chat = async () => {
    if (chatting || !l.sellerUserId) return;
    setChatting(true);
    const id = await startConversation('resell', l.sellerUserId, { id: l.id, title: l.title, price: l.price, emoji: l.emoji });
    setChatting(false);
    if (id) navigation.navigate('ChatThread', { conversationId: id });
  };
  const share = () => Share.share({ message: `${l.title} - ${inr(l.price)} on WONPET Resell\nhttps://wonpet.app/resell/${l.id}` });
  const onDelete = async () => {
    const r = await WonPetsAlert.delete('Delete this listing?', 'This action cannot be undone.', { confirmText: 'Yes, delete' });
    if (!r.isConfirmed) return;
    if (await deleteListing(l.id)) { navigation.goBack(); toast.success('Listing deleted'); }
  };
  const onSold = async () => {
    const r = await WonPetsAlert.confirm('Mark as sold?', 'Buyers will no longer be able to contact you about this listing.', { confirmText: 'Mark as sold' });
    if (r.isConfirmed && (await markSold(l.id))) toast.success('Listing marked as sold.');
  };

  const facts = [
    { icon: 'shield-checkmark' as IconName, label: 'Condition', value: l.condition, box: 'bg-green-soft', color: colors.green },
    ...(l.listingType === 'Pet'
      ? [
          ...(l.age ? [{ icon: 'hourglass' as IconName, label: 'Age', value: l.age, box: 'bg-purple-soft', color: colors.purple }] : []),
          ...(l.gender ? [{ icon: (l.gender === 'Male' ? 'male' : 'female') as IconName, label: 'Gender', value: l.gender, box: l.gender === 'Male' ? 'bg-blue-soft' : 'bg-pink-soft', color: l.gender === 'Male' ? colors.blue : colors.pink }] : []),
        ]
      : [{ icon: 'cube' as IconName, label: 'Quantity', value: String(l.quantity), box: 'bg-blue-soft', color: colors.blue }]),
  ].slice(0, 3);

  return (
    <View className="flex-1 bg-cream">
      <ScrollView contentContainerClassName="pb-36" showsVerticalScrollIndicator={false}>
        <View>
          <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false} onMomentumScrollEnd={(e) => setPage(Math.round(e.nativeEvent.contentOffset.x / width))}>
            {slides.map((u, i) => (
              <View key={i} style={{ width, height: 320 }} className="bg-[#FBF3EA] items-center justify-center">
                {u ? <Image source={{ uri: u }} style={{ width, height: 320 }} resizeMode="cover" /> : <Text className="text-[130px]">{l.emoji}</Text>}
              </View>
            ))}
          </ScrollView>
          <View className="absolute top-3 right-3 flex-row gap-2.5">
            <Pressable onPress={share} className="w-9 h-9 rounded-full bg-white/95 items-center justify-center shadow-sm"><Ionicons name="share-social-outline" size={17} color={colors.text} /></Pressable>
            <HeartButton id={l.id} size={36} />
          </View>
          {l.isFeatured && <View className="absolute top-3 left-3 bg-yellow rounded-full px-3 py-1 flex-row items-center gap-1"><Ionicons name="star" size={11} color="#fff" /><Text className="text-white text-xs font-extrabold">Featured</Text></View>}
          {slides.length > 1 && <View className="absolute bottom-10 right-3 bg-black/55 rounded-full px-2.5 py-1 flex-row items-center gap-1"><Ionicons name="images" size={11} color="#fff" /><Text className="text-white text-[11px] font-bold">{page + 1}/{slides.length}</Text></View>}
          {slides.length > 1 && <View className="absolute bottom-12 self-center flex-row gap-1.5">{slides.map((_, i) => <View key={i} className={cn('h-1.5 rounded-full', i === page ? 'w-5 bg-primary' : 'w-1.5 bg-white/80')} />)}</View>}
          {sold && <View className="absolute inset-0 bg-black/50 items-center justify-center"><Text className="text-white text-3xl font-black tracking-widest">SOLD</Text></View>}
        </View>

        <View className="px-4 -mt-8 gap-4">
          {/* Title + price */}
          <View className="bg-white rounded-[28px] border border-line p-5 gap-3">
            <View className="flex-row items-center justify-between gap-2">
              <View className="bg-primary-soft rounded-full px-2.5 py-1 flex-shrink"><Text className="text-primary-dark text-[10px] font-extrabold" numberOfLines={1}>{l.category.toUpperCase()}{l.breed ? ` · ${l.breed.toUpperCase()}` : ''}</Text></View>
              <View className="flex-row items-center gap-1"><Ionicons name="time-outline" size={12} color={colors.muted} /><Text className={T.small}>{timeAgo(l.createdAt)}</Text></View>
            </View>
            <Text className={T.h1}>{l.title}</Text>
            <View className="flex-row items-end gap-2.5">
              <Text className="text-[30px] leading-[34px] font-black text-primary-dark">{inr(l.price)}</Text>
              {off > 0 && <View className="flex-row items-center gap-2 pb-1"><Text className="text-muted line-through">{inr(l.originalPrice!)}</Text><View className="bg-green-soft rounded-md px-2 py-0.5"><Text className="text-green text-[11px] font-extrabold">{off}% OFF</Text></View></View>}
            </View>
            <View className="flex-row items-center gap-1.5 bg-cream rounded-xl px-3 py-2.5"><Ionicons name="location" size={15} color={colors.primary} /><Text className="text-[13px] text-ink flex-1">{l.location}</Text></View>
            <View className="flex-row bg-cream rounded-xl py-2.5">
              <View className="flex-1 flex-row items-center justify-center gap-1.5"><Ionicons name="eye-outline" size={14} color={colors.muted} /><Text className="text-xs font-bold text-ink">{l.views}</Text><Text className={T.small}>views</Text></View>
              <View className="w-px bg-line" />
              <View className="flex-1 flex-row items-center justify-center gap-1.5"><Ionicons name="heart-outline" size={14} color={colors.red} /><Text className="text-xs font-bold text-ink">{l.favouritesCount}</Text><Text className={T.small}>saved</Text></View>
            </View>
          </View>

          {/* Key facts */}
          <View className="flex-row gap-3">{facts.map((f) => <Fact key={f.label} {...f} />)}</View>

          <Block icon="document-text" title="About"><Text className="text-sm text-ink leading-6">{l.description}</Text></Block>

          <Block icon="list" title="Details">
            <View className="-mt-1">
              <Row k="Type" v={l.listingType} /><Row k="Category" v={l.category === 'Others' && l.customCategory ? l.customCategory : l.category} /><Row k="Breed" v={l.breed} /><Row k="Age" v={l.age} /><Row k="Gender" v={l.gender} /><Row k="Brand" v={l.brand} /><Row k="Condition" v={l.condition} />{l.listingType === 'Product' && <Row k="Quantity" v={l.quantity} />}<Row k="Status" v={l.status} />
            </View>
          </Block>

          {!mine && (
            <Block icon="person-circle" title="Seller information">
              <View className="flex-row items-center gap-3.5">
                <View className="w-14 h-14 rounded-full bg-primary-soft border-2 border-primary/20 items-center justify-center overflow-hidden">{seller.image ? <Image source={{ uri: seller.image }} className="w-14 h-14" /> : <Text className="text-3xl">{seller.emoji}</Text>}</View>
                <View className="flex-1 gap-0.5">
                  <View className="flex-row items-center gap-1.5"><Text className={T.h3}>{seller.name}</Text>{seller.verified && <View className="flex-row items-center gap-0.5 bg-blue-soft rounded-full px-1.5 py-0.5"><Ionicons name="checkmark-circle" size={11} color={colors.blue} /><Text className="text-blue text-[10px] font-bold">Verified</Text></View>}</View>
                  <Text className={T.small}>{seller.since ? `Member since ${seller.since}` : 'WONPET seller'}</Text>
                  <Text className={T.small}>{fromSeller} active listing{fromSeller === 1 ? '' : 's'}</Text>
                </View>
              </View>
              {!!seller.phone && <Button variant="outline" title="Call seller" icon={<Ionicons name="call-outline" size={17} color={colors.primary} />} onPress={() => Linking.openURL(`tel:${seller.phone.replace(/\s/g, '')}`)} />}
            </Block>
          )}

          <View className="flex-row gap-3 bg-primary-soft rounded-2xl p-3.5 border border-orange-100">
            <View className="w-9 h-9 rounded-xl bg-white items-center justify-center"><Ionicons name="shield-checkmark" size={18} color={colors.primary} /></View>
            <View className="flex-1"><Text className="text-xs font-extrabold text-primary-dark mb-0.5">Stay safe</Text><Text className="text-xs text-ink leading-5">Meet the seller in a public place and verify the {l.listingType === 'Pet' ? 'pet' : 'item'} before making payment.</Text></View>
          </View>

          {similar.length > 0 && (
            <View className="gap-3">
              <View className="flex-row items-center gap-2.5"><View className="w-8 h-8 rounded-xl bg-yellow-soft items-center justify-center"><Ionicons name="sparkles" size={16} color={colors.yellow} /></View><Text className={T.h2}>{l.listingType === 'Pet' ? 'Similar pets you might like' : 'Similar listings'}</Text></View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="gap-3 pr-4">{similar.map((s) => <ListingCard key={s.id} compact item={s} onPress={() => navigation.push('ListingDetail', { id: s.id })} />)}</ScrollView>
            </View>
          )}
        </View>
      </ScrollView>

      <View style={{ paddingBottom: Math.max(insets.bottom, 12) }} className="absolute bottom-0 left-0 right-0 bg-white border-t border-line px-4 pt-3">
        {mine ? (
          <View className="flex-row gap-2.5">
            <Button className="flex-1 px-3" variant="outline" title="Edit" icon={<Ionicons name="create-outline" size={17} color={colors.primary} />} onPress={() => navigation.navigate('CreateListing', { id: l.id })} />
            {!sold && <Button className="flex-1 px-3" title="Mark sold" onPress={onSold} />}
            <Pressable onPress={onDelete} className="w-[52px] rounded-2xl bg-red-soft border-[1.5px] border-red-soft items-center justify-center active:opacity-80"><Ionicons name="trash-outline" size={20} color={colors.red} /></Pressable>
          </View>
        ) : (
          <View className="flex-row gap-4 items-center">
            <View><Text className="text-[11px] text-muted font-semibold">Price</Text><Text className="text-xl font-black text-ink">{inr(l.price)}</Text></View>
            <Button className="flex-1" disabled={sold || chatting} title={sold ? 'Sold' : chatting ? 'Opening chat…' : 'Chat with Seller'} icon={<Ionicons name="chatbubble-ellipses" size={18} color="#fff" />} onPress={chat} />
          </View>
        )}
      </View>
    </View>
  );
}
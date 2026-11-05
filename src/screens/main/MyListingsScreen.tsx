import React, { useState } from 'react';
import { FlatList, Pressable, ScrollView, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme';
import { Button, Chip, Empty, T, Tone, cn } from '../../components/ui';
import { ListingThumb } from '../../components/resell/ListingBits';
import { WonPetsAlert, toast } from '../../components/WonPetsAlert';
import { Listing, timeAgo } from '../../data/resell';
import { useResell } from '../../context/ResellContext';
import { useChat } from '../../context/ChatContext';
import { inr } from '../../utils/orders';
import { MyListingsSkeleton } from '../../components/Skeletons';

type IconName = React.ComponentProps<typeof Ionicons>['name'];
const TABS = ['All', 'Available', 'Sold', 'Inactive'] as const;
const SORTS = ['Newest First', 'Most Viewed', 'Price: High to Low'] as const;
const stateOf = (l: Listing) => (l.status === 'Sold' ? 'Sold' : l.isActive === false ? 'Inactive' : 'Available');
const tone: Record<string, Tone> = { Available: 'green', Sold: 'red', Inactive: 'yellow' };

function ActionBtn({ icon, label, onPress, color = colors.text, bg = 'bg-white', border = 'border-line', text = 'text-ink', disabled }: { icon: IconName; label: string; onPress: () => void; color?: string; bg?: string; border?: string; text?: string; disabled?: boolean }) {
  return (
    <Pressable disabled={disabled} onPress={onPress} className={cn('flex-1 flex-row items-center justify-center gap-1.5 py-2.5 rounded-xl border active:opacity-80', bg, border, disabled && 'opacity-40')}>
      <Ionicons name={icon} size={15} color={color} /><Text className={cn('text-[12px] font-bold', text)}>{label}</Text>
    </Pressable>
  );
}

export default function MyListingsScreen({ navigation }: any) {
  const { listings, markSold, deleteListing, toggleActive, refresh, loading } = useResell();
  const { conversations } = useChat();
  const mine = listings.filter((l) => l.sellerId === 'me');
  const [tab, setTab] = useState<(typeof TABS)[number]>('All');
  const [sort, setSort] = useState<(typeof SORTS)[number]>('Newest First');
  const shown = mine.filter((l) => tab === 'All' || stateOf(l) === tab).sort((a, b) => sort === 'Most Viewed' ? b.views - a.views : sort === 'Price: High to Low' ? b.price - a.price : b.createdAt.localeCompare(a.createdAt));
  const interested = new Set(conversations.filter((c) => c.kind === 'resell' && mine.some((l) => l.id === c.listing?.id)).map((c) => c.contactId)).size + mine.reduce((s, l) => s + l.favouritesCount, 0);
  const count = (t: (typeof TABS)[number]) => (t === 'All' ? mine.length : mine.filter((l) => stateOf(l) === t).length);
  const stats: { k: string; v: number; icon: IconName; box: string; color: string }[] = [
    { k: 'Total', v: mine.length, icon: 'albums', box: 'bg-blue-soft', color: colors.blue },
    { k: 'Active', v: count('Available'), icon: 'checkmark-circle', box: 'bg-green-soft', color: colors.green },
    { k: 'Sold', v: count('Sold'), icon: 'bag-check', box: 'bg-red-soft', color: colors.red },
    { k: 'Interested', v: interested, icon: 'heart', box: 'bg-purple-soft', color: colors.purple },
  ];

  const onDelete = async (l: Listing) => { const r = await WonPetsAlert.delete('Delete this listing?', 'This action cannot be undone.', { confirmText: 'Yes, delete' }); if (r.isConfirmed && (await deleteListing(l.id))) toast.success('Listing deleted'); };
  const onSold = async (l: Listing) => { const r = await WonPetsAlert.confirm('Mark as sold?', 'Buyers will no longer be able to contact you about this listing.', { confirmText: 'Mark as sold' }); if (r.isConfirmed && (await markSold(l.id))) toast.success('Listing marked as sold.'); };

  return (
    <View className="flex-1 bg-cream">
      <FlatList data={shown} keyExtractor={(l) => l.id} refreshing={loading} onRefresh={refresh} contentContainerClassName="p-4 gap-3.5 pb-28"
        ListHeaderComponent={
          <View className="gap-4 mb-1">
            <View className="flex-row gap-2.5">
              {stats.map((s) => (
                <View key={s.k} className="flex-1 bg-white border border-line rounded-2xl p-2.5 gap-2">
                  <View className={cn('w-8 h-8 rounded-xl items-center justify-center', s.box)}><Ionicons name={s.icon} size={16} color={s.color} /></View>
                  <View><Text className="text-xl font-black text-ink">{s.v}</Text><Text className="text-[10px] text-muted font-semibold">{s.k}</Text></View>
                </View>
              ))}
            </View>

            <View className="flex-row bg-primary-soft rounded-2xl p-1">
              {TABS.map((t) => (
                <Pressable key={t} onPress={() => setTab(t)} className={cn('flex-1 items-center py-2 rounded-xl', tab === t ? 'bg-primary' : 'bg-transparent')}>
                  <Text className={cn('text-[11px] font-bold', tab === t ? 'text-white' : 'text-muted')}>{t} <Text className={tab === t ? 'text-white/80' : 'text-muted'}>{count(t)}</Text></Text>
                </Pressable>
              ))}
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="gap-2 items-center pr-4" className="-mx-4 px-4 grow-0">
              <Ionicons name="swap-vertical" size={16} color={colors.muted} />
              {SORTS.map((s) => <Pressable key={s} onPress={() => setSort(s)} className={cn('px-3.5 py-1.5 rounded-full border', sort === s ? 'bg-ink border-ink' : 'bg-white border-line')}><Text className={cn('text-xs font-bold', sort === s ? 'text-white' : 'text-muted')}>{s}</Text></Pressable>)}
            </ScrollView>
          </View>
        }
        ListEmptyComponent={loading && !listings.length ? <MyListingsSkeleton /> : <View><Empty emoji="🏷️" title="No listings yet" body="Sell pets or pre-owned items to other pet parents." /><View className="px-10"><Button title="Create a listing" onPress={() => navigation.navigate('CreateListing')} /></View></View>}
        renderItem={({ item: l }) => {
          const st = stateOf(l);
          return (
            <View className="bg-white rounded-[26px] border border-line p-3 gap-3">
              <Pressable onPress={() => navigation.navigate('ListingDetail', { id: l.id })} className="flex-row gap-3 active:opacity-90">
                <View>
                  <ListingThumb item={l} className="w-[96px] h-[96px] rounded-2xl" emojiSize={42} />
                  {st !== 'Available' && <View className="absolute inset-0 rounded-2xl bg-black/40 items-center justify-center"><Text className="text-white text-[11px] font-black tracking-widest">{st.toUpperCase()}</Text></View>}
                </View>
                <View className="flex-1 justify-between py-0.5">
                  <View className="gap-1">
                    <View className="flex-row items-start justify-between gap-2"><Text className={cn(T.h3, 'flex-1')} numberOfLines={2}>{l.title}</Text><Chip label={st} tone={tone[st]} /></View>
                    <Text className="text-[11px] text-muted">{l.breed ?? l.category} · {l.condition}</Text>
                  </View>
                  <View className="flex-row items-end justify-between">
                    <Text className="text-[18px] font-black text-ink">{inr(l.price)}</Text>
                    <Text className="text-[10px] text-muted">{timeAgo(l.createdAt)}</Text>
                  </View>
                </View>
              </Pressable>

              <View className="flex-row bg-cream rounded-xl py-2">
                <View className="flex-1 flex-row items-center justify-center gap-1.5"><Ionicons name="eye-outline" size={14} color={colors.muted} /><Text className="text-xs font-bold text-ink">{l.views}</Text><Text className={T.small}>views</Text></View>
                <View className="w-px bg-line" />
                <View className="flex-1 flex-row items-center justify-center gap-1.5"><Ionicons name="heart-outline" size={14} color={colors.red} /><Text className="text-xs font-bold text-ink">{l.favouritesCount}</Text><Text className={T.small}>saved</Text></View>
              </View>

              <View className="flex-row gap-2">
                <ActionBtn icon="create-outline" label="Edit" color={colors.primary} text="text-primary" border="border-primary" disabled={st === 'Sold'} onPress={() => navigation.navigate('CreateListing', { id: l.id })} />
                {st !== 'Sold' && <ActionBtn icon={st === 'Inactive' ? 'play-outline' : 'pause-outline'} label={st === 'Inactive' ? 'Activate' : 'Pause'} onPress={async () => { if (await toggleActive(l.id)) toast.success(st === 'Inactive' ? 'Listing is live again' : 'Listing paused'); }} />}
                {st !== 'Sold' && <ActionBtn icon="checkmark-done" label="Sold" color="#fff" bg="bg-primary" border="border-primary" text="text-white" onPress={() => onSold(l)} />}
                <Pressable onPress={() => onDelete(l)} className="w-11 rounded-xl border border-line bg-red-soft items-center justify-center active:opacity-80"><Ionicons name="trash-outline" size={17} color={colors.red} /></Pressable>
              </View>
            </View>
          );
        }} />
      <Pressable onPress={() => navigation.navigate('CreateListing')} className="absolute right-4 bottom-6 flex-row items-center gap-2 bg-ink rounded-full pl-3 pr-5 py-3 shadow-xl shadow-black/30 active:opacity-90">
        <View className="w-8 h-8 rounded-full bg-primary items-center justify-center"><Ionicons name="add" size={20} color="#fff" /></View><Text className="text-white font-extrabold">New listing</Text>
      </Pressable>
    </View>
  );
}
import React, { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme';
import { ActivityIndicator } from 'react-native';
import { Button, Chip, T, cn } from '../ui';
import { Stars, StarInput } from './Stars';
import { WonPetsAlert, toast } from '../WonPetsAlert';
import { RATING_LABELS, relTime } from '../../data/reviews';
import { useReviews } from '../../context/ReviewsContext';

function WriteReviewSheet({ visible, productId, onClose }: { visible: boolean; productId: string; onClose: () => void }) {
  const { saveReview } = useReviews();
  const [rating, setRating] = useState(5);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => { if (visible) { setRating(5); setText(''); } }, [visible]);

  const submit = async () => {
    if (!rating) return toast.error('Please select a rating');
    if (busy) return;
    setBusy(true);
    const ok = await saveReview(productId, rating, text);
    setBusy(false);
    if (ok) { toast.success('Review submitted - it will appear once the store approves it.'); onClose(); }
  };
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} className="flex-1 justify-end bg-black/40">
        <Pressable className="flex-1" onPress={onClose} />
        <View className="bg-white rounded-t-[28px] p-5 gap-4">
          <View className="flex-row justify-between items-center">
            <View><Text className={T.h2}>Write a review</Text><Text className={T.small}>Share your experience to help other pet parents.</Text></View>
            <Pressable onPress={onClose}><Ionicons name="close" size={24} color={colors.text} /></Pressable>
          </View>
          <View className="gap-2">
            <Text className="font-bold text-ink">Your rating</Text>
            <View className="flex-row items-center gap-3 flex-wrap"><StarInput value={rating} onChange={setRating} /><View className="bg-orange-200 rounded-full px-3 py-1"><Text className="text-[#C2410C] text-xs font-bold">{RATING_LABELS[rating]}</Text></View></View>
          </View>
          <View>
            <Text className="font-bold text-ink mb-1.5">Your review</Text>
            <TextInput value={text} onChangeText={setText} maxLength={500} multiline numberOfLines={4} textAlignVertical="top" placeholder="What did you like or dislike? How did your pet react?" placeholderTextColor="#B8AEA5"
              className="border-[1.5px] border-line rounded-2xl px-4 py-3 text-[15px] text-ink min-h-[110px] bg-white" />
            <Text className={cn('text-right text-xs mt-1', text.length > 450 ? 'text-red' : 'text-muted')}>{text.length}/500</Text>
          </View>
          <Button title={busy ? 'Submitting…' : 'Submit review'} disabled={busy} onPress={submit} />
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

export default function ReviewsTab({ productId }: { productId: string }) {
  const { reviewsFor, summaryFor, loadProduct, loading, hasPendingReview, deleteReview } = useReviews();
  const [open, setOpen] = useState(false);
  useEffect(() => { loadProduct(productId); }, [productId]);
  const list = reviewsFor(productId);
  const { average, total, counts } = summaryFor(productId);
  const hasMine = list.some((r) => r.isMe);
  const pending = hasPendingReview(productId) && !hasMine;
  const onDelete = async (id: string) => {
    const r = await WonPetsAlert.delete('Delete your review?', 'You can write a new one afterwards.', { confirmText: 'Delete' });
    if (r.isConfirmed) deleteReview(id, productId);
  };

  return (
    <View className="gap-4">
      <View className="flex-row items-center justify-between gap-3">
        <View className="flex-1"><Text className={T.h2}>Customer Reviews</Text><Text className={T.small}>See what pet parents are saying.</Text></View>
        {!hasMine && !pending && <Button className="py-2.5 px-4" title="Write review" icon={<Ionicons name="star" size={14} color="#fff" />} onPress={() => setOpen(true)} />}
      </View>

      {pending && <View className="bg-primary-soft rounded-2xl p-3 border border-orange-100"><Text className="text-xs text-ink">⏳ Your review is waiting for the store's approval. It will show here once approved.</Text></View>}
      {loading(productId) && list.length === 0 && <ActivityIndicator color={colors.primary} />}
      <View className="rounded-2xl border border-orange-100 bg-white overflow-hidden">
        <View className="flex-row">
          <View className="items-center justify-center px-5 py-4 bg-primary-soft gap-1.5">
            <Text className="text-[40px] font-black text-primary leading-[44px]">{average.toFixed(1)}</Text>
            <Stars value={Math.round(average * 2) / 2} size={14} />
            <Text className="text-[11px] text-muted">{total} {total === 1 ? 'review' : 'reviews'}</Text>
          </View>
          <View className="flex-1 p-3.5 gap-2 justify-center">
            {[5, 4, 3, 2, 1].map((s) => {
              const pct = total ? (counts[s] / total) * 100 : 0;
              return (
                <View key={s} className="flex-row items-center gap-2">
                  <View className="w-6 flex-row items-center gap-0.5"><Text className="text-xs font-semibold text-ink">{s}</Text><Ionicons name="star" size={9} color={colors.yellow} /></View>
                  <View className="flex-1 h-2 rounded-full bg-orange-100 overflow-hidden"><View style={{ width: `${pct}%` }} className="h-full rounded-full bg-primary" /></View>
                  <Text className="w-5 text-right text-xs text-muted">{counts[s]}</Text>
                </View>
              );
            })}
          </View>
        </View>
      </View>

      {list.length === 0 ? (
        <View className="items-center py-6 gap-1.5"><View className="w-14 h-14 rounded-full bg-primary-soft items-center justify-center"><Ionicons name="star" size={24} color={colors.primary} /></View><Text className={T.h3}>No Reviews Yet</Text><Text className={T.small + ' text-center'}>Be the first pet parent to share your experience.</Text></View>
      ) : list.map((r) => (
        <View key={r.id} className="rounded-2xl border border-orange-100 bg-white">
          <View className="flex-row items-start gap-3 p-3.5 border-b border-orange-100">
            <View className="w-10 h-10 rounded-full bg-primary-soft items-center justify-center"><Text className="text-xl">{r.emoji}</Text></View>
            <View className="flex-1 gap-1">
              <View className="flex-row items-center gap-1.5 flex-wrap"><Text className={T.h3}>{r.author}</Text><Chip label="Verified Buyer" tone="green" />{r.isMe && <Chip label="Your review" tone="orange" />}</View>
              <Stars value={r.rating} size={13} />
            </View>
            <View className="items-end gap-2"><Text className={T.small}>{relTime(r.createdAt)}</Text>{r.isMe && <Pressable hitSlop={8} onPress={() => onDelete(r.id)}><Ionicons name="trash-outline" size={16} color={colors.red} /></Pressable>}</View>
          </View>
          {!!r.review && <View className="p-3.5"><View className="bg-cream rounded-xl p-3"><Text className="text-sm text-ink leading-5">{r.review}</Text></View></View>}
        </View>
      ))}
      <WriteReviewSheet visible={open} productId={productId} onClose={() => setOpen(false)} />
    </View>
  );
}

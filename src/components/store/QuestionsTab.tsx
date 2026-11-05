import React, { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme';
import { Button, Chip, T, cn } from '../ui';
import { WonPetsAlert, toast } from '../WonPetsAlert';
import { relTime } from '../../data/reviews';
import { useReviews } from '../../context/ReviewsContext';

const MIN = 10;

function AskSheet({ visible, productId, onClose }: { visible: boolean; productId: string; onClose: () => void }) {
  const { askQuestion } = useReviews();
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const submit = async () => {
    if (!text.trim()) return toast.error('Please enter your question.');
    if (text.trim().length < MIN) return toast.error(`Question should contain at least ${MIN} characters.`);
    if (busy) return;
    setBusy(true);
    const ok = await askQuestion(productId, text);
    setBusy(false);
    if (!ok) return;
    toast.success('Question submitted successfully.');
    setText(''); onClose();
  };
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} className="flex-1 justify-end bg-black/40">
        <Pressable className="flex-1" onPress={onClose} />
        <View className="bg-white rounded-t-[28px] p-5 gap-4">
          <View className="flex-row justify-between items-center"><View className="flex-1"><Text className={T.h2}>Ask a question</Text><Text className={T.small}>The store team will respond as soon as possible.</Text></View><Pressable onPress={onClose}><Ionicons name="close" size={24} color={colors.text} /></Pressable></View>
          <View>
            <TextInput value={text} onChangeText={setText} maxLength={500} multiline numberOfLines={5} textAlignVertical="top" placeholder="Example: Is this suitable for a 3-month-old Labrador puppy?" placeholderTextColor="#B8AEA5"
              className="border-[1.5px] border-orange-200 bg-primary-soft/40 rounded-2xl px-4 py-3 text-[15px] text-ink min-h-[120px]" />
            <View className="flex-row justify-between mt-1.5"><Text className={T.small + ' flex-1'}>💡 Be detailed to get a better answer.</Text><Text className={cn('text-xs', text.length > 450 ? 'text-red' : 'text-muted')}>{text.length}/500</Text></View>
          </View>
          <View className="bg-primary-soft rounded-2xl p-3.5 gap-0.5 border border-orange-100">
            <Text className="font-bold text-primary text-[13px] mb-0.5">Before you submit</Text>
            {['Ask only product-related questions.', 'Avoid sharing personal information.', 'Questions become visible after approval.'].map((t) => <Text key={t} className="text-xs text-ink">• {t}</Text>)}
          </View>
          <Button disabled={text.trim().length < MIN || busy} title={busy ? "Submitting…" : "Submit question"} onPress={submit} />
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

export default function QuestionsTab({ productId }: { productId: string }) {
  const { questionsFor, deleteQuestion, loadProduct } = useReviews();
  useEffect(() => { loadProduct(productId); }, [productId]);
  const [q, setQ] = useState('');
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const [ask, setAsk] = useState(false);
  const list = questionsFor(productId).filter((x) => x.question.toLowerCase().includes(q.toLowerCase()));

  const onDelete = async (id: string) => {
    const r = await WonPetsAlert.delete('Delete this question?', 'This cannot be undone.', { confirmText: 'Delete' });
    if (r.isConfirmed && (await deleteQuestion(id, productId))) toast.success('Question deleted');
  };

  return (
    <View className="gap-3.5">
      <View className="flex-row items-center justify-between gap-3">
        <View className="flex-1"><Text className={T.h2}>Questions & Answers</Text><Text className={T.small}>Answers from the store team and other pet parents.</Text></View>
        <Button className="py-2.5 px-4" title="Ask" icon={<Ionicons name="help-circle" size={15} color="#fff" />} onPress={() => setAsk(true)} />
      </View>
      <View className="flex-row items-center gap-2 bg-white border border-orange-200 rounded-2xl px-3"><Ionicons name="search-outline" size={17} color={colors.muted} /><TextInput value={q} onChangeText={setQ} placeholder="Search questions…" placeholderTextColor="#B8AEA5" className="flex-1 py-2.5" /></View>

      {list.length === 0 ? (
        <View className="items-center py-6 gap-1.5">
          <View className="w-14 h-14 rounded-full bg-primary-soft items-center justify-center"><Ionicons name="help-circle" size={26} color={colors.primary} /></View>
          <Text className={T.h3}>{q ? 'No matching questions' : 'No Questions Yet'}</Text><Text className={T.small + ' text-center'}>{q ? 'Try a different search.' : 'Be the first to ask about this product.'}</Text>
          {!q && <Button className="mt-2" title="Ask the first question" onPress={() => setAsk(true)} />}
        </View>
      ) : list.map((x) => {
        const expanded = open[x.id];
        return (
          <View key={x.id} className="rounded-2xl border border-orange-100 bg-white p-3.5 gap-2.5">
            <View className="flex-row items-start gap-3">
              <View className="w-10 h-10 rounded-full bg-primary-soft items-center justify-center"><Text className="text-xl">{x.emoji}</Text></View>
              <View className="flex-1 gap-1">
                <View className="flex-row items-center gap-1.5 flex-wrap"><Text className={T.h3}>{x.author}</Text>{x.isMe && <Chip label="You" tone="orange" />}</View>
                <View className="flex-row items-center gap-2"><Text className={T.small}>{relTime(x.createdAt)}</Text><Chip label={x.status} tone={x.status === 'Answered' ? 'green' : 'yellow'} /></View>
              </View>
              {x.isMe && <Pressable hitSlop={8} onPress={() => onDelete(x.id)}><Ionicons name="trash-outline" size={18} color={colors.red} /></Pressable>}
            </View>
            <View className="flex-row gap-2"><Text className="text-primary font-black">Q.</Text><Text className="flex-1 text-sm text-ink leading-5 font-semibold">{x.question}</Text></View>
            {x.status === 'Answered' && x.answer ? (
              <>
                <Pressable onPress={() => setOpen((o) => ({ ...o, [x.id]: !expanded }))} className="flex-row items-center gap-1"><Text className="text-primary font-bold text-xs">{expanded ? 'Hide answer' : 'View answer'}</Text><Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={13} color={colors.primary} /></Pressable>
                {expanded && <View className="bg-green-soft/70 rounded-xl p-3 gap-1"><Text className="text-sm text-ink leading-5">{x.answer.text}</Text><Text className={T.small}>{x.answer.by} · {relTime(x.answer.at)}</Text></View>}
              </>
            ) : <Text className={T.small}>Waiting for the store team to respond.</Text>}
          </View>
        );
      })}
      <AskSheet visible={ask} productId={productId} onClose={() => setAsk(false)} />
    </View>
  );
}

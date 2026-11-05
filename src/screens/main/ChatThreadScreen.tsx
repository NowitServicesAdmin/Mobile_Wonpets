import React, { useEffect, useMemo, useRef, useState } from 'react';
import { FlatList, KeyboardAvoidingView, Modal, Platform, Pressable, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../../theme';
import { Gradient, cn } from '../../components/ui';
import { Avatar } from '../../components/Avatar';
import { ACCENT, ChatAvatar } from '../../components/chat/ChatBits';
import { WonPetsAlert } from '../../components/WonPetsAlert';
import { ChatMessage, STATUS_LABEL, dayLabel, formatTime } from '../../data/chat';
import { useChat } from '../../context/ChatContext';
import { inr } from '../../utils/orders';

type Row = { type: 'day'; id: string; label: string } | { type: 'msg'; id: string; msg: ChatMessage } | { type: 'typing'; id: string };

/** One conversation: day-grouped bubbles, read ticks, edit / delete own messages, typing + automated replies. */
export default function ChatThreadScreen({ route, navigation }: any) {
  const insets = useSafeAreaInsets();
  const { conversations, contacts, messages, typing, sendMessage, editMessage, deleteMessage, markRead, openConversation, closeConversation, setTyping, unreadFor } = useChat();
  const conv = conversations.find((c) => c.id === route.params.conversationId);
  const contact = contacts.find((c) => c.id === conv?.contactId && c.kind === conv?.kind);
  const list = conv ? messages[conv.id] ?? [] : [];
  const isTyping = !!conv && !!typing[conv.id];

  const [text, setText] = useState('');
  const [editing, setEditing] = useState<ChatMessage | null>(null);
  const [menu, setMenu] = useState<ChatMessage | null>(null);
  const ref = useRef<FlatList<Row>>(null);

  // load the history and join the live room while this screen is open
  const convId = route.params.conversationId as string;
  useEffect(() => { openConversation(convId); return () => closeConversation(convId); }, [convId]);
  // everything in an open thread counts as read
  useEffect(() => { if (conv && unreadFor(conv.id) > 0) markRead(conv.id); }, [conv?.id, list.length, conv ? unreadFor(conv.id) : 0]);
  // "typing…" for the other person: start on the first key, stop after a short pause
  const typingStop = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const onType = (t: string) => {
    setText(t);
    if (!conv) return;
    if (!typingStop.current) setTyping(conv.id, true);
    clearTimeout(typingStop.current);
    typingStop.current = setTimeout(() => { typingStop.current = undefined; setTyping(conv.id, false); }, 2000);
  };

  const rows = useMemo<Row[]>(() => {
    const out: Row[] = [];
    let lastLabel = '';
    [...list].sort((a, b) => a.createdAt.localeCompare(b.createdAt)).forEach((m) => {
      const label = dayLabel(m.createdAt);
      if (label !== lastLabel) { out.push({ type: 'day', id: `d-${label}`, label }); lastLabel = label; }
      out.push({ type: 'msg', id: m.id, msg: m });
    });
    if (isTyping) out.push({ type: 'typing', id: 'typing' });
    return out;
  }, [list, isTyping]);

  if (!conv || !contact) return <View className="flex-1 bg-cream" />;
  const accent = ACCENT[conv.kind];
  const subtitle = isTyping ? 'typing…' : contact.status && contact.status !== 'online' ? STATUS_LABEL[contact.status] : contact.status === 'online' ? 'Online' : contact.subtitle;

  const send = () => {
    const t = text.trim(); if (!t) return;
    if (editing) editMessage(conv.id, editing.id, t); else sendMessage(conv.id, t);
    setText(''); setEditing(null);
    if (typingStop.current) { clearTimeout(typingStop.current); typingStop.current = undefined; setTyping(conv.id, false); }
  };
  const onDelete = async (m: ChatMessage) => {
    setMenu(null);
    const r = await WonPetsAlert.delete('Delete this message?', 'It will show as deleted for both of you.', { confirmText: 'Delete' });
    if (r.isConfirmed) deleteMessage(conv.id, m.id);
  };

  return (
    <KeyboardAvoidingView className="flex-1 bg-cream" behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Gradient colorsArr={accent.hex} className="px-4 pb-3.5">
        <View style={{ paddingTop: insets.top + 8 }} className="flex-row items-center gap-3">
        <Pressable onPress={() => navigation.goBack()} className="w-9 h-9 rounded-full items-center justify-center bg-white/20"><Ionicons name="arrow-back" size={20} color="#fff" /></Pressable>
        <ChatAvatar emoji={contact.emoji} image={contact.image} size={42} status={contact.status} kind={conv.kind} />
        <View className="flex-1"><Text className="text-white font-bold text-base" numberOfLines={1}>{contact.name}</Text><Text className="text-white/85 text-xs">{subtitle}</Text></View>
        </View>
      </Gradient>

      {!!conv.listing && (
        <Pressable onPress={() => navigation.navigate('ListingDetail', { id: conv.listing!.id })} className="flex-row items-center gap-3 mx-3 mt-3 bg-white rounded-2xl border border-line p-2.5">
          <Avatar square image={conv.listing.image} emoji={conv.listing.emoji} size={44} />
          <View className="flex-1"><Text className="text-[11px] text-muted">About this listing</Text><Text className="font-bold text-ink" numberOfLines={1}>{conv.listing.title}</Text></View>
          <Text className="font-black text-primary-dark">{inr(conv.listing.price)}</Text>
        </Pressable>
      )}

      <FlatList ref={ref} data={rows} keyExtractor={(r) => r.id} contentContainerClassName="p-4 gap-2" onContentSizeChange={() => ref.current?.scrollToEnd({ animated: true })}
        ListEmptyComponent={<Text className="text-center text-muted mt-16">No messages yet. Start the conversation.</Text>}
        renderItem={({ item }) => {
          if (item.type === 'day') return <Text className="text-center text-[11px] text-muted my-2">{item.label}</Text>;
          if (item.type === 'typing') return <View className="self-start bg-white border border-line rounded-2xl rounded-bl-sm px-4 py-3 flex-row gap-1">{[0, 1, 2].map((i) => <View key={i} className="w-1.5 h-1.5 rounded-full bg-gray-400" style={{ opacity: 0.4 + i * 0.3 }} />)}</View>;
          const m = item.msg; const me = m.from === 'me';
          const canModify = me && !m.isDeleted && !m.isAutoReply;
          return (
            <View className={cn('max-w-[80%]', me ? 'self-end items-end' : 'self-start items-start')}>
              {m.isAutoReply && <Text className="text-[10px] text-muted mb-0.5 px-1">Automated reply</Text>}
              <Pressable onLongPress={() => canModify && setMenu(m)} delayLongPress={250}
                className={cn('px-3.5 py-2 rounded-2xl', me ? cn(accent.bg, 'rounded-br-sm') : 'bg-white border border-line rounded-bl-sm')}>
                <Text className={cn('text-[15px] leading-[21px]', me ? 'text-white' : 'text-ink', m.isDeleted && 'italic opacity-70')}>{m.isDeleted ? 'This message was deleted' : m.text}</Text>
                <View className={cn('flex-row items-center gap-1 mt-0.5', me && 'justify-end')}>
                  {m.isEdited && !m.isDeleted && <Text className={cn('text-[10px] italic', me ? 'text-white/70' : 'text-muted')}>edited</Text>}
                  <Text className={cn('text-[10px]', me ? 'text-white/70' : 'text-muted')}>{formatTime(m.createdAt)}</Text>
                  {me && !m.isDeleted && <Ionicons name={m.pending ? 'time-outline' : m.isRead ? 'checkmark-done' : 'checkmark'} size={14} color={m.isRead ? '#7DD3FC' : 'rgba(255,255,255,0.7)'} />}
                </View>
              </Pressable>
            </View>
          );
        }} />

      <View style={{ paddingBottom: Math.max(insets.bottom, 10) }} className="bg-white border-t border-line">
        {!!editing && (
          <View className="flex-row items-center justify-between px-4 pt-2.5">
            <Text className="text-xs text-muted flex-1" numberOfLines={1}>Editing: {editing.text}</Text>
            <Pressable onPress={() => { setEditing(null); setText(''); }} hitSlop={8}><Ionicons name="close" size={16} color={colors.muted} /></Pressable>
          </View>
        )}
        <View className="flex-row items-center gap-2.5 px-3 pt-2.5">
          <TextInput value={text} onChangeText={onType} multiline placeholder={editing ? 'Edit your message…' : 'Type your message…'} placeholderTextColor="#B8AEA5" className={cn('flex-1 max-h-28 rounded-3xl border px-4 py-2.5 text-[15px] bg-cream', accent.border)} />
          <Pressable disabled={!text.trim()} onPress={send} className={cn('w-11 h-11 rounded-full items-center justify-center', accent.bg, !text.trim() && 'opacity-40')}>
            <Ionicons name={editing ? 'checkmark' : 'send'} size={18} color="#fff" />
          </Pressable>
        </View>
      </View>

      <Modal visible={!!menu} transparent animationType="fade" onRequestClose={() => setMenu(null)}>
        <Pressable onPress={() => setMenu(null)} className="flex-1 bg-black/40 justify-end p-4">
          <View className="bg-white rounded-3xl overflow-hidden">
            <Pressable onPress={() => { setEditing(menu); setText(menu!.text); setMenu(null); }} className="flex-row items-center gap-3 px-5 py-4 border-b border-line"><Ionicons name="pencil" size={18} color={colors.text} /><Text className="font-semibold text-ink">Edit message</Text></Pressable>
            <Pressable onPress={() => onDelete(menu!)} className="flex-row items-center gap-3 px-5 py-4"><Ionicons name="trash" size={18} color={colors.red} /><Text className="font-semibold text-red">Delete message</Text></Pressable>
          </View>
        </Pressable>
      </Modal>
    </KeyboardAvoidingView>
  );
}

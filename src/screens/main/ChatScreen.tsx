import React, { useEffect, useMemo, useState } from 'react';
import { FlatList, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme';
import { Empty, T, cn } from '../../components/ui';
import { ACCENT, ChatAvatar, UnreadBadge } from '../../components/chat/ChatBits';
import { ChatKind, sidebarTime } from '../../data/chat';
import { useChat } from '../../context/ChatContext';
import { ChatListSkeleton } from '../../components/Skeletons';
import { useManaged } from '../../context/ManagedContext';
import { useAuth } from '../../context/AuthContext';

const ALL_TABS: ChatKind[] = ['vet', 'collab', 'resell'];
const topLabel: Partial<Record<ChatKind, string>> = { vet: 'Our Top Doctors', collab: 'Your Collaborators' };
const managedTopLabel = 'Pet Owners You Help';
const emptyText: Record<ChatKind, string> = {
  vet: 'No conversations yet — pick a doctor above to start one.',
  collab: 'No conversations yet — pick a collaborator above to start one.',
  resell: 'No conversations yet. Message a seller from a listing to start one.',
};

/** Conversation list (Vet / Collab / Resell). Open with params { tab?, doctorId? } to jump straight into a chat. */
export default function ChatScreen({ navigation, route }: any) {
  const { contacts, conversations, messages, unreadByKind, unreadFor, startConversation, lastMessage, refresh, loading } = useChat();
  const { isManaged } = useManaged();
  const isDoctor = useAuth().user?.role === 'doctor';
  // in the shared view only the owner conversations make sense (no vets / resell); a doctor only talks to pet owners
  const TABS = isDoctor ? (['vet'] as ChatKind[]) : isManaged ? (['collab'] as ChatKind[]) : ALL_TABS;
  const [opening, setOpening] = useState(false);
  const [tab, setTab] = useState<ChatKind>(isDoctor ? 'vet' : isManaged ? 'collab' : route.params?.tab ?? 'vet');
  const [q, setQ] = useState('');
  const accent = ACCENT[tab];

  // e.g. "Chat with doctor" from an appointment
  useEffect(() => {
    const id = route.params?.doctorId;
    if (!id) return;
    navigation.setParams({ doctorId: undefined });
    open('vet', id);
  }, [route.params?.doctorId]);

  const top = contacts.filter((c) => c.kind === tab && tab !== 'resell');
  const rows = useMemo(() => conversations
    .filter((c) => c.kind === tab)
    .map((c) => ({ c, contact: contacts.find((x) => x.id === c.contactId && x.kind === c.kind)!, last: lastMessage(c.id) }))
    .filter(({ contact }) => !!contact)
    .filter(({ contact, last }) => `${contact.name} ${last?.text ?? ''}`.toLowerCase().includes(q.toLowerCase()))
    .sort((a, b) => (b.last?.createdAt ?? '').localeCompare(a.last?.createdAt ?? '')), [conversations, messages, tab, q, contacts]); // `messages` changes when new ones arrive, which refreshes the previews

  const open = async (kind: ChatKind, contactId: string) => {
    if (opening) return;
    setOpening(true);
    const id = await startConversation(kind, contactId);
    setOpening(false);
    if (id) navigation.navigate('ChatThread', { conversationId: id });
  };

  return (
    <View className="flex-1 bg-cream">
      {!isDoctor && <View className="flex-row gap-2 px-4 pt-3 pb-2">
        {TABS.map((k) => {
          const on = tab === k; const count = unreadByKind[k];
          return (
            <Pressable key={k} onPress={() => setTab(k)} className={cn('flex-row items-center gap-2 px-5 py-2 rounded-full border', on ? cn(ACCENT[k].bg, 'border-transparent') : 'bg-white border-orange-100')}>
              <Text className={cn('font-bold text-sm', on ? 'text-white' : 'text-muted')}>{ACCENT[k].label}</Text>
              <UnreadBadge count={count} className={on ? 'bg-white/30' : ACCENT[k].bg} />
            </Pressable>
          );
        })}
      </View>}

      <FlatList data={rows} keyExtractor={(r) => r.c.id} contentContainerClassName="pb-8" refreshing={loading} onRefresh={refresh}
        ListHeaderComponent={
          <View className={isDoctor ? 'pt-3' : undefined}>
            {top.length > 0 && !isDoctor && (
              <View className="mx-4 mt-2 mb-3 rounded-3xl border border-orange-100 bg-white/70 px-4 py-3">
                <Text className={cn(T.h3, 'mb-3')}>{isManaged && tab === 'collab' ? managedTopLabel : topLabel[tab]}</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="gap-5">
                  {top.map((c) => (
                    <Pressable key={c.id} onPress={() => open(c.kind, c.id)} className="items-center gap-1.5 w-[64px]">
                      <ChatAvatar emoji={c.emoji} image={c.image} size={54} status={c.status} kind={c.kind} />
                      <Text className="text-xs font-semibold text-ink" numberOfLines={1}>{c.name.replace('Dr. ', '')}</Text>
                    </Pressable>
                  ))}
                </ScrollView>
              </View>
            )}
            <View className={cn('flex-row items-center gap-2 mx-4 mb-1 rounded-2xl border px-3 bg-white', accent.border)}>
              <Ionicons name="search-outline" size={18} color={colors.muted} />
              <TextInput value={q} onChangeText={setQ} placeholder="Search conversations…" placeholderTextColor="#B8AEA5" className="flex-1 py-3" />
            </View>
          </View>
        }
        ListEmptyComponent={loading && !rows.length ? <ChatListSkeleton /> : <View className="pt-6"><Empty emoji="💬" title="No conversations" body={q ? 'Nothing matches your search.' : isDoctor ? 'Pet owners will appear here when they message you.' : (isManaged && tab === 'collab' ? 'No conversations yet — pick a pet owner above to start one.' : emptyText[tab])} /></View>}
        renderItem={({ item: { c, contact, last } }) => {
          const unread = unreadFor(c.id);
          return (
            <Pressable onPress={() => navigation.navigate('ChatThread', { conversationId: c.id })} className="flex-row items-center gap-3 px-4 py-3 border-b border-orange-50 active:bg-white">
              <ChatAvatar emoji={contact.emoji} image={contact.image} status={contact.status} kind={c.kind} />
              <View className="flex-1 gap-0.5">
                <View className="flex-row items-center justify-between">
                  <Text className={cn('text-[15px] text-ink flex-shrink', unread ? 'font-extrabold' : 'font-semibold')} numberOfLines={1}>{contact.name}</Text>
                  {!!last && <Text className={cn('text-[11px] ml-2', unread ? cn(accent.text, 'font-bold') : 'text-muted')}>{sidebarTime(last.createdAt)}</Text>}
                </View>
                {!!c.listing && <Text className={cn('text-[11px] font-semibold', accent.text)} numberOfLines={1}>{c.listing.emoji} {c.listing.title}</Text>}
                <Text className={cn('text-xs', unread ? 'text-ink font-semibold' : 'text-muted')} numberOfLines={1}>
                  {last ? (last.isDeleted ? 'This message was deleted' : `${last.from === 'me' ? 'You: ' : ''}${last.text}`) : 'Start the conversation'}
                </Text>
              </View>
              <UnreadBadge count={unread} className={accent.bg} />
            </Pressable>
          );
        }} />
    </View>
  );
}
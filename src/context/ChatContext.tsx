import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { ChatContact, ChatKind, ChatMessage, Conversation, PresenceStatus } from '../data/chat';
import { toast } from '../components/WonPetsAlert';
import { API_ORIGIN } from '../config/env';
import { useAuth } from './AuthContext';
import { usePets } from './PetsContext';
import { errorMessage, tokenStore } from '../services/api';
import { chatService } from '../services/chat.service';
import { mapConversation, mapMessage } from '../services/mappers';

type Ctx = {
  contacts: ChatContact[];
  conversations: Conversation[];
  messages: Record<string, ChatMessage[]>;
  typing: Record<string, boolean>;
  loading: boolean;
  refresh: () => Promise<void>;
  refreshQuiet: () => Promise<void>;
  /** Adds a contact that is not in a conversation yet (e.g. the vet of a real appointment). No-op if it already exists. */
  registerContact: (c: ChatContact) => void;
  /** Opens the existing conversation with this person, or creates it on the server. Resolves to its id (null on failure). */
  startConversation: (kind: ChatKind, contactId: string, listing?: Conversation['listing']) => Promise<string | null>;
  /** Call when a thread opens: loads its messages and joins its live room. Call closeConversation when it closes. */
  openConversation: (conversationId: string) => Promise<void>;
  closeConversation: (conversationId: string) => void;
  sendMessage: (conversationId: string, text: string) => void;
  editMessage: (conversationId: string, messageId: string, text: string) => void;
  deleteMessage: (conversationId: string, messageId: string) => void;
  markRead: (conversationId: string) => void;
  /** Tell the other person you are typing. */
  setTyping: (conversationId: string, typing: boolean) => void;
  lastMessage: (conversationId: string) => ChatMessage | undefined;
  unreadFor: (conversationId: string) => number;
  unreadByKind: Record<ChatKind, number>;
  totalUnread: number;
};
const ChatContext = createContext<Ctx>({} as Ctx);
export const useChat = () => useContext(ChatContext);

const uid = () => `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
const upsertMsg = (list: ChatMessage[] = [], m: ChatMessage) => {
  const i = list.findIndex((x) => x.id === m.id || (m.clientId && x.clientId === m.clientId));
  if (i === -1) return [...list, m];
  const next = [...list];
  next[i] = { ...list[i], ...m };
  return next;
};

/**
 * Real chat: conversations and history over REST, live messages / typing / read receipts / presence over socket.io.
 * The vet "Our Top Doctors" row is built from your appointments; the collab row from your collaborators.
 */
export function ChatProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  // the doctor app has no PetsProvider - usePets() is then an empty object
  const { appointments = [] } = usePets();
  const viewerRole = user?.role ?? 'user';
  const meId = user?.id ?? '';
  const [contacts, setContacts] = useState<ChatContact[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messages, setMessages] = useState<Record<string, ChatMessage[]>>({});
  const [unread, setUnread] = useState<Record<string, number>>({});
  const [lastMsg, setLastMsg] = useState<Record<string, ChatMessage>>({});
  const [typing, setTypingState] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(false);
  const socketRef = useRef<Socket | null>(null);
  const open = useRef<Set<string>>(new Set());
  const typingTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const convRef = useRef<Conversation[]>([]);
  convRef.current = conversations;

  const upsertContact = (c: ChatContact) =>
    setContacts((list) => (list.some((x) => x.id === c.id && x.kind === c.kind) ? list.map((x) => (x.id === c.id && x.kind === c.kind ? { ...x, ...c } : x)) : [...list, c]));

  /* ----------------------------- conversations ----------------------------- */
  const load = useCallback(async (quiet = false) => {
    if (!meId) return;
    if (!quiet) setLoading(true);
    try {
      const rows = (await chatService.conversations()).map((c) => mapConversation(c, meId, viewerRole));
      setConversations(rows.map((r) => r.conversation));
      setContacts((cur) => {
        let next = [...cur];
        rows.forEach(({ contact }) => { next = next.some((x) => x.id === contact.id && x.kind === contact.kind) ? next.map((x) => (x.id === contact.id && x.kind === contact.kind ? { ...x, ...contact } : x)) : [...next, contact]; });
        return next;
      });
      setUnread(Object.fromEntries(rows.map((r) => [r.conversation.id, r.unread])));
      setLastMsg(Object.fromEntries(rows.filter((r) => r.last).map((r) => [r.conversation.id, r.last!])));
    } catch (e) {
      if (!quiet) toast.error(errorMessage(e));
    } finally {
      if (!quiet) setLoading(false);
    }
  }, [meId, viewerRole]);
  const refresh = useCallback(() => load(false), [load]);
  /** Silent re-fetch of conversations + collab contacts - used by live sync. */
  const refreshQuiet = useCallback(async () => { await load(true); }, [load]);

  // collaborators for the "Collab" top row
  const loadCollabContacts = useCallback(async () => {
    const list = await chatService.collaboratorContacts(viewerRole);
    list.forEach((c) => upsertContact({ id: c.id, kind: 'collab', name: c.name, emoji: '🙂', subtitle: c.subtitle, status: 'offline' }));
  }, [viewerRole]);

  // doctors you have an appointment with can be messaged
  useEffect(() => {
    const seen = new Set<string>();
    appointments.forEach((a) => {
      if (a.doctorId && a.doctor && !seen.has(a.doctorId)) {
        seen.add(a.doctorId);
        setContacts((list) => (list.some((x) => x.id === a.doctorId && x.kind === 'vet') ? list : [...list, { id: a.doctorId!, kind: 'vet', name: a.doctor!, emoji: '👩‍⚕️', image: a.doctorImage, subtitle: a.doctorSpec || 'Veterinary', status: 'offline' }]));
      }
    });
  }, [appointments]);

  /* -------------------------------- socket --------------------------------- */
  useEffect(() => {
    if (!user) {
      socketRef.current?.disconnect();
      socketRef.current = null;
      setContacts([]); setConversations([]); setMessages({}); setUnread({}); setLastMsg({}); setTypingState({});
      return;
    }
    refresh();
    loadCollabContacts();

    const socket = io(API_ORIGIN, { auth: { token: tokenStore.get() }, transports: ['websocket'], reconnection: true, reconnectionDelay: 1500 });
    socketRef.current = socket;

    // after (re)connecting, rejoin the open threads and refresh the list
    socket.on('connect', () => {
      open.current.forEach((id) => socket.emit('join_conversation', { conversationId: id }));
    });
    socket.io.on('reconnect', () => { refresh(); });

    socket.on('new_message', (raw: any) => {
      const m = mapMessage(raw, meId);
      const cid = m.conversationId;
      if (!convRef.current.some((c) => c.id === cid)) { refresh(); return; } // a brand-new conversation started by the other person
      setMessages((all) => (all[cid] || open.current.has(cid) ? { ...all, [cid]: upsertMsg(all[cid], m) } : all));
      setLastMsg((l) => ({ ...l, [cid]: m }));
      if (m.from === 'them') setUnread((u) => ({ ...u, [cid]: (u[cid] ?? 0) + 1 }));
    });
    socket.on('message_read', (e: { conversationId: string; readBy: string }) => {
      if (String(e.readBy) === meId) return;
      setMessages((all) => (all[e.conversationId] ? { ...all, [e.conversationId]: all[e.conversationId].map((x) => (x.from === 'me' ? { ...x, isRead: true } : x)) } : all));
    });
    socket.on('message_edited', (raw: any) => {
      const m = mapMessage(raw, meId);
      setMessages((all) => (all[m.conversationId] ? { ...all, [m.conversationId]: upsertMsg(all[m.conversationId], m) } : all));
      setLastMsg((l) => (l[m.conversationId]?.id === m.id ? { ...l, [m.conversationId]: m } : l));
    });
    socket.on('message_deleted', (e: { conversationId: string; messageId: string }) => {
      setMessages((all) => (all[e.conversationId] ? { ...all, [e.conversationId]: all[e.conversationId].map((x) => (x.id === String(e.messageId) ? { ...x, isDeleted: true } : x)) } : all));
      setLastMsg((l) => (l[e.conversationId]?.id === String(e.messageId) ? { ...l, [e.conversationId]: { ...l[e.conversationId], isDeleted: true } } : l));
    });
    socket.on('typing_start', (e: { conversationId: string; userId: string }) => {
      if (String(e.userId) === meId) return;
      setTypingState((t) => ({ ...t, [e.conversationId]: true }));
      clearTimeout(typingTimers.current[e.conversationId]);
      typingTimers.current[e.conversationId] = setTimeout(() => setTypingState((t) => ({ ...t, [e.conversationId]: false })), 6000); // safety net if "stop" is lost
    });
    socket.on('typing_stop', (e: { conversationId: string }) => {
      clearTimeout(typingTimers.current[e.conversationId]);
      setTypingState((t) => ({ ...t, [e.conversationId]: false }));
    });
    const presence = (online: boolean) => (e: { userId: string; status: PresenceStatus }) =>
      setContacts((list) => list.map((c) => (c.id === String(e.userId) && c.status !== undefined ? { ...c, status: (e.status || (online ? 'online' : 'offline')) as PresenceStatus } : c)));
    socket.on('user_online', presence(true));
    socket.on('user_offline', presence(false));
    socket.on('auth:expired', () => socket.disconnect());

    return () => { socket.removeAllListeners(); socket.disconnect(); socketRef.current = null; Object.values(typingTimers.current).forEach(clearTimeout); };
  }, [user?.id]);

  const connected = () => !!socketRef.current?.connected;

  /* ------------------------------ open / start ------------------------------ */
  const startConversation: Ctx['startConversation'] = async (kind, contactId, listing) => {
    const existing = conversations.find((c) => c.kind === kind && c.contactId === contactId && (kind !== 'resell' || c.listing?.id === listing?.id));
    if (existing) return existing.id;
    try {
      const raw = kind === 'vet' ? await chatService.startVet(contactId) : kind === 'collab' ? await chatService.startCollab(contactId) : await chatService.startResell(contactId, listing?.id);
      const { conversation, contact, unread: u, last } = mapConversation(raw, meId, viewerRole);
      setConversations((list) => (list.some((c) => c.id === conversation.id) ? list : [...list, conversation]));
      upsertContact({ ...contact, ...(contacts.find((c) => c.id === contact.id && c.kind === kind) ?? {}), id: contact.id, kind, image: contact.image });
      setUnread((m) => ({ ...m, [conversation.id]: m[conversation.id] ?? u }));
      if (last) setLastMsg((m) => ({ ...m, [conversation.id]: last }));
      return conversation.id;
    } catch (e) {
      toast.error(errorMessage(e, 'Could not start the chat.'));
      return null;
    }
  };

  const openConversation: Ctx['openConversation'] = async (cid) => {
    open.current.add(cid);
    socketRef.current?.emit('join_conversation', { conversationId: cid });
    try {
      const list = (await chatService.messages(cid)).map((m) => mapMessage(m, meId));
      setMessages((all) => {
        const pending = (all[cid] ?? []).filter((x) => x.pending);
        return { ...all, [cid]: [...list, ...pending] };
      });
      if (list.length) setLastMsg((l) => ({ ...l, [cid]: list[list.length - 1] }));
    } catch (e) {
      toast.error(errorMessage(e));
    }
  };
  const closeConversation: Ctx['closeConversation'] = (cid) => {
    open.current.delete(cid);
    socketRef.current?.emit('leave_conversation', { conversationId: cid });
  };

  /* -------------------------------- messaging ------------------------------- */
  const sendMessage: Ctx['sendMessage'] = (cid, text) => {
    const body = text.trim();
    if (!body) return;
    const clientId = uid();
    const temp: ChatMessage = { id: `tmp-${clientId}`, clientId, conversationId: cid, from: 'me', text: body, createdAt: new Date().toISOString(), isRead: false, pending: true };
    setMessages((all) => ({ ...all, [cid]: [...(all[cid] ?? []), temp] }));
    setLastMsg((l) => ({ ...l, [cid]: temp }));

    const done = (raw: any) => {
      const m = mapMessage(raw, meId);
      setMessages((all) => ({ ...all, [cid]: (all[cid] ?? []).map((x) => (x.clientId === clientId ? { ...m, clientId } : x)) }));
      setLastMsg((l) => ({ ...l, [cid]: m }));
    };
    const fail = (msg: string) => {
      setMessages((all) => ({ ...all, [cid]: (all[cid] ?? []).filter((x) => x.clientId !== clientId) }));
      toast.error(msg);
    };

    if (connected()) {
      socketRef.current!.timeout(12000).emit('send_message', { conversationId: cid, message: body, clientMessageId: clientId }, (err: any, res: any) => {
        if (err) return fail('Message not sent - check your connection.');
        if (res?.success) done(res.message); else fail(res?.error || 'Message not sent.');
      });
    } else {
      chatService.send(cid, body, clientId).then(done, (e) => fail(errorMessage(e, 'Message not sent.')));
    }
  };

  const editMessage: Ctx['editMessage'] = (cid, mid, text) => {
    if (!connected()) return void toast.error("You're offline - reconnecting. Try again in a moment.");
    socketRef.current!.timeout(10000).emit('edit_message', { messageId: mid, message: text.trim() }, (err: any, res: any) => {
      if (err || !res?.success) return toast.error(res?.error || 'Could not edit the message.');
      const m = mapMessage(res.message, meId);
      setMessages((all) => ({ ...all, [cid]: upsertMsg(all[cid], m) }));
    });
  };

  const deleteMessage: Ctx['deleteMessage'] = (cid, mid) => {
    const mark = (v: boolean) => setMessages((all) => ({ ...all, [cid]: (all[cid] ?? []).map((x) => (x.id === mid ? { ...x, isDeleted: v } : x)) }));
    mark(true);
    const revert = (msg: string) => { mark(false); toast.error(msg); };
    if (connected()) {
      socketRef.current!.timeout(10000).emit('delete_message', { messageId: mid }, (err: any, res: any) => { if (err || !res?.success) revert(res?.error || 'Could not delete the message.'); });
    } else {
      chatService.remove(mid).catch((e) => revert(errorMessage(e)));
    }
  };

  const markRead: Ctx['markRead'] = (cid) => {
    if (!(unread[cid] > 0)) return;
    setUnread((u) => ({ ...u, [cid]: 0 }));
    setMessages((all) => (all[cid] ? { ...all, [cid]: all[cid].map((x) => (x.from === 'them' ? { ...x, isRead: true } : x)) } : all));
    if (connected()) socketRef.current!.emit('message_read', { conversationId: cid });
    else chatService.markConversationRead(cid).catch(() => {});
  };

  const setTyping: Ctx['setTyping'] = (cid, on) => { socketRef.current?.emit(on ? 'typing_start' : 'typing_stop', { conversationId: cid }); };

  const lastMessage = (cid: string) => {
    const loaded = messages[cid]?.filter((m) => !m.pending);
    return loaded?.length ? loaded[loaded.length - 1] : lastMsg[cid];
  };
  const unreadFor = (cid: string) => unread[cid] ?? 0;
  const unreadByKind = useMemo(() => {
    const out: Record<ChatKind, number> = { vet: 0, collab: 0, resell: 0 };
    conversations.forEach((c) => { out[c.kind] += unread[c.id] ?? 0; });
    return out;
  }, [conversations, unread]);

  const registerContact: Ctx['registerContact'] = (c) => setContacts((list) => (list.some((x) => x.id === c.id && x.kind === c.kind) ? list : [...list, c]));

  return (
    <ChatContext.Provider value={{
      contacts, conversations, messages, typing, loading, refresh, refreshQuiet, registerContact, startConversation, openConversation, closeConversation,
      sendMessage, editMessage, deleteMessage, markRead, setTyping, lastMessage, unreadFor, unreadByKind,
      totalUnread: unreadByKind.vet + unreadByKind.collab + unreadByKind.resell,
    }}>
      {children}
    </ChatContext.Provider>
  );
}

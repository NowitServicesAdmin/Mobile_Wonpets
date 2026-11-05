// Chat types + display helpers. Data comes from the API (see services/chat.service.ts and context/ChatContext.tsx).

export type ChatKind = 'vet' | 'collab' | 'resell';
export type PresenceStatus = 'online' | 'busy' | 'away' | 'on_leave' | 'offline';

export type ChatContact = { id: string; kind: ChatKind; name: string; emoji: string; subtitle: string; status?: PresenceStatus; image?: string };
export type ChatMessage = {
  id: string; conversationId: string; from: 'me' | 'them'; text: string; createdAt: string; isRead: boolean;
  isEdited?: boolean; isDeleted?: boolean; /** Automated text sent by the server when the doctor is not online. */ isAutoReply?: boolean;
  /** Local-only: still being sent. `clientId` ties the optimistic bubble to the server copy. */ pending?: boolean; clientId?: string;
};
export type Conversation = { id: string; kind: ChatKind; contactId: string; listing?: { id: string; title: string; price: number; emoji: string; image?: string } };

export const STATUS_LABEL: Record<PresenceStatus, string> = { online: 'Online', busy: 'Busy', away: 'Away', on_leave: 'On Leave', offline: 'Offline' };
export const STATUS_DOT: Record<PresenceStatus, string> = { online: 'bg-green', busy: 'bg-red', away: 'bg-yellow', on_leave: 'bg-slate-400', offline: 'bg-slate-300' };

export const formatTime = (iso: string) => new Date(iso).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
const sameDay = (a: Date, b: Date) => a.getDate() === b.getDate() && a.getMonth() === b.getMonth() && a.getFullYear() === b.getFullYear();
export const dayLabel = (iso: string) => {
  const d = new Date(iso); const today = new Date(); const y = new Date(); y.setDate(today.getDate() - 1);
  return sameDay(d, today) ? 'Today' : sameDay(d, y) ? 'Yesterday' : d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
};
export const sidebarTime = (iso: string) => { const l = dayLabel(iso); return l === 'Today' ? formatTime(iso) : l === 'Yesterday' ? 'Yesterday' : new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }); };

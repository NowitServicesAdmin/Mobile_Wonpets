import { api } from './api';

export const chatService = {
  async conversations(): Promise<any[]> {
    const { data } = await api.get('/chat/conversation');
    return data.conversations || [];
  },
  async startVet(receiverId: string) {
    const { data } = await api.post('/chat/conversation', { receiverId });
    return data.conversation;
  },
  async startCollab(otherUserId: string) {
    const { data } = await api.post('/chat/collaborator/start', { otherUserId });
    return data.conversation;
  },
  async startResell(sellerId: string, listingId?: string) {
    const { data } = await api.post('/chat/resell/start', { sellerId, listingId });
    return data.conversation;
  },
  async messages(conversationId: string): Promise<any[]> {
    const { data } = await api.get(`/chat/message/${conversationId}`, { params: { limit: 60 } });
    return data.messages || [];
  },
  /** REST fallback for when the socket is not connected. */
  async send(conversationId: string, message: string, clientMessageId: string) {
    const { data } = await api.post('/chat/message', { conversationId, message, clientMessageId });
    return data.message;
  },
  async remove(messageId: string) {
    await api.delete(`/chat/message/${messageId}`);
  },
  async markConversationRead(conversationId: string) {
    await api.patch(`/chat/conversation/${conversationId}/read`);
  },

  /** People the owner can chat with in the "Collab" tab: their accepted collaborators + owners who delegated access to them. */
  async collaboratorContacts(): Promise<{ id: string; name: string; subtitle: string }[]> {
    const out: { id: string; name: string; subtitle: string }[] = [];
    try {
      const { data } = await api.get('/collaborators/owned');
      (data.collaborators || []).filter((c: any) => c.status === 'accepted' && c.collaborator).forEach((c: any) => out.push({ id: String(c.collaborator._id), name: c.collaborator.name, subtitle: 'Collaborator' }));
    } catch { /* not allowed for this role */ }
    try {
      const { data } = await api.get('/collaborators/delegated');
      (data.accounts || []).filter((a: any) => a.owner).forEach((a: any) => out.push({ id: String(a.owner._id), name: a.owner.name, subtitle: 'Account owner' }));
    } catch { /* ignore */ }
    return out;
  },
};

import { api } from './api';
import { mapNotice } from './mappers';
import type { Notice } from '../data/mock';

export const notificationsService = {
  async list(page = 1): Promise<{ notices: Notice[]; unread: number; hasMore: boolean }> {
    const { data } = await api.get('/notifications', { params: { page, limit: 30 } });
    return { notices: (data.notifications || []).map(mapNotice), unread: data.unread ?? 0, hasMore: !!data.pagination?.hasMore };
  },
  async unreadCount(): Promise<number> {
    const { data } = await api.get('/notifications/unread-count');
    return data.unread ?? 0;
  },
  async markRead(id: string) {
    await api.patch(`/notifications/${id}/read`);
  },
  async markAllRead() {
    await api.patch('/notifications/read-all');
  },
};

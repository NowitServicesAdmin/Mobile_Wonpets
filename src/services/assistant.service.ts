import { api } from './api';

export type AssistantLink = { label: string; path: string };
export type AssistantProduct = { id: string; name: string; image?: string; price: number; originalPrice?: number | null; discount?: number; path?: string };
export type AssistantHistoryItem = { role: 'user' | 'model'; text: string };
export type AssistantReply = {
  reply: string;
  links: AssistantLink[];
  products: AssistantProduct[];
  action?: { type: string };
};

export const assistantService = {
  /** POST /api/ai-assistant/message - same endpoint the web WonPet AI uses (role comes from the login token). */
  async send(message: string, history: AssistantHistoryItem[], intent?: string): Promise<AssistantReply> {
    const { data } = await api.post('/ai-assistant/message', { message, history, intent }, { timeout: 45000 });
    return {
      reply: data.reply ?? data.message ?? data.response ?? 'No response received.',
      links: Array.isArray(data.links) ? data.links : [],
      products: Array.isArray(data.products) ? data.products : [],
      action: data.action,
    };
  },
};
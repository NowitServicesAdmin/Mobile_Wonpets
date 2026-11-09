import { api } from './api';

export type SearchItem = { id?: string; title: string; subtitle?: string; image?: string; badge?: string; path: string };
export type SearchGroup = { label: string; items: SearchItem[] };

/**
 * Same endpoint the web header search uses (GET /search?q=) - the server scopes results to the logged-in role.
 * scope "shared" searches the accounts shared with the user ("Shared With Me" / collaborator mode), like the web.
 */
export const searchService = {
  async global(q: string, signal?: AbortSignal, scope?: 'shared'): Promise<SearchGroup[]> {
    const { data } = await api.get('/search', { params: { q, ...(scope ? { scope } : {}) }, signal });
    return Array.isArray(data?.groups) ? data.groups : [];
  },
};

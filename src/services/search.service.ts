import { api } from './api';

export type SearchItem = { id?: string; title: string; subtitle?: string; image?: string; badge?: string; path: string };
export type SearchGroup = { label: string; items: SearchItem[] };

/** Same endpoint the web header search uses (GET /search?q=) - the server scopes results to the logged-in role. */
export const searchService = {
  async global(q: string, signal?: AbortSignal): Promise<SearchGroup[]> {
    const { data } = await api.get('/search', { params: { q }, signal });
    return Array.isArray(data?.groups) ? data.groups : [];
  },
};
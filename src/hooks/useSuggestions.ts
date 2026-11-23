import { useCallback, useEffect, useRef, useState } from 'react';
import { Keyboard } from 'react-native';

export type Suggestion = { id: string; title: string; subtitle?: string; image?: string; emoji?: string };
type Fetcher = (q: string, signal: AbortSignal) => Promise<Suggestion[]> | Suggestion[];

/**
 * Live "as you type" suggestions for one search box.
 * - waits `delay` ms after the last keystroke, ignores answers that arrive late
 * - `visible` is true only while the box is in use (typing / focused) and has enough characters
 * - the list closes on pick, on submit and when the keyboard hides
 * The fetcher decides WHERE it searches (store products only, resell listings only, ...).
 */
export function useSuggestions(query: string, fetcher: Fetcher, opts: { min?: number; delay?: number } = {}) {
  const { min = 2, delay = 250 } = opts;
  const q = query.trim();
  const [items, setItems] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const fetchRef = useRef(fetcher);
  fetchRef.current = fetcher;

  useEffect(() => {
    if (q.length < min) { setItems([]); setLoading(false); return; }
    const ctl = new AbortController();
    setLoading(true);
    const t = setTimeout(async () => {
      try {
        const r = await fetchRef.current(q, ctl.signal);
        if (!ctl.signal.aborted) setItems(r);
      } catch {
        if (!ctl.signal.aborted) setItems([]);
      } finally {
        if (!ctl.signal.aborted) setLoading(false);
      }
    }, delay);
    return () => { ctl.abort(); clearTimeout(t); };
  }, [q, min, delay]);

  useEffect(() => {
    const s = Keyboard.addListener('keyboardDidHide', () => setOpen(false));
    return () => s.remove();
  }, []);

  const show = useCallback(() => setOpen(true), []);
  const hide = useCallback(() => setOpen(false), []);
  return { items, loading, visible: open && q.length >= min, show, hide };
}
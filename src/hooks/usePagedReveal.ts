import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

/**
 * Reveals an in-memory list `pageSize` rows at a time. When the user nears the end of the list,
 * `loadingMore` turns true for a short moment (so the screen can show skeleton rows) and then the
 * next batch is revealed. Starts again from the first batch whenever `resetKey` changes
 * (new tab / search).
 */
export function usePagedReveal<T>(list: T[], pageSize = 6, resetKey?: unknown, delayMs = 600) {
  const [shown, setShown] = useState(pageSize);
  const [loadingMore, setLoadingMore] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTimer = () => { if (timer.current) { clearTimeout(timer.current); timer.current = null; } };

  useEffect(() => { clearTimer(); setLoadingMore(false); setShown(pageSize); }, [resetKey, pageSize]);
  useEffect(() => clearTimer, []);

  const hasMore = shown < list.length;
  const items = useMemo(() => list.slice(0, shown), [list, shown]);

  const loadMore = useCallback(() => {
    if (!hasMore || timer.current) return;
    setLoadingMore(true);
    timer.current = setTimeout(() => {
      timer.current = null;
      setShown((n) => Math.min(n + pageSize, list.length));
      setLoadingMore(false);
    }, delayMs);
  }, [hasMore, list.length, pageSize, delayMs]);

  return { items, hasMore, loadingMore, loadMore, total: list.length };
}
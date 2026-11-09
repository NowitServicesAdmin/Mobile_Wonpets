import { useCallback, useEffect, useMemo, useState } from 'react';

/**
 * Scroll-to-load-more for lists that are already in memory: reveals `pageSize` more rows each time
 * the user nears the end, and starts again from the top whenever `resetKey` changes (new search / filter).
 * (Same behaviour the Appointments / Store / Resell screens had inline.)
 */
export function useInfiniteSlice<T>(list: T[], pageSize = 6, resetKey?: unknown) {
  const [shown, setShown] = useState(pageSize);
  useEffect(() => { setShown(pageSize); }, [resetKey, pageSize]);
  const items = useMemo(() => list.slice(0, shown), [list, shown]);
  const hasMore = shown < list.length;
  const loadMore = useCallback(() => { if (hasMore) setShown((n) => Math.min(n + pageSize, list.length)); }, [hasMore, list.length, pageSize]);
  return { items, hasMore, loadMore, total: list.length };
}

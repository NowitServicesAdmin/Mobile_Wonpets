import { DependencyList, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { NavigationContext } from '@react-navigation/native';
import { errorMessage } from '../services/api';

/**
 * One loader for every "fetch something and show it" screen.
 *  - `loading`    true only for a (re)load triggered by `deps` changing - show a skeleton
 *  - `refreshing` true during pull-to-refresh - show the RefreshControl spinner
 *  - quiet reloads (`quietKey` changing, e.g. the live-sync tick) never flash a spinner or an error
 *  - a quiet reload is held back while the screen is not in front (other tabs / screens buried in the stack)
 *    and runs once when the screen comes back, so one live tick no longer fans out into a request per mounted screen
 * Out-of-order answers are dropped, so quickly switching a filter / date can never show stale data.
 */
export function useRemote<T>(fetcher: () => Promise<T>, deps: DependencyList = [], quietKey?: unknown) {
  const [data, setData] = useState<T | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fetchRef = useRef(fetcher);
  fetchRef.current = fetcher;
  const seq = useRef(0);
  const nav = useContext(NavigationContext);   // undefined outside a navigator
  const missedTick = useRef(false);

  const run = useCallback(async (mode: 'load' | 'pull' | 'quiet') => {
    const id = ++seq.current;
    if (mode === 'load') { setLoading(true); setError(null); }
    if (mode === 'pull') setRefreshing(true);
    try {
      const d = await fetchRef.current();
      if (id === seq.current) { setData(d); setError(null); }
    } catch (e) {
      if (id === seq.current && mode !== 'quiet') setError(errorMessage(e));
    } finally {
      if (id === seq.current) { setLoading(false); setRefreshing(false); }
    }
  }, []);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { run('load'); }, deps);
  const first = useRef(true);
  useEffect(() => {
    if (first.current) { first.current = false; return; }
    if (nav && !nav.isFocused()) { missedTick.current = true; return; }
    run('quiet');
  }, [quietKey, run]);   // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!nav) return;
    return nav.addListener('focus', () => {
      if (missedTick.current) { missedTick.current = false; run('quiet'); }
    });
  }, [nav, run]);

  return {
    data, loading, refreshing, error, setData,
    /** pull-to-refresh */ reload: useCallback(() => run('pull'), [run]),
    /** silent refetch (after an action) */ reloadQuiet: useCallback(() => run('quiet'), [run]),
  };
}
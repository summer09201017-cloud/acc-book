import { useEffect, useState } from 'react';

export type TabKey = 'today' | 'records' | 'charts' | 'reports' | 'settings';

const TAB_KEYS: TabKey[] = ['today', 'records', 'charts', 'reports', 'settings'];
const LS_KEY = 'active-tab';

const isTabKey = (v: unknown): v is TabKey =>
  typeof v === 'string' && (TAB_KEYS as string[]).includes(v);

export function useActiveTab(initial: TabKey = 'today'): [TabKey, (t: TabKey) => void] {
  const [tab, setTab] = useState<TabKey>(() => {
    try {
      const saved = localStorage.getItem(LS_KEY);
      return isTabKey(saved) ? saved : initial;
    } catch {
      return initial;
    }
  });

  useEffect(() => {
    try { localStorage.setItem(LS_KEY, tab); } catch { /* ignore */ }
  }, [tab]);

  return [tab, setTab];
}

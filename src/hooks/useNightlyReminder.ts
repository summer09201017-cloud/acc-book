import { useEffect } from 'react';
import { Transaction } from '../db/schema';
import { ymd } from '../utils/dateRange';
import { useSettings } from './useSettings';

const FIRED_KEY = 'expense-nightly-fired-date';
// 23 * 60 + 30 — minutes after midnight when we should remind.
const REMIND_AFTER_MINUTES = 23 * 60 + 30;
const CHECK_INTERVAL_MS = 60_000;

const minutesSinceMidnight = (d: Date) => d.getHours() * 60 + d.getMinutes();

// Drives the "23:30 reminder" UX: while the page is open, poll once a minute
// and surface a Notification if the user hasn't logged anything today.
// Best-effort only — closing the tab means no reminder; that's an accepted
// tradeoff for a pure PWA with no backend.
export function useNightlyReminder(transactions: Transaction[]) {
  const { settings } = useSettings();

  useEffect(() => {
    if (!settings.nightlyReminder) return;
    if (typeof Notification === 'undefined') return;

    let cancelled = false;
    const tick = () => {
      if (cancelled) return;
      if (Notification.permission !== 'granted') return;
      const now = new Date();
      if (minutesSinceMidnight(now) < REMIND_AFTER_MINUTES) return;
      const todayKey = ymd(now);
      let alreadyFired: string | null = null;
      try { alreadyFired = localStorage.getItem(FIRED_KEY); } catch { /* ignore */ }
      if (alreadyFired === todayKey) return;
      const hasToday = transactions.some((t) => t.date === todayKey);
      if (hasToday) return;
      try {
        new Notification('別讓連續記帳斷掉!', {
          body: '今天還沒記任何一筆,點開來補一下吧 💸',
          tag: 'nightly-streak',
        });
      } catch { /* ignore */ }
      try { localStorage.setItem(FIRED_KEY, todayKey); } catch { /* ignore */ }
    };

    tick();
    const interval = window.setInterval(tick, CHECK_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [settings.nightlyReminder, transactions]);
}

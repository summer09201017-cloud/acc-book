import { useEffect, useRef } from 'react';
import { db } from '../db/db';
import { Transaction } from '../db/schema';
import { ymd } from '../utils/dateRange';
import { enumerateOccurrences } from '../utils/recurring';

const newId = () =>
  (typeof crypto !== 'undefined' && 'randomUUID' in crypto)
    ? crypto.randomUUID()
    : `id-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

// Runs once after the app is ready: for each enabled recurring rule, generate
// any transactions for occurrence dates that have elapsed but weren't recorded yet,
// up to today (inclusive). Catch-up is idempotent — `lastGeneratedFor` tracks the
// most recent occurrence we created, so reopening the app doesn't double-insert.
export function useRecurringCatchup(isReady: boolean) {
  const ranRef = useRef(false);

  useEffect(() => {
    if (!isReady) return;
    if (ranRef.current) return;
    ranRef.current = true;

    (async () => {
      try {
        const rules = await db.recurringRules.toArray();
        if (rules.length === 0) return;
        const today = ymd(new Date());

        for (const rule of rules) {
          if (!rule.enabled) continue;
          const dates = enumerateOccurrences(rule, rule.lastGeneratedFor ?? null, today);
          if (dates.length === 0) continue;

          const now = Date.now();
          const txs: Transaction[] = dates.map((date, i) => ({
            id: newId(),
            type: rule.type,
            amount: rule.amount,
            categoryId: rule.categoryId,
            date,
            note: rule.note || rule.label,
            createdAt: now + i,
          }));

          await db.transaction('rw', db.transactions, db.recurringRules, async () => {
            await db.transactions.bulkAdd(txs);
            await db.recurringRules.update(rule.id, {
              lastGeneratedFor: dates[dates.length - 1],
            });
          });
        }
      } catch (err) {
        console.warn('[recurring] catch-up failed', err);
      }
    })();
  }, [isReady]);
}

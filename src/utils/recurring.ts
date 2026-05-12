import { RecurringRule } from '../db/schema';
import { pad2, ymd } from './dateRange';

// Enumerate every occurrence date (YYYY-MM-DD) of a rule strictly after `afterDate`
// and on/before `untilDate`, in chronological order.
//
// - For monthly rules: emit one date per month at `dayOfMonth`, clamped to the
//   last day of the month if that month doesn't have it (e.g. 31 → Feb 28/29).
// - For weekly rules: emit dates whose weekday matches `weekday`.
//
// Both kinds respect startDate (inclusive) and endDate (inclusive if present).
export function enumerateOccurrences(
  rule: RecurringRule,
  afterDate: string | null,
  untilDate: string
): string[] {
  if (!rule.enabled) return [];
  if (afterDate && afterDate >= untilDate) return [];
  const out: string[] = [];
  const startBound = rule.startDate;
  const endBound = rule.endDate;

  const include = (iso: string) => {
    if (iso < startBound) return;
    if (endBound && iso > endBound) return;
    if (iso > untilDate) return;
    if (afterDate && iso <= afterDate) return;
    out.push(iso);
  };

  if (rule.frequency === 'monthly') {
    const day = rule.dayOfMonth ?? 1;
    // Walk month-by-month from startDate's year/month forward until we pass untilDate.
    const [sy, sm] = startBound.split('-').map(Number);
    let year = sy;
    let month = sm; // 1-12
    while (true) {
      const lastDay = new Date(year, month, 0).getDate();
      const clamped = Math.min(day, lastDay);
      const iso = `${year}-${pad2(month)}-${pad2(clamped)}`;
      if (iso > untilDate) break;
      include(iso);
      month++;
      if (month > 12) { month = 1; year++; }
      if (year > 9999) break;
    }
    return out;
  }

  // weekly
  const weekday = rule.weekday ?? 1;
  const [sy, sm, sd] = startBound.split('-').map(Number);
  const cursor = new Date(sy, sm - 1, sd);
  // Advance to first matching weekday on/after startDate.
  while (cursor.getDay() !== weekday) {
    cursor.setDate(cursor.getDate() + 1);
  }
  const limit = new Date(untilDate);
  while (cursor <= limit) {
    include(ymd(cursor));
    cursor.setDate(cursor.getDate() + 7);
  }
  return out;
}

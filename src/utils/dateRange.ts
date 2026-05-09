// Date helpers used by month summary / reports / charts / budgets.
// All operate on YYYY-MM-DD strings to match Transaction.date.

export const pad2 = (n: number) => String(n).padStart(2, '0');

export const ymd = (d: Date) =>
  `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;

export const ym = (d: Date) =>
  `${d.getFullYear()}-${pad2(d.getMonth() + 1)}`;

export interface MonthRange {
  year: number;
  month: number;     // 1-12
  start: string;     // YYYY-MM-01
  end: string;       // last day of month, YYYY-MM-DD (inclusive)
  daysInMonth: number;
}

export function monthRange(year: number, month: number): MonthRange {
  const daysInMonth = new Date(year, month, 0).getDate();
  return {
    year,
    month,
    start: `${year}-${pad2(month)}-01`,
    end: `${year}-${pad2(month)}-${pad2(daysInMonth)}`,
    daysInMonth,
  };
}

export function currentMonth(now = new Date()): MonthRange {
  return monthRange(now.getFullYear(), now.getMonth() + 1);
}

export function previousMonth(now = new Date()): MonthRange {
  const y = now.getFullYear();
  const m = now.getMonth() + 1; // 1-12
  if (m === 1) return monthRange(y - 1, 12);
  return monthRange(y, m - 1);
}

// Sum of transactions in [start, end] inclusive, for the given type.
export function sumInRange<T extends { date: string; amount: number; type: 'income' | 'expense' }>(
  rows: T[],
  type: 'income' | 'expense',
  start: string,
  end: string
): number {
  let total = 0;
  for (const r of rows) {
    if (r.type !== type) continue;
    if (r.date < start || r.date > end) continue;
    total += r.amount;
  }
  return total;
}

// "Same period of last month" — up to and including the same day-of-month
// as today, clamped to the last day of last month if necessary.
export function lastMonthSamePeriod(now = new Date()): { start: string; end: string } {
  const prev = previousMonth(now);
  const today = now.getDate();
  const cap = Math.min(today, prev.daysInMonth);
  return {
    start: prev.start,
    end: `${prev.year}-${pad2(prev.month)}-${pad2(cap)}`,
  };
}

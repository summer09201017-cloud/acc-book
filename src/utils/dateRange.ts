// Date helpers used by month summary / reports / charts / budgets.
// All operate on YYYY-MM-DD strings to match Transaction.date.

export const pad2 = (n: number) => String(n).padStart(2, '0');

export const ymd = (d: Date) =>
  `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;

export const ym = (d: Date) =>
  `${d.getFullYear()}-${pad2(d.getMonth() + 1)}`;

export interface DateRange {
  start: string;
  end: string;
}

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

export function monthRangeFromYm(yearMonth: string): MonthRange {
  const [year, month] = yearMonth.split('-').map(Number);
  return monthRange(year, month);
}

export function formatYearMonth(yearMonth: string): string {
  const [year, month] = yearMonth.split('-').map(Number);
  return `${year} 年 ${month} 月`;
}

export function currentMonth(now = new Date()): MonthRange {
  return monthRange(now.getFullYear(), now.getMonth() + 1);
}

export function previousMonthOf(range: MonthRange): MonthRange {
  if (range.month === 1) return monthRange(range.year - 1, 12);
  return monthRange(range.year, range.month - 1);
}

export function previousMonth(now = new Date()): MonthRange {
  const y = now.getFullYear();
  const m = now.getMonth() + 1; // 1-12
  if (m === 1) return monthRange(y - 1, 12);
  return monthRange(y, m - 1);
}

export function weekRange(now = new Date()): DateRange {
  const start = new Date(now);
  start.setDate(now.getDate() - now.getDay());
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  return { start: ymd(start), end: ymd(end) };
}

export function weekToDateRange(now = new Date()): DateRange {
  const week = weekRange(now);
  return { start: week.start, end: ymd(now) };
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

// Returns the same day-of-month from the previous month for a given YYYY-MM-DD,
// clamped to the last day of last month if necessary (e.g. 3/31 → 2/28).
export function sameDayLastMonth(date: string): string {
  const [y, m, d] = date.split('-').map(Number);
  const prev = m === 1 ? monthRange(y - 1, 12) : monthRange(y, m - 1);
  const day = Math.min(d, prev.daysInMonth);
  return `${prev.year}-${pad2(prev.month)}-${pad2(day)}`;
}

// Walks back from `today` and counts consecutive days that contain at least one
// transaction. Today itself is included as long as something was logged.
// Treats "yesterday with records but today without" as breaking the streak.
export function calcStreakDays<T extends { date: string }>(rows: T[], today: string): number {
  if (rows.length === 0) return 0;
  const set = new Set<string>();
  for (const r of rows) set.add(r.date);
  if (!set.has(today)) return 0;

  let streak = 0;
  const [ty, tm, td] = today.split('-').map(Number);
  const cursor = new Date(ty, tm - 1, td);
  while (true) {
    const key = ymd(cursor);
    if (!set.has(key)) break;
    streak++;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

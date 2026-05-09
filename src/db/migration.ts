import { db } from './db';
import { Category, Transaction, META_MIGRATION_DONE } from './schema';
import { DEFAULT_CATEGORIES, V1_CATEGORY_MAP } from './defaultCategories';

const V1_LS_KEY = 'expense-transactions';
const V1_BACKUP_KEY = 'expense-transactions-v1-backup';

interface V1Transaction {
  id: string;
  type: 'income' | 'expense';
  amount: number;
  category: string;
  date: string;
  note: string;
}

const newId = () =>
  (typeof crypto !== 'undefined' && 'randomUUID' in crypto)
    ? crypto.randomUUID()
    : `id-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

async function seedDefaultsIfEmpty(): Promise<Map<string, string>> {
  // Returns a map of "type|name" -> categoryId so callers can resolve.
  const existing = await db.categories.toArray();
  const lookup = new Map<string, string>();
  if (existing.length > 0) {
    existing.forEach((c) => lookup.set(`${c.type}|${c.name}`, c.id));
    return lookup;
  }
  const records: Category[] = DEFAULT_CATEGORIES.map((c) => ({ ...c, id: newId() }));
  await db.categories.bulkAdd(records);
  records.forEach((c) => lookup.set(`${c.type}|${c.name}`, c.id));
  return lookup;
}

export async function runMigrationIfNeeded(): Promise<void> {
  const done = await db.meta.get(META_MIGRATION_DONE);
  if (done?.value === true) return;

  const lookup = await seedDefaultsIfEmpty();

  // Pull old v1 data from localStorage if present.
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(V1_LS_KEY);
  } catch {
    raw = null;
  }

  if (raw) {
    try {
      const v1: V1Transaction[] = JSON.parse(raw);
      if (Array.isArray(v1) && v1.length > 0) {
        const fallbackExpense = lookup.get('expense|其他')!;
        const fallbackIncome = lookup.get('income|其他')!;
        const now = Date.now();
        const migrated: Transaction[] = v1.map((t, i) => {
          const map = V1_CATEGORY_MAP[t.category];
          const key = map ? `${map.type}|${map.name}` : null;
          const categoryId =
            (key && lookup.get(key)) ||
            (t.type === 'expense' ? fallbackExpense : fallbackIncome);
          return {
            id: t.id || newId(),
            type: t.type,
            amount: Number(t.amount) || 0,
            categoryId,
            date: t.date,
            note: t.note || '',
            createdAt: now - (v1.length - i),
          };
        });
        await db.transactions.bulkAdd(migrated);

        // Keep a backup of the raw v1 payload, then clear the live key.
        try {
          localStorage.setItem(V1_BACKUP_KEY, raw);
          localStorage.removeItem(V1_LS_KEY);
        } catch {
          // ignore storage errors
        }
      }
    } catch (e) {
      console.warn('[migration] failed to parse v1 payload, leaving as-is', e);
    }
  }

  await db.meta.put({ key: META_MIGRATION_DONE, value: true });
}

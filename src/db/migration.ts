import { db } from './db';
import { Category, Transaction, META_MIGRATION_DONE, META_BUILTIN_REFRESH } from './schema';
import { DEFAULT_CATEGORIES, BUILTIN_RENAMES, V1_CATEGORY_MAP } from './defaultCategories';

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

// Three-phase pass that brings existing built-ins onto the latest spec without losing
// the row id (so all referencing transactions and budgets keep working):
//   1. Apply renames     — same row, new name (e.g. 學習 → 教育).
//   2. Refresh appearance — overwrite emoji / bgColor / group / sortOrder; clear iconName
//                           since built-ins are now emoji-only.
//   3. Demote orphans     — any isBuiltin row not in DEFAULT_CATEGORIES becomes user-owned
//                           so the user can edit / delete it from the manager UI.
// Top-up of genuinely new built-ins is handled by topUpMissingBuiltins() and runs every launch.
async function refreshBuiltinDefaultsOnce(): Promise<void> {
  const done = await db.meta.get(META_BUILTIN_REFRESH);
  if (done?.value === true) return;

  // Phase 1: renames
  for (const r of BUILTIN_RENAMES) {
    const all = await db.categories.toArray();
    const target = all.find((c) => c.isBuiltin && c.type === r.type && c.name === r.oldName);
    if (!target) continue;
    // Skip if a built-in with the new name already exists (would conflict).
    const dup = all.find((c) => c.isBuiltin && c.type === r.type && c.name === r.newName);
    if (dup) continue;
    await db.categories.update(target.id, { name: r.newName });
  }

  // Phase 2: appearance refresh
  const allCategories = await db.categories.toArray();
  for (const spec of DEFAULT_CATEGORIES) {
    const target = allCategories.find(
      (c) => c.isBuiltin && c.type === spec.type && c.name === spec.name
    );
    if (!target) continue;
    const next: Category = {
      ...target,
      emoji: spec.emoji,
      bgColor: spec.bgColor,
      group: spec.group,
      sortOrder: spec.sortOrder,
    };
    delete (next as Partial<Category>).iconName;
    await db.categories.put(next);
  }

  // Phase 3: demote orphan built-ins (no longer in spec) so users can manage them.
  const newKeys = new Set(DEFAULT_CATEGORIES.map((d) => `${d.type}|${d.name}`));
  for (const c of allCategories) {
    if (!c.isBuiltin) continue;
    if (newKeys.has(`${c.type}|${c.name}`)) continue;
    // Skip if it was already renamed in phase 1 (it's no longer the same row).
    const wasRenamed = BUILTIN_RENAMES.some((r) => r.type === c.type && r.oldName === c.name);
    if (wasRenamed) continue;
    await db.categories.update(c.id, { isBuiltin: false });
  }

  await db.meta.put({ key: META_BUILTIN_REFRESH, value: true });
}

async function topUpMissingBuiltins(): Promise<void> {
  // Add any built-in defaults that don't exist yet (matched by type|name).
  // Runs every launch so future expansions of DEFAULT_CATEGORIES reach existing users.
  // Custom categories with the same name are treated as user-owned and skipped.
  const existing = await db.categories.toArray();
  const existingKeys = new Set(existing.map((c) => `${c.type}|${c.name}`));
  const missing = DEFAULT_CATEGORIES.filter((c) => !existingKeys.has(`${c.type}|${c.name}`));
  if (missing.length === 0) return;
  const records: Category[] = missing.map((c) => ({ ...c, id: newId() }));
  await db.categories.bulkAdd(records);
}

export async function runMigrationIfNeeded(): Promise<void> {
  const done = await db.meta.get(META_MIGRATION_DONE);
  if (done?.value === true) {
    await refreshBuiltinDefaultsOnce();
    await topUpMissingBuiltins();
    return;
  }

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
  // For first-time users seeded above, the refresh flag is set immediately to skip the no-op pass next launch.
  await db.meta.put({ key: META_BUILTIN_REFRESH, value: true });
}

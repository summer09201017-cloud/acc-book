import { db } from '../db/db';
import { Budget, Category, SCHEMA_VERSION, Transaction } from '../db/schema';

export interface ExportPayload {
  app: 'expense-tracker';
  schemaVersion: number;
  exportedAt: string;
  transactions: Transaction[];
  categories: Category[];
  budgets: Budget[];
}

export async function buildExportPayload(): Promise<ExportPayload> {
  const [transactions, categories, budgets] = await Promise.all([
    db.transactions.toArray(),
    db.categories.toArray(),
    db.budgets.toArray(),
  ]);
  return {
    app: 'expense-tracker',
    schemaVersion: SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    transactions,
    categories,
    budgets,
  };
}

export function downloadJson(filename: string, data: unknown) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  // Give the browser a tick to start the download before revoking.
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export interface ImportSummary {
  txAdded: number;
  txSkipped: number;
  catAdded: number;
  budgetsApplied: number;
}

function isExportPayload(x: any): x is ExportPayload {
  return x && typeof x === 'object'
    && x.app === 'expense-tracker'
    && Array.isArray(x.transactions)
    && Array.isArray(x.categories);
}

// Merge import: keep existing data, add anything we don't already have.
// - Categories: matched by (type|name); skipped if already present.
// - Transactions: matched by id; skipped if already present.
// - Budgets: matched by categoryId — newer updatedAt wins.
export async function importFromJson(file: File): Promise<ImportSummary> {
  const text = await file.text();
  const parsed = JSON.parse(text);
  if (!isExportPayload(parsed)) throw new Error('檔案格式不符');

  const summary: ImportSummary = { txAdded: 0, txSkipped: 0, catAdded: 0, budgetsApplied: 0 };

  await db.transaction('rw', db.categories, db.transactions, db.budgets, async () => {
    // categories: build (type|name) lookup of existing rows
    const existingCats = await db.categories.toArray();
    const catKey = (c: { type: string; name: string }) => `${c.type}|${c.name}`;
    const lookup = new Map<string, string>();
    existingCats.forEach((c) => lookup.set(catKey(c), c.id));

    // also need to remap incoming categoryId -> our local categoryId
    const remap = new Map<string, string>();

    for (const c of parsed.categories) {
      const key = catKey(c);
      const localId = lookup.get(key);
      if (localId) {
        remap.set(c.id, localId);
      } else {
        await db.categories.add(c);
        lookup.set(key, c.id);
        remap.set(c.id, c.id);
        summary.catAdded++;
      }
    }

    // transactions: skip if id already exists
    const existingTxIds = new Set(await db.transactions.toCollection().primaryKeys());
    for (const tx of parsed.transactions) {
      if (existingTxIds.has(tx.id)) {
        summary.txSkipped++;
        continue;
      }
      const mappedCat = remap.get(tx.categoryId) ?? tx.categoryId;
      await db.transactions.add({ ...tx, categoryId: mappedCat });
      summary.txAdded++;
    }

    // budgets: newer updatedAt wins
    if (Array.isArray(parsed.budgets)) {
      for (const b of parsed.budgets) {
        const mappedCat = remap.get(b.categoryId) ?? b.categoryId;
        const existing = await db.budgets.get(mappedCat);
        if (!existing || (b.updatedAt ?? 0) > (existing.updatedAt ?? 0)) {
          await db.budgets.put({ ...b, categoryId: mappedCat });
          summary.budgetsApplied++;
        }
      }
    }
  });

  return summary;
}

import { db } from '../db/db';
import { Budget, Category, SCHEMA_VERSION, Transaction, TransactionType } from '../db/schema';

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

export function downloadCsv(filename: string, csv: string) {
  const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
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

const newId = () =>
  (typeof crypto !== 'undefined' && 'randomUUID' in crypto)
    ? crypto.randomUUID()
    : `id-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

const csvHeaders = ['id', 'type', 'date', 'amount', 'category', 'note', 'createdAt'] as const;

const escapeCsvCell = (value: unknown): string => {
  const s = String(value ?? '');
  if (/[",\r\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
};

function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let inQuotes = false;
  const src = text.replace(/^\uFEFF/, '');

  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    const next = src[i + 1];

    if (inQuotes) {
      if (ch === '"' && next === '"') {
        cell += '"';
        i++;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        cell += ch;
      }
      continue;
    }

    if (ch === '"') {
      inQuotes = true;
    } else if (ch === ',') {
      row.push(cell);
      cell = '';
    } else if (ch === '\n') {
      row.push(cell);
      rows.push(row);
      row = [];
      cell = '';
    } else if (ch !== '\r') {
      cell += ch;
    }
  }

  row.push(cell);
  if (row.some((v) => v.trim() !== '')) rows.push(row);
  return rows;
}

const isTxType = (value: string): value is TransactionType =>
  value === 'income' || value === 'expense';

const isYmd = (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value);

export async function buildTransactionsCsv(): Promise<string> {
  const [transactions, categories] = await Promise.all([
    db.transactions.toArray(),
    db.categories.toArray(),
  ]);
  const categoryMap = new Map(categories.map((c) => [c.id, c]));
  const sorted = transactions.slice().sort((a, b) => {
    if (a.date !== b.date) return a.date < b.date ? -1 : 1;
    return a.createdAt - b.createdAt;
  });
  const rows = sorted.map((tx) => {
    const cat = categoryMap.get(tx.categoryId);
    return [
      tx.id,
      tx.type,
      tx.date,
      tx.amount,
      cat?.name ?? '',
      tx.note,
      tx.createdAt,
    ].map(escapeCsvCell).join(',');
  });
  return [csvHeaders.join(','), ...rows].join('\n');
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

export async function importFromCsv(file: File): Promise<ImportSummary> {
  const rows = parseCsv(await file.text());
  if (rows.length < 1) throw new Error('CSV 檔案是空的');

  const header = rows[0].map((h) => h.trim());
  const index = new Map(header.map((h, i) => [h, i]));
  for (const required of ['type', 'date', 'amount', 'category']) {
    if (!index.has(required)) throw new Error(`CSV 缺少欄位：${required}`);
  }

  const summary: ImportSummary = { txAdded: 0, txSkipped: 0, catAdded: 0, budgetsApplied: 0 };

  await db.transaction('rw', db.categories, db.transactions, async () => {
    const categories = await db.categories.toArray();
    const categoryKey = (type: string, name: string) => `${type}|${name.trim()}`;
    const categoryLookup = new Map<string, string>();
    categories.forEach((c) => categoryLookup.set(categoryKey(c.type, c.name), c.id));
    const fallbackByType = new Map<TransactionType, string>();
    categories
      .filter((c) => c.isBuiltin && c.name === '其他')
      .forEach((c) => fallbackByType.set(c.type, c.id));

    const existingTxIds = new Set(await db.transactions.toCollection().primaryKeys());

    for (const row of rows.slice(1)) {
      const value = (name: string) => row[index.get(name) ?? -1]?.trim() ?? '';
      const type = value('type');
      const date = value('date');
      const amount = Number(value('amount'));
      const categoryName = value('category');

      if (!isTxType(type) || !isYmd(date) || !Number.isFinite(amount) || amount <= 0) {
        summary.txSkipped++;
        continue;
      }

      const incomingId = value('id');
      const id = incomingId || newId();
      if (existingTxIds.has(id)) {
        summary.txSkipped++;
        continue;
      }

      const categoryId =
        categoryLookup.get(categoryKey(type, categoryName)) ??
        fallbackByType.get(type);

      if (!categoryId) {
        summary.txSkipped++;
        continue;
      }

      const createdAtRaw = Number(value('createdAt'));
      const tx: Transaction = {
        id,
        type,
        amount,
        categoryId,
        date,
        note: row[index.get('note') ?? -1] ?? '',
        createdAt: Number.isFinite(createdAtRaw) && createdAtRaw > 0
          ? createdAtRaw
          : Date.now(),
      };
      await db.transactions.add(tx);
      existingTxIds.add(id);
      summary.txAdded++;
    }
  });

  return summary;
}

export type TransactionType = 'income' | 'expense';

export interface Category {
  id: string;
  type: TransactionType;
  name: string;
  // Visual identity: prefer emoji; fall back to lucide icon name when emoji is empty.
  emoji: string;
  iconName?: string;
  bgColor: string;
  group: string;
  isBuiltin: boolean;
  sortOrder: number;
}

export interface Transaction {
  id: string;
  type: TransactionType;
  amount: number;
  categoryId: string;
  date: string;
  note: string;
  createdAt: number;
}

export interface Budget {
  categoryId: string;
  monthlyLimit: number;
  updatedAt: number;
}

export interface Template {
  id: string;
  label: string;          // 顯示名稱(早餐、星巴克 中杯…)
  type: TransactionType;
  amount: number;
  categoryId: string;
  note: string;
  sortOrder: number;
  createdAt: number;
}

export type RecurringFrequency = 'monthly' | 'weekly';

export interface RecurringRule {
  id: string;
  label: string;          // e.g. Netflix、房租、薪資
  type: TransactionType;
  amount: number;
  categoryId: string;
  note: string;
  frequency: RecurringFrequency;
  dayOfMonth?: number;    // 1-28 for monthly
  weekday?: number;       // 0 (Sun) .. 6 (Sat) for weekly
  startDate: string;      // YYYY-MM-DD; first occurrence eligibility
  endDate?: string;       // optional cutoff
  lastGeneratedFor?: string; // YYYY-MM-DD of the most recent occurrence we created
  enabled: boolean;
  createdAt: number;
}

export interface AppMeta {
  key: string;
  value: unknown;
}

// App-level version stamp written into JSON exports; not the same as Dexie's db.version().
// 3 added budgets; 4 adds templates and recurring rules.
export const SCHEMA_VERSION = 4;
export const META_MIGRATION_DONE = 'migrationFromV1Done';
// Bumped each time we ship a refresh that rewrites built-in defaults' emoji / name / sortOrder.
// Increment this constant when adding a new refresh pass; old passes can be retired once everyone has run them.
export const META_BUILTIN_REFRESH = 'builtinRefreshV2Done';

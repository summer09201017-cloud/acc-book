export type TransactionType = 'income' | 'expense';

export interface Category {
  id: string;
  type: TransactionType;
  name: string;
  emoji: string;
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

export interface AppMeta {
  key: string;
  value: unknown;
}

export const SCHEMA_VERSION = 2;
export const META_MIGRATION_DONE = 'migrationFromV1Done';

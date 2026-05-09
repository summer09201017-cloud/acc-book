import Dexie, { Table } from 'dexie';
import { Budget, Category, Transaction, AppMeta } from './schema';

export class ExpenseDb extends Dexie {
  transactions!: Table<Transaction, string>;
  categories!: Table<Category, string>;
  budgets!: Table<Budget, string>;
  meta!: Table<AppMeta, string>;

  constructor() {
    super('expense-tracker');
    this.version(1).stores({
      transactions: 'id, type, categoryId, date, createdAt',
      categories: 'id, type, group, sortOrder',
      meta: 'key',
    });
    // v2 (schema v3 in app terms): add budgets table.
    this.version(2).stores({
      transactions: 'id, type, categoryId, date, createdAt',
      categories: 'id, type, group, sortOrder',
      budgets: 'categoryId, updatedAt',
      meta: 'key',
    });
  }
}

export const db = new ExpenseDb();

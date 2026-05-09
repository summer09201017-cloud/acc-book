import Dexie, { Table } from 'dexie';
import { Category, Transaction, AppMeta } from './schema';

export class ExpenseDb extends Dexie {
  transactions!: Table<Transaction, string>;
  categories!: Table<Category, string>;
  meta!: Table<AppMeta, string>;

  constructor() {
    super('expense-tracker');
    this.version(1).stores({
      transactions: 'id, type, categoryId, date, createdAt',
      categories: 'id, type, group, sortOrder',
      meta: 'key',
    });
  }
}

export const db = new ExpenseDb();

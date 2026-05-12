import Dexie, { Table } from 'dexie';
import { Budget, Category, RecurringRule, Template, Transaction, AppMeta } from './schema';

export class ExpenseDb extends Dexie {
  transactions!: Table<Transaction, string>;
  categories!: Table<Category, string>;
  budgets!: Table<Budget, string>;
  templates!: Table<Template, string>;
  recurringRules!: Table<RecurringRule, string>;
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
    // v3 (schema v4 in app terms): add templates + recurring rules.
    this.version(3).stores({
      transactions: 'id, type, categoryId, date, createdAt',
      categories: 'id, type, group, sortOrder',
      budgets: 'categoryId, updatedAt',
      templates: 'id, sortOrder, createdAt',
      recurringRules: 'id, enabled, frequency',
      meta: 'key',
    });
  }
}

export const db = new ExpenseDb();

import React, { createContext, useContext, useEffect, useMemo, useState, ReactNode } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db';
import { Category, Transaction, TransactionType } from '../db/schema';
import { runMigrationIfNeeded } from '../db/migration';

type NewTransactionInput = {
  type: TransactionType;
  amount: number;
  categoryId: string;
  date: string;
  note: string;
};

interface ExpenseContextType {
  isReady: boolean;
  transactions: Transaction[];
  categories: Category[];
  expenseCategories: Category[];
  incomeCategories: Category[];
  getCategory: (id: string) => Category | undefined;
  addTransaction: (input: NewTransactionInput) => Promise<void>;
  deleteTransaction: (id: string) => Promise<void>;
}

const ExpenseContext = createContext<ExpenseContextType | undefined>(undefined);

const newId = () =>
  (typeof crypto !== 'undefined' && 'randomUUID' in crypto)
    ? crypto.randomUUID()
    : `id-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

export const ExpenseProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [migrationReady, setMigrationReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    runMigrationIfNeeded()
      .catch((e) => console.error('[migration] failed', e))
      .finally(() => { if (!cancelled) setMigrationReady(true); });
    return () => { cancelled = true; };
  }, []);

  const transactions = useLiveQuery(
    async () => {
      const all = await db.transactions.toArray();
      return all.sort((a, b) => {
        if (a.date !== b.date) return a.date < b.date ? 1 : -1;
        return b.createdAt - a.createdAt;
      });
    },
    [],
    [] as Transaction[]
  );

  const categories = useLiveQuery(
    async () => {
      const all = await db.categories.toArray();
      return all.sort((a, b) => a.sortOrder - b.sortOrder);
    },
    [],
    [] as Category[]
  );

  const categoryMap = useMemo(() => {
    const m = new Map<string, Category>();
    categories.forEach((c) => m.set(c.id, c));
    return m;
  }, [categories]);

  const expenseCategories = useMemo(
    () => categories.filter((c) => c.type === 'expense'),
    [categories]
  );
  const incomeCategories = useMemo(
    () => categories.filter((c) => c.type === 'income'),
    [categories]
  );

  const isReady = migrationReady && categories.length > 0;

  const value: ExpenseContextType = {
    isReady,
    transactions,
    categories,
    expenseCategories,
    incomeCategories,
    getCategory: (id) => categoryMap.get(id),
    addTransaction: async (input) => {
      const tx: Transaction = {
        id: newId(),
        type: input.type,
        amount: input.amount,
        categoryId: input.categoryId,
        date: input.date,
        note: input.note,
        createdAt: Date.now(),
      };
      await db.transactions.add(tx);
    },
    deleteTransaction: async (id) => {
      await db.transactions.delete(id);
    },
  };

  return (
    <ExpenseContext.Provider value={value}>
      {children}
    </ExpenseContext.Provider>
  );
};

export const useExpense = () => {
  const ctx = useContext(ExpenseContext);
  if (!ctx) throw new Error('useExpense must be used within an ExpenseProvider');
  return ctx;
};

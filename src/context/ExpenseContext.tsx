import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, ReactNode } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db';
import { Budget, Category, Transaction, TransactionType } from '../db/schema';
import { runMigrationIfNeeded } from '../db/migration';
import { ym } from '../utils/dateRange';

type TransactionInput = {
  type: TransactionType;
  amount: number;
  categoryId: string;
  date: string;
  note: string;
};

type CategoryInput = {
  type: TransactionType;
  name: string;
  emoji: string;
  iconName?: string;
  bgColor: string;
  group: string;
};

export interface ToastState {
  id: number;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
}

interface ExpenseContextType {
  isReady: boolean;
  transactions: Transaction[];
  categories: Category[];
  budgets: Budget[];
  expenseCategories: Category[];
  incomeCategories: Category[];
  activeMonth: string;
  setActiveMonth: (month: string) => void;
  getCategory: (id: string) => Category | undefined;
  getBudget: (categoryId: string) => Budget | undefined;
  upsertTransaction: (input: TransactionInput, id?: string) => Promise<void>;
  deleteTransaction: (id: string) => Promise<void>;
  duplicateTransaction: (id: string) => Promise<void>;
  setBudget: (categoryId: string, monthlyLimit: number) => Promise<void>;
  removeBudget: (categoryId: string) => Promise<void>;
  addCategory: (input: CategoryInput) => Promise<Category>;
  updateCategory: (id: string, patch: Partial<CategoryInput>) => Promise<void>;
  deleteCategory: (id: string) => Promise<{ reassigned: number } | null>;
  toast: ToastState | null;
  showToast: (t: Omit<ToastState, 'id'>, durationMs?: number) => void;
  dismissToast: () => void;
  // UI state shared with the App-level editor modal.
  editingTransaction: Transaction | null;
  openEditor: (tx: Transaction) => void;
  closeEditor: () => void;
}

const ExpenseContext = createContext<ExpenseContextType | undefined>(undefined);

const newId = () =>
  (typeof crypto !== 'undefined' && 'randomUUID' in crypto)
    ? crypto.randomUUID()
    : `id-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

const UNDO_WINDOW_MS = 5000;
const todayStr = () => new Date().toISOString().slice(0, 10);
const monthStorageKey = 'expense-active-month';
const isYearMonth = (value: string | null): value is string =>
  !!value && /^\d{4}-\d{2}$/.test(value);

export const ExpenseProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [migrationReady, setMigrationReady] = useState(false);
  const [toast, setToast] = useState<ToastState | null>(null);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [activeMonth, setActiveMonthState] = useState(() => {
    try {
      const stored = localStorage.getItem(monthStorageKey);
      if (isYearMonth(stored)) return stored;
    } catch { /* ignore */ }
    return ym(new Date());
  });
  const toastTimerRef = useRef<number | null>(null);
  const toastIdRef = useRef(0);

  useEffect(() => {
    let cancelled = false;
    runMigrationIfNeeded()
      .catch((e) => console.error('[migration] failed', e))
      .finally(() => { if (!cancelled) setMigrationReady(true); });
    return () => { cancelled = true; };
  }, []);

  const setActiveMonth = useCallback((month: string) => {
    if (!isYearMonth(month)) return;
    setActiveMonthState(month);
    try {
      localStorage.setItem(monthStorageKey, month);
    } catch { /* ignore */ }
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

  const budgets = useLiveQuery(
    async () => db.budgets.toArray(),
    [],
    [] as Budget[]
  );

  const categoryMap = useMemo(() => {
    const m = new Map<string, Category>();
    categories.forEach((c) => m.set(c.id, c));
    return m;
  }, [categories]);

  const budgetMap = useMemo(() => {
    const m = new Map<string, Budget>();
    budgets.forEach((b) => m.set(b.categoryId, b));
    return m;
  }, [budgets]);

  const expenseCategories = useMemo(
    () => categories.filter((c) => c.type === 'expense'),
    [categories]
  );
  const incomeCategories = useMemo(
    () => categories.filter((c) => c.type === 'income'),
    [categories]
  );

  const isReady = migrationReady && categories.length > 0;

  const dismissToast = useCallback(() => {
    if (toastTimerRef.current) {
      clearTimeout(toastTimerRef.current);
      toastTimerRef.current = null;
    }
    setToast(null);
  }, []);

  const showToast = useCallback((t: Omit<ToastState, 'id'>, durationMs = 4000) => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    const id = ++toastIdRef.current;
    setToast({ ...t, id });
    toastTimerRef.current = window.setTimeout(() => {
      setToast((curr) => (curr && curr.id === id ? null : curr));
      toastTimerRef.current = null;
    }, durationMs);
  }, []);

  useEffect(() => () => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
  }, []);

  const value: ExpenseContextType = {
    isReady,
    transactions,
    categories,
    budgets,
    expenseCategories,
    incomeCategories,
    activeMonth,
    setActiveMonth,
    getCategory: (id) => categoryMap.get(id),
    getBudget: (id) => budgetMap.get(id),

    upsertTransaction: async (input, id) => {
      if (id) {
        const existing = await db.transactions.get(id);
        if (!existing) return;
        await db.transactions.put({
          ...existing,
          type: input.type,
          amount: input.amount,
          categoryId: input.categoryId,
          date: input.date,
          note: input.note,
        });
        return;
      }
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
      // Snapshot the row before deleting, so the toast's "復原" can restore it.
      const snapshot = await db.transactions.get(id);
      if (!snapshot) return;
      await db.transactions.delete(id);
      showToast(
        {
          message: '已刪除一筆紀錄',
          actionLabel: '復原',
          onAction: async () => {
            await db.transactions.put(snapshot);
            dismissToast();
          },
        },
        UNDO_WINDOW_MS
      );
    },

    duplicateTransaction: async (id) => {
      const orig = await db.transactions.get(id);
      if (!orig) return;
      const today = todayStr();
      const copy: Transaction = {
        ...orig,
        id: newId(),
        date: today,
        createdAt: Date.now(),
      };
      await db.transactions.add(copy);
      showToast(
        {
          message: `已複製到 ${today}`,
          actionLabel: '復原',
          onAction: async () => {
            await db.transactions.delete(copy.id);
            dismissToast();
          },
        },
        UNDO_WINDOW_MS
      );
    },

    setBudget: async (categoryId, monthlyLimit) => {
      if (!Number.isFinite(monthlyLimit) || monthlyLimit < 0) return;
      await db.budgets.put({ categoryId, monthlyLimit, updatedAt: Date.now() });
    },

    removeBudget: async (categoryId) => {
      await db.budgets.delete(categoryId);
    },

    addCategory: async (input) => {
      const sameType = categories.filter((c) => c.type === input.type);
      const maxOrder = sameType.reduce((m, c) => Math.max(m, c.sortOrder), 0);
      const cat: Category = {
        id: newId(),
        type: input.type,
        name: input.name.trim(),
        emoji: input.emoji,
        iconName: input.iconName,
        bgColor: input.bgColor,
        group: input.group.trim() || '其他',
        isBuiltin: false,
        // Custom categories slot in just before the built-in "其他" (sortOrder 99).
        sortOrder: Math.min(maxOrder + 1, 90),
      };
      await db.categories.add(cat);
      return cat;
    },

    updateCategory: async (id, patch) => {
      const existing = await db.categories.get(id);
      if (!existing) return;
      const next: Category = {
        ...existing,
        // Built-in categories may be re-themed (emoji/icon/color) but type/name/group stay locked.
        type: existing.isBuiltin ? existing.type : (patch.type ?? existing.type),
        name: existing.isBuiltin ? existing.name : (patch.name?.trim() ?? existing.name),
        group: existing.isBuiltin ? existing.group : (patch.group?.trim() || existing.group),
        emoji: patch.emoji ?? existing.emoji,
        iconName: patch.iconName !== undefined ? patch.iconName : existing.iconName,
        bgColor: patch.bgColor ?? existing.bgColor,
      };
      await db.categories.put(next);
    },

    deleteCategory: async (id) => {
      const target = await db.categories.get(id);
      if (!target || target.isBuiltin) return null;
      // Reassign any transactions referencing this category to the built-in "其他" of the same type.
      const fallback = categories.find((c) => c.isBuiltin && c.name === '其他' && c.type === target.type);
      let reassigned = 0;
      await db.transaction('rw', db.categories, db.transactions, db.budgets, async () => {
        if (fallback) {
          const affected = await db.transactions.where('categoryId').equals(id).toArray();
          reassigned = affected.length;
          for (const tx of affected) {
            await db.transactions.update(tx.id, { categoryId: fallback.id });
          }
        }
        await db.budgets.delete(id);
        await db.categories.delete(id);
      });
      return { reassigned };
    },

    toast,
    showToast,
    dismissToast,

    editingTransaction,
    openEditor: (tx) => setEditingTransaction(tx),
    closeEditor: () => setEditingTransaction(null),
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

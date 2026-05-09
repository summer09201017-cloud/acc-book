import React, { useMemo } from 'react';
import { useExpense } from '../context/ExpenseContext';
import { currentMonth, formatYearMonth, monthRangeFromYm } from '../utils/dateRange';
import { CategoryIcon } from './CategoryIcon';
import { Category } from '../db/schema';

interface Row {
  categoryId: string;
  name: string;
  cat?: Category;
  spent: number;
  limit: number;
  pct: number;
}

const colorFor = (pct: number): string => {
  if (pct >= 1) return 'var(--expense)';
  if (pct >= 0.8) return '#f59e0b';
  return 'var(--income)';
};

export const BudgetProgressCard: React.FC = () => {
  const { budgets, transactions, getCategory, activeMonth } = useExpense();

  const rows: Row[] = useMemo(() => {
    if (budgets.length === 0) return [];
    const cm = monthRangeFromYm(activeMonth);
    const now = new Date();
    const current = currentMonth(now);
    const isCurrentMonth = cm.year === current.year && cm.month === current.month;
    const end = isCurrentMonth ? now.toISOString().slice(0, 10) : cm.end;

    const list: Row[] = budgets.map((b) => {
      const cat = getCategory(b.categoryId);
      const spent = transactions
        .filter((t) => t.type === 'expense' && t.categoryId === b.categoryId
          && t.date >= cm.start && t.date <= end)
        .reduce((s, t) => s + t.amount, 0);
      const limit = b.monthlyLimit;
      const pct = limit > 0 ? spent / limit : 0;
      return {
        categoryId: b.categoryId,
        name: cat?.name ?? '未知',
        cat,
        spent,
        limit,
        pct,
      };
    });

    // Show the most-strained budgets first; fully-spent up top.
    return list.sort((a, b) => b.pct - a.pct);
  }, [activeMonth, budgets, transactions, getCategory]);

  if (rows.length === 0) {
    return (
      <div className="card">
        <h2 className="card-title">{formatYearMonth(activeMonth)}預算</h2>
        <div className="empty-state">
          <p>還沒有設定任何分類預算。到「設定」分頁加一個吧！</p>
        </div>
      </div>
    );
  }

  return (
    <div className="card">
      <h2 className="card-title">{formatYearMonth(activeMonth)}預算</h2>
      <ul className="budget-list">
        {rows.map((r) => {
          const fillPct = Math.min(r.pct, 1) * 100;
          const overflowPct = r.pct > 1 ? Math.min((r.pct - 1) * 100, 100) : 0;
          const color = colorFor(r.pct);
          return (
            <li key={r.categoryId} className="budget-item">
              <div className="budget-header">
                <CategoryIcon category={r.cat} size={28} className="budget-emoji" />
                <span className="budget-name">{r.name}</span>
                <span className="budget-amounts" style={{ color }}>
                  ${r.spent.toLocaleString()} / ${r.limit.toLocaleString()}
                </span>
              </div>
              <div className="budget-bar">
                <div
                  className="budget-bar-fill"
                  style={{ width: `${fillPct}%`, background: color }}
                />
                {overflowPct > 0 && (
                  <div
                    className="budget-bar-overflow"
                    style={{ width: `${overflowPct}%` }}
                    title="已超支"
                  />
                )}
              </div>
              <div className="budget-meta">
                {r.pct >= 1
                  ? `已超支 $${(r.spent - r.limit).toLocaleString()}`
                  : `還剩 $${(r.limit - r.spent).toLocaleString()}（${Math.round(r.pct * 100)}%）`}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
};

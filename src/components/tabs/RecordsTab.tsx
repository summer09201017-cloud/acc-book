import React, { useEffect, useMemo, useState } from 'react';
import { Search, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { useExpense } from '../../context/ExpenseContext';
import { TransactionList } from '../TransactionList';
import { CategoryIcon } from '../CategoryIcon';
import { ym } from '../../utils/dateRange';

type TypeFilter = 'all' | 'expense' | 'income';

const todayYM = () => ym(new Date());

const shiftMonth = (yearMonth: string, delta: number): string => {
  const [y, m] = yearMonth.split('-').map(Number);
  const date = new Date(y, (m - 1) + delta, 1);
  return ym(date);
};

const formatMonth = (yearMonth: string): string => {
  const [y, m] = yearMonth.split('-').map(Number);
  return `${y} 年 ${m} 月`;
};

export const RecordsTab: React.FC = () => {
  const { transactions, categories } = useExpense();

  const [query, setQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');
  const [activeCategoryIds, setActiveCategoryIds] = useState<Set<string>>(new Set());
  // null = "全部月份"; otherwise a YYYY-MM string.
  const [monthFilter, setMonthFilter] = useState<string | null>(todayYM());

  // If the current month has no records and the user hasn't manually navigated,
  // fall back to the most recent month with data on first load.
  const didAutoSelectRef = React.useRef(false);
  useEffect(() => {
    if (didAutoSelectRef.current) return;
    if (transactions.length === 0) return;
    didAutoSelectRef.current = true;
    const cm = todayYM();
    const hasCurrent = transactions.some((t) => t.date.startsWith(cm));
    if (!hasCurrent) {
      const latest = transactions[0]?.date.slice(0, 7);
      if (latest) setMonthFilter(latest);
    }
  }, [transactions]);

  const visibleCategories = useMemo(() => {
    if (typeFilter === 'all') return categories;
    return categories.filter((c) => c.type === typeFilter);
  }, [categories, typeFilter]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return transactions.filter((tx) => {
      if (monthFilter && !tx.date.startsWith(monthFilter)) return false;
      if (typeFilter !== 'all' && tx.type !== typeFilter) return false;
      if (activeCategoryIds.size > 0 && !activeCategoryIds.has(tx.categoryId)) return false;
      if (q) {
        const note = (tx.note ?? '').toLowerCase();
        const date = tx.date.toLowerCase();
        const amount = String(tx.amount);
        if (!note.includes(q) && !date.includes(q) && !amount.includes(q)) return false;
      }
      return true;
    });
  }, [transactions, query, typeFilter, activeCategoryIds, monthFilter]);

  const monthSummary = useMemo(() => {
    if (!monthFilter) return null;
    let income = 0;
    let expense = 0;
    for (const tx of transactions) {
      if (!tx.date.startsWith(monthFilter)) continue;
      if (tx.type === 'income') income += tx.amount;
      else expense += tx.amount;
    }
    return { income, expense };
  }, [transactions, monthFilter]);

  const toggleCategory = (id: string) => {
    setActiveCategoryIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const clearAll = () => {
    setQuery('');
    setTypeFilter('all');
    setActiveCategoryIds(new Set());
    setMonthFilter(todayYM());
  };

  const hasFilter =
    query !== '' ||
    typeFilter !== 'all' ||
    activeCategoryIds.size > 0 ||
    monthFilter !== todayYM();

  return (
    <div className="tab-panel">
      <div className="card">
        <div className="month-picker">
          <button
            type="button"
            className="month-picker-nav"
            onClick={() => setMonthFilter((m) => shiftMonth(m ?? todayYM(), -1))}
            aria-label="上個月"
          >
            <ChevronLeft size={18} />
          </button>
          <div className="month-picker-label">
            <strong>{monthFilter ? formatMonth(monthFilter) : '全部月份'}</strong>
            {monthSummary && (
              <span className="muted">
                收 ${monthSummary.income.toLocaleString()} · 支 ${monthSummary.expense.toLocaleString()}
              </span>
            )}
          </div>
          <button
            type="button"
            className="month-picker-nav"
            onClick={() => setMonthFilter((m) => shiftMonth(m ?? todayYM(), 1))}
            aria-label="下個月"
          >
            <ChevronRight size={18} />
          </button>
          <button
            type="button"
            className={`month-picker-all ${monthFilter === null ? 'active' : ''}`}
            onClick={() => setMonthFilter((m) => (m === null ? todayYM() : null))}
          >
            {monthFilter === null ? '回到本月' : '全部'}
          </button>
        </div>

        <div className="records-toolbar">
          <div className="records-search">
            <Search size={16} className="records-search-icon" aria-hidden />
            <input
              type="search"
              placeholder="搜尋備註、日期、金額…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            {query && (
              <button
                type="button"
                className="records-search-clear"
                onClick={() => setQuery('')}
                aria-label="清除搜尋"
              >
                <X size={14} />
              </button>
            )}
          </div>

          <div className="records-type-toggle">
            {(['all', 'expense', 'income'] as TypeFilter[]).map((t) => (
              <button
                key={t}
                type="button"
                className={`records-type-btn ${typeFilter === t ? 'active' : ''}`}
                onClick={() => setTypeFilter(t)}
              >
                {t === 'all' ? '全部' : t === 'expense' ? '支出' : '收入'}
              </button>
            ))}
          </div>
        </div>

        <div className="records-chips">
          {visibleCategories.map((c) => {
            const active = activeCategoryIds.has(c.id);
            return (
              <button
                key={c.id}
                type="button"
                className={`records-chip ${active ? 'active' : ''}`}
                onClick={() => toggleCategory(c.id)}
                style={active ? { backgroundColor: c.bgColor, borderColor: 'transparent' } : undefined}
                aria-pressed={active}
              >
                <CategoryIcon category={c} size={18} className="records-chip-icon" />
                <span>{c.name}</span>
              </button>
            );
          })}
          {hasFilter && (
            <button
              type="button"
              className="records-chip records-chip-clear"
              onClick={clearAll}
            >
              清除篩選
            </button>
          )}
        </div>

        <div className="records-summary">
          共 {filtered.length} 筆 / 全部 {transactions.length} 筆
        </div>
      </div>

      <TransactionList
        title="所有紀錄"
        items={filtered}
        emptyHint={hasFilter ? '沒有符合條件的紀錄' : '目前沒有任何紀錄，趕快新增一筆吧！'}
      />
    </div>
  );
};

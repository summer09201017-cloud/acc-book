import React, { useEffect, useMemo, useState } from 'react';
import { Search, X, ChevronLeft, ChevronRight, CalendarDays, List as ListIcon, Copy } from 'lucide-react';
import { useExpense } from '../../context/ExpenseContext';
import { TransactionList } from '../TransactionList';
import { CategoryIcon } from '../CategoryIcon';
import { RecordsCalendar } from '../RecordsCalendar';
import { DateRange, formatYearMonth, monthRangeFromYm, sameDayLastMonth, weekRange, ym, ymd } from '../../utils/dateRange';

type TypeFilter = 'all' | 'expense' | 'income';
type ViewMode = 'list' | 'calendar';
type DatePreset = 'month' | 'today' | 'week' | 'lastMonth' | 'all';

const todayYM = () => ym(new Date());

const shiftMonth = (yearMonth: string, delta: number): string => {
  const [y, m] = yearMonth.split('-').map(Number);
  const date = new Date(y, (m - 1) + delta, 1);
  return ym(date);
};

const formatDate = (dateString: string): string => {
  const [y, m, d] = dateString.split('-').map(Number);
  const weekday = ['日', '一', '二', '三', '四', '五', '六'][new Date(y, m - 1, d).getDay()];
  return `${m}/${d}（${weekday}）`;
};

const inRange = (date: string, range: DateRange | null): boolean =>
  !range || (date >= range.start && date <= range.end);

const rangeForPreset = (preset: DatePreset, activeMonth: string): DateRange | null => {
  const now = new Date();
  const today = ymd(now);
  if (preset === 'all') return null;
  if (preset === 'today') return { start: today, end: today };
  if (preset === 'week') return weekRange(now);
  return monthRangeFromYm(activeMonth);
};

const summarize = <T extends { type: TypeFilter; amount: number }>(items: T[]) => {
  let income = 0;
  let expense = 0;
  for (const tx of items) {
    if (tx.type === 'income') income += tx.amount;
    else if (tx.type === 'expense') expense += tx.amount;
  }
  return { income, expense, balance: income - expense, count: items.length };
};

const presetLabel = (preset: DatePreset, activeMonth: string) => {
  if (preset === 'today') return '今天';
  if (preset === 'week') return '本週';
  if (preset === 'all') return '全部月份';
  return formatYearMonth(activeMonth);
};

export const RecordsTab: React.FC = () => {
  const {
    transactions,
    categories,
    activeMonth,
    setActiveMonth,
    copyTransactionsFromDate,
    pendingRecordDate,
    requestRecordDate,
  } = useExpense();

  const [query, setQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');
  const [activeCategoryIds, setActiveCategoryIds] = useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = useState<ViewMode>('calendar');
  const [selectedDate, setSelectedDate] = useState<string>(ymd(new Date()));
  const [datePreset, setDatePreset] = useState<DatePreset>('month');
  const activeRange = useMemo(
    () => rangeForPreset(datePreset, activeMonth),
    [activeMonth, datePreset]
  );

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
      if (latest) setActiveMonth(latest);
    }
  }, [setActiveMonth, transactions]);

  // Honor cross-tab navigation requests (e.g. heatmap → focus a specific day).
  useEffect(() => {
    if (!pendingRecordDate) return;
    setActiveMonth(pendingRecordDate.slice(0, 7));
    setSelectedDate(pendingRecordDate);
    setDatePreset('month');
    setViewMode('calendar');
    didAutoSelectRef.current = true;
    requestRecordDate(null);
  }, [pendingRecordDate, requestRecordDate, setActiveMonth]);

  const visibleCategories = useMemo(() => {
    if (typeFilter === 'all') return categories;
    return categories.filter((c) => c.type === typeFilter);
  }, [categories, typeFilter]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return transactions.filter((tx) => {
      if (!inRange(tx.date, activeRange)) return false;
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
  }, [transactions, query, typeFilter, activeCategoryIds, activeRange]);

  const periodSummary = useMemo(
    () => summarize(transactions.filter((tx) => inRange(tx.date, activeRange))),
    [transactions, activeRange]
  );

  useEffect(() => {
    if (viewMode !== 'calendar' || datePreset === 'all') return;
    if (selectedDate.startsWith(activeMonth) && inRange(selectedDate, activeRange)) return;
    const today = ymd(new Date());
    const fallback = today.startsWith(activeMonth) && inRange(today, activeRange)
      ? today
      : filtered.find((tx) => tx.date.startsWith(activeMonth))?.date ??
        (activeRange?.start.startsWith(activeMonth) ? activeRange.start : `${activeMonth}-01`);
    setSelectedDate(fallback);
  }, [activeMonth, activeRange, datePreset, filtered, selectedDate, viewMode]);

  const selectedDayItems = useMemo(() => {
    if (viewMode !== 'calendar') return [];
    return filtered.filter((tx) => tx.date === selectedDate);
  }, [filtered, selectedDate, viewMode]);
  const selectedDaySummary = useMemo(
    () => summarize(selectedDayItems),
    [selectedDayItems]
  );

  const lastMonthSameDay = useMemo(() => sameDayLastMonth(selectedDate), [selectedDate]);
  const lastMonthSameDayCount = useMemo(
    () => transactions.reduce((n, tx) => (tx.date === lastMonthSameDay ? n + 1 : n), 0),
    [transactions, lastMonthSameDay]
  );
  const handleCopyFromLastMonth = async () => {
    const added = await copyTransactionsFromDate(lastMonthSameDay, selectedDate);
    if (added === 0) return;
    if ('vibrate' in navigator) {
      try { navigator.vibrate(10); } catch { /* ignore */ }
    }
  };

  const shownItems = viewMode === 'calendar' ? selectedDayItems : filtered;
  const listTitle = viewMode === 'calendar'
    ? `${formatDate(selectedDate)} 紀錄`
    : '所有紀錄';

  const toggleCategory = (id: string) => {
    setActiveCategoryIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const changeViewMode = (nextMode: ViewMode) => {
    if (nextMode === 'calendar' && datePreset === 'all') {
      setDatePreset('month');
      if (!selectedDate.startsWith(activeMonth)) {
        const today = ymd(new Date());
        setSelectedDate(today.startsWith(activeMonth) ? today : `${activeMonth}-01`);
      }
    }
    setViewMode(nextMode);
  };

  const applyDatePreset = (preset: DatePreset) => {
    const today = ymd(new Date());
    const currentMonth = todayYM();
    if (preset === 'today' || preset === 'week' || preset === 'month') {
      setActiveMonth(currentMonth);
      setSelectedDate(today);
    } else if (preset === 'lastMonth') {
      const lastMonth = shiftMonth(currentMonth, -1);
      setActiveMonth(lastMonth);
      setSelectedDate(`${lastMonth}-01`);
    } else {
      setViewMode('list');
    }
    setDatePreset(preset);
  };

  const toggleAllMonths = () => {
    if (datePreset === 'all') {
      setActiveMonth(todayYM());
      setDatePreset('month');
      return;
    }
    setDatePreset('all');
    setViewMode('list');
  };

  const clearAll = () => {
    setQuery('');
    setTypeFilter('all');
    setActiveCategoryIds(new Set());
    setActiveMonth(todayYM());
    setDatePreset('month');
  };

  const hasFilter =
    query !== '' ||
    typeFilter !== 'all' ||
    activeCategoryIds.size > 0 ||
    datePreset !== 'month' ||
    activeMonth !== todayYM();

  return (
    <div className="tab-panel">
      <div className="card">
        <div className="records-header">
          <div className="month-picker">
            <button
              type="button"
              className="month-picker-nav"
              onClick={() => {
                setDatePreset('month');
                setActiveMonth(shiftMonth(activeMonth, -1));
              }}
              aria-label="上個月"
            >
              <ChevronLeft size={18} />
            </button>
            <div className="month-picker-label">
              <strong>{presetLabel(datePreset, activeMonth)}</strong>
              <span className="muted">
                收 ${periodSummary.income.toLocaleString()} · 支 ${periodSummary.expense.toLocaleString()} · 餘 ${periodSummary.balance.toLocaleString()}
              </span>
            </div>
            <button
              type="button"
              className="month-picker-nav"
              onClick={() => {
                setDatePreset('month');
                setActiveMonth(shiftMonth(activeMonth, 1));
              }}
              aria-label="下個月"
            >
              <ChevronRight size={18} />
            </button>
            <button
              type="button"
              className={`month-picker-all ${datePreset === 'all' ? 'active' : ''}`}
              onClick={toggleAllMonths}
            >
              {datePreset === 'all' ? '回到本月' : '全部'}
            </button>
          </div>

          <div className="records-view-toggle" aria-label="明細顯示模式">
            <button
              type="button"
              className={`records-view-btn ${viewMode === 'list' ? 'active' : ''}`}
              onClick={() => changeViewMode('list')}
              aria-pressed={viewMode === 'list'}
            >
              <ListIcon size={15} />
              <span>列表</span>
            </button>
            <button
              type="button"
              className={`records-view-btn ${viewMode === 'calendar' ? 'active' : ''}`}
              onClick={() => changeViewMode('calendar')}
              aria-pressed={viewMode === 'calendar'}
            >
              <CalendarDays size={15} />
              <span>日曆</span>
            </button>
          </div>
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

        <div className="records-date-presets" aria-label="快速日期篩選">
          {([
            ['today', '今天'],
            ['week', '本週'],
            ['month', '本月'],
            ['lastMonth', '上月'],
          ] as [DatePreset, string][]).map(([preset, label]) => (
            <button
              key={preset}
              type="button"
              className={`records-date-preset ${datePreset === preset ? 'active' : ''}`}
              onClick={() => applyDatePreset(preset)}
              aria-pressed={datePreset === preset}
            >
              {label}
            </button>
          ))}
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

      {viewMode === 'calendar' && datePreset !== 'all' && (
        <RecordsCalendar
          month={activeMonth}
          transactions={filtered}
          selectedDate={selectedDate}
          onSelectDate={setSelectedDate}
        />
      )}

      {viewMode === 'calendar' && datePreset !== 'all' && (
        <div className="records-day-summary" aria-label={`${formatDate(selectedDate)}收支摘要`}>
          <span>{selectedDaySummary.count} 筆</span>
          <strong className="income">收 ${selectedDaySummary.income.toLocaleString()}</strong>
          <strong className="expense">支 ${selectedDaySummary.expense.toLocaleString()}</strong>
          <strong className={selectedDaySummary.balance >= 0 ? 'income' : 'expense'}>
            餘 ${selectedDaySummary.balance.toLocaleString()}
          </strong>
          {lastMonthSameDayCount > 0 && (
            <button
              type="button"
              className="records-day-copy-btn"
              onClick={handleCopyFromLastMonth}
              title={`從 ${lastMonthSameDay} 複製 ${lastMonthSameDayCount} 筆`}
            >
              <Copy size={14} />
              <span>複製上月同日 ({lastMonthSameDayCount})</span>
            </button>
          )}
        </div>
      )}

      <TransactionList
        title={listTitle}
        items={shownItems}
        emptyHint={viewMode === 'calendar' ? '這天沒有符合篩選的紀錄' : hasFilter ? '沒有符合條件的紀錄' : '目前沒有任何紀錄，趕快新增一筆吧！'}
      />
    </div>
  );
};

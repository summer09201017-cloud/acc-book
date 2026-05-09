import React, { useMemo } from 'react';
import { TrendingDown, TrendingUp, Minus } from 'lucide-react';
import { useExpense } from '../context/ExpenseContext';
import { currentMonth, lastMonthSamePeriod, sumInRange } from '../utils/dateRange';

export const MonthSummaryCard: React.FC = () => {
  const { transactions } = useExpense();

  const { thisMonth, lastSamePeriod, diff, ratio } = useMemo(() => {
    const now = new Date();
    const cm = currentMonth(now);
    const lp = lastMonthSamePeriod(now);
    const today = now.toISOString().slice(0, 10);

    // "This month so far" = month start through today (inclusive).
    const thisMonth = sumInRange(transactions, 'expense', cm.start, today);
    const lastSamePeriod = sumInRange(transactions, 'expense', lp.start, lp.end);
    const diff = thisMonth - lastSamePeriod;
    const ratio = lastSamePeriod > 0 ? diff / lastSamePeriod : null;
    return { thisMonth, lastSamePeriod, diff, ratio };
  }, [transactions]);

  const trendUp = diff > 0;
  const flat = diff === 0;
  const Icon = flat ? Minus : trendUp ? TrendingUp : TrendingDown;
  const trendClass = flat ? 'flat' : trendUp ? 'up' : 'down';

  return (
    <div className="card month-summary-card">
      <div className="month-summary-row">
        <div className="month-summary-block">
          <span className="month-summary-label">本月支出</span>
          <span className="month-summary-amount">${thisMonth.toLocaleString()}</span>
        </div>
        <div className="month-summary-block">
          <span className="month-summary-label">上月同期</span>
          <span className="month-summary-amount muted">${lastSamePeriod.toLocaleString()}</span>
        </div>
      </div>
      <div className={`month-summary-diff ${trendClass}`}>
        <Icon size={18} />
        <span>
          {flat
            ? '與上月同期持平'
            : `${trendUp ? '多花' : '少花'} $${Math.abs(diff).toLocaleString()}` +
              (ratio !== null ? `（${trendUp ? '+' : '−'}${Math.abs(Math.round(ratio * 100))}%）` : '')}
        </span>
      </div>
    </div>
  );
};

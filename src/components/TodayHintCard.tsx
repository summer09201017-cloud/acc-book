import React, { useMemo } from 'react';
import { CalendarClock, Sparkles } from 'lucide-react';
import { useExpense } from '../context/ExpenseContext';
import { currentMonth, formatYearMonth, monthRangeFromYm, sumInRange, ymd } from '../utils/dateRange';

export const TodayHintCard: React.FC = () => {
  const { transactions, activeMonth } = useExpense();

  const stats = useMemo(() => {
    const now = new Date();
    const today = ymd(now);
    const current = currentMonth(now);
    const cm = monthRangeFromYm(activeMonth);
    const isCurrentMonth = cm.year === current.year && cm.month === current.month;
    const cutoff = isCurrentMonth ? today : cm.end;

    const monthExpense = sumInRange(transactions, 'expense', cm.start, cutoff);
    const monthIncome = sumInRange(transactions, 'income', cm.start, cutoff);

    let spentToday = 0;
    let earnedToday = 0;
    if (isCurrentMonth) {
      for (const t of transactions) {
        if (t.date !== today) continue;
        if (t.type === 'expense') spentToday += t.amount;
        else earnedToday += t.amount;
      }
    }

    // "Days remaining" includes today, so the average is what's left to spend
    // per day from now through month-end without going over income.
    const daysLeft = isCurrentMonth ? cm.daysInMonth - now.getDate() + 1 : 0;
    const remainingBudget = Math.max(0, monthIncome - monthExpense);
    const dailyAverage = daysLeft > 0 ? Math.floor(remainingBudget / daysLeft) : 0;
    const overBudget = monthIncome > 0 && monthExpense > monthIncome;

    const overBy = overBudget ? monthExpense - monthIncome : 0;
    return {
      spentToday,
      earnedToday,
      daysLeft,
      dailyAverage,
      overBudget,
      remainingBudget,
      monthIncome,
      monthExpense,
      overBy,
      isCurrentMonth,
      label: formatYearMonth(activeMonth),
    };
  }, [activeMonth, transactions]);

  return (
    <div className="card today-hint-card">
      <div className="today-hint-row">
        <div className="today-hint-block">
          <span className="today-hint-label">
            <Sparkles size={14} aria-hidden /> {stats.isCurrentMonth ? '今日已花' : `${stats.label}支出`}
          </span>
          <strong className="today-hint-amount expense">
            ${(stats.isCurrentMonth ? stats.spentToday : stats.monthExpense).toLocaleString()}
          </strong>
          {stats.isCurrentMonth && stats.earnedToday > 0 && (
            <span className="today-hint-sub income">
              + 收入 ${stats.earnedToday.toLocaleString()}
            </span>
          )}
        </div>
        <div className="today-hint-block">
          <span className="today-hint-label">
            <CalendarClock size={14} aria-hidden /> {stats.isCurrentMonth ? `本月剩 ${stats.daysLeft} 天` : '選定月份結餘'}
          </span>
          <strong className={`today-hint-amount ${stats.overBudget ? 'expense' : ''}`}>
            {stats.isCurrentMonth
              ? `日均 $${stats.dailyAverage.toLocaleString()}`
              : `$${stats.remainingBudget.toLocaleString()}`}
          </strong>
          <span className="today-hint-sub muted">
            {stats.monthIncome === 0
              ? '尚無收入紀錄'
              : stats.overBudget
                ? `已超支 $${stats.overBy.toLocaleString()}`
                : `可花 $${stats.remainingBudget.toLocaleString()}`}
          </span>
        </div>
      </div>
    </div>
  );
};

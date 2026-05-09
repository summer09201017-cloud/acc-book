import React, { useMemo } from 'react';
import { CalendarClock, Sparkles } from 'lucide-react';
import { useExpense } from '../context/ExpenseContext';
import { currentMonth, sumInRange, ymd } from '../utils/dateRange';

export const TodayHintCard: React.FC = () => {
  const { transactions } = useExpense();

  const stats = useMemo(() => {
    const now = new Date();
    const today = ymd(now);
    const cm = currentMonth(now);

    const monthExpense = sumInRange(transactions, 'expense', cm.start, cm.end);
    const monthIncome = sumInRange(transactions, 'income', cm.start, cm.end);

    let spentToday = 0;
    let earnedToday = 0;
    for (const t of transactions) {
      if (t.date !== today) continue;
      if (t.type === 'expense') spentToday += t.amount;
      else earnedToday += t.amount;
    }

    // "Days remaining" includes today, so the average is what's left to spend
    // per day from now through month-end without going over income.
    const daysLeft = cm.daysInMonth - now.getDate() + 1;
    const remainingBudget = Math.max(0, monthIncome - monthExpense);
    const dailyAverage = daysLeft > 0 ? Math.floor(remainingBudget / daysLeft) : 0;
    const overBudget = monthIncome > 0 && monthExpense > monthIncome;

    const overBy = overBudget ? monthExpense - monthIncome : 0;
    return { spentToday, earnedToday, daysLeft, dailyAverage, overBudget, remainingBudget, monthIncome, overBy };
  }, [transactions]);

  return (
    <div className="card today-hint-card">
      <div className="today-hint-row">
        <div className="today-hint-block">
          <span className="today-hint-label">
            <Sparkles size={14} aria-hidden /> 今日已花
          </span>
          <strong className="today-hint-amount expense">
            ${stats.spentToday.toLocaleString()}
          </strong>
          {stats.earnedToday > 0 && (
            <span className="today-hint-sub income">
              + 收入 ${stats.earnedToday.toLocaleString()}
            </span>
          )}
        </div>
        <div className="today-hint-block">
          <span className="today-hint-label">
            <CalendarClock size={14} aria-hidden /> 本月剩 {stats.daysLeft} 天
          </span>
          <strong className={`today-hint-amount ${stats.overBudget ? 'expense' : ''}`}>
            日均 ${stats.dailyAverage.toLocaleString()}
          </strong>
          <span className="today-hint-sub muted">
            {stats.monthIncome === 0
              ? '尚無本月收入紀錄'
              : stats.overBudget
                ? `已超支 $${stats.overBy.toLocaleString()}`
                : `可花 $${stats.remainingBudget.toLocaleString()}`}
          </span>
        </div>
      </div>
    </div>
  );
};

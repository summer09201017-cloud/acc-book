import React, { useMemo } from 'react';
import { CalendarClock, PiggyBank, Sparkles } from 'lucide-react';
import { useExpense } from '../context/ExpenseContext';
import { currentMonth, sumInRange, weekToDateRange, ymd } from '../utils/dateRange';

export const TodayHintCard: React.FC = () => {
  const { transactions, budgets } = useExpense();

  const stats = useMemo(() => {
    const now = new Date();
    const today = ymd(now);
    const cm = currentMonth(now);
    const week = weekToDateRange(now);

    const monthExpense = sumInRange(transactions, 'expense', cm.start, today);
    const monthIncome = sumInRange(transactions, 'income', cm.start, today);
    const weekExpense = sumInRange(transactions, 'expense', week.start, week.end);

    let spentToday = 0;
    let earnedToday = 0;
    for (const t of transactions) {
      if (t.date !== today) continue;
      if (t.type === 'expense') spentToday += t.amount;
      else earnedToday += t.amount;
    }

    const budgetLimit = budgets.reduce((sum, b) => sum + b.monthlyLimit, 0);
    const budgetCategoryIds = new Set(budgets.map((b) => b.categoryId));
    const spentInBudget = transactions
      .filter((t) =>
        t.type === 'expense' &&
        budgetCategoryIds.has(t.categoryId) &&
        t.date >= cm.start &&
        t.date <= today
      )
      .reduce((sum, t) => sum + t.amount, 0);

    const hasBudget = budgetLimit > 0;
    const remainingBudget = hasBudget
      ? budgetLimit - spentInBudget
      : monthIncome - monthExpense;
    const overBudget = remainingBudget < 0;
    const daysLeft = cm.daysInMonth - now.getDate() + 1;
    const dailyAverage = daysLeft > 0 ? Math.floor(Math.max(0, remainingBudget) / daysLeft) : 0;

    return {
      spentToday,
      earnedToday,
      weekExpense,
      daysLeft,
      dailyAverage,
      overBudget,
      remainingBudget,
      monthIncome,
      hasBudget,
    };
  }, [budgets, transactions]);

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
            <CalendarClock size={14} aria-hidden /> 本週已花
          </span>
          <strong className="today-hint-amount expense">
            ${stats.weekExpense.toLocaleString()}
          </strong>
          <span className="today-hint-sub muted">
            週日至今天
          </span>
        </div>
        <div className="today-hint-block">
          <span className="today-hint-label">
            <PiggyBank size={14} aria-hidden /> {stats.hasBudget ? '本月預算剩' : '本月可用餘額'}
          </span>
          <strong className={`today-hint-amount ${stats.overBudget ? 'expense' : 'income'}`}>
            ${Math.abs(stats.remainingBudget).toLocaleString()}
          </strong>
          <span className="today-hint-sub muted">
            {stats.overBudget
              ? '已超出可用額度'
              : stats.monthIncome === 0 && !stats.hasBudget
                ? '尚無收入或預算'
                : `本月剩 ${stats.daysLeft} 天 · 日均 $${stats.dailyAverage.toLocaleString()}`}
          </span>
        </div>
      </div>
    </div>
  );
};

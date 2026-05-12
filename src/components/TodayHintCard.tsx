import React, { useMemo } from 'react';
import { CalendarClock, Flame, PiggyBank, Sparkles } from 'lucide-react';
import { useExpense } from '../context/ExpenseContext';
import { calcStreakDays, currentMonth, sumInRange, weekToDateRange, ymd } from '../utils/dateRange';

interface MoodSpec {
  emoji: string;
  hint: string;
  // For aria-label / tooltip and a tiny color cue.
  tone: 'good' | 'warn' | 'bad' | 'neutral';
}

const pickMood = (params: {
  hasBudget: boolean;
  monthIncome: number;
  monthExpense: number;
  budgetLimit: number;
  spentInBudget: number;
}): MoodSpec => {
  const { hasBudget, monthIncome, monthExpense, budgetLimit, spentInBudget } = params;
  if (hasBudget) {
    const ratio = budgetLimit > 0 ? spentInBudget / budgetLimit : 0;
    if (ratio > 1) return { emoji: '🔥', hint: '本月超支了', tone: 'bad' };
    if (ratio >= 0.8) return { emoji: '😬', hint: '快到預算上限', tone: 'warn' };
    return { emoji: '😌', hint: '預算還守得住', tone: 'good' };
  }
  if (monthIncome === 0 && monthExpense === 0) {
    return { emoji: '😐', hint: '本月還沒有紀錄', tone: 'neutral' };
  }
  if (monthIncome === 0) return { emoji: '🤔', hint: '本月暫無收入', tone: 'warn' };
  const balance = monthIncome - monthExpense;
  if (balance < 0) return { emoji: '🔥', hint: '本月支出超過收入', tone: 'bad' };
  if (balance / Math.max(monthIncome, 1) >= 0.3) {
    return { emoji: '🎉', hint: '結餘漂亮,值得鼓勵', tone: 'good' };
  }
  return { emoji: '😌', hint: '收支平衡', tone: 'good' };
};

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

    const streak = calcStreakDays(transactions, today);
    const mood = pickMood({ hasBudget, monthIncome, monthExpense, budgetLimit, spentInBudget });

    return {
      spentToday,
      earnedToday,
      weekExpense,
      daysLeft,
      dailyAverage,
      overBudget,
      remainingBudget,
      monthIncome,
      monthExpense,
      hasBudget,
      streak,
      mood,
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

      <div className="today-hint-footer">
        <span className={`today-hint-streak ${stats.streak >= 30 ? 'gold' : stats.streak >= 3 ? 'hot' : ''}`}>
          <Flame size={14} aria-hidden />
          {stats.streak > 0
            ? <>
                連續記帳 <strong>{stats.streak}</strong> 天
                {stats.streak >= 30 && <span className="streak-unlock-hint"> (已解鎖燙金主題!)</span>}
              </>
            : <>今天還沒記帳</>}
        </span>
        <span
          className={`today-hint-mood tone-${stats.mood.tone}`}
          title={stats.mood.hint}
          aria-label={`本月心情:${stats.mood.hint}`}
        >
          <span className="today-hint-mood-emoji">{stats.mood.emoji}</span>
          <span className="today-hint-mood-hint">{stats.mood.hint}</span>
        </span>
      </div>
    </div>
  );
};

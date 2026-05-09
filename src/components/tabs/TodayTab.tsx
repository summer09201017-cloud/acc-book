import React, { useMemo } from 'react';
import { Dashboard } from '../Dashboard';
import { TodayHintCard } from '../TodayHintCard';
import { MonthSummaryCard } from '../MonthSummaryCard';
import { BudgetProgressCard } from '../BudgetProgressCard';
import { TransactionList } from '../TransactionList';
import { useExpense } from '../../context/ExpenseContext';

export const TodayTab: React.FC = () => {
  const { transactions, activeMonth } = useExpense();
  const monthItems = useMemo(
    () => transactions.filter((tx) => tx.date.startsWith(activeMonth)),
    [activeMonth, transactions]
  );

  return (
    <div className="tab-panel">
      <TodayHintCard />
      <MonthSummaryCard />
      <Dashboard />
      <BudgetProgressCard />
      <TransactionList limit={5} title="選定月最近 5 筆" items={monthItems} />
    </div>
  );
};

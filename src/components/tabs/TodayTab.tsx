import React from 'react';
import { Dashboard } from '../Dashboard';
import { TodayHintCard } from '../TodayHintCard';
import { MonthSummaryCard } from '../MonthSummaryCard';
import { BudgetProgressCard } from '../BudgetProgressCard';
import { TransactionList } from '../TransactionList';

export const TodayTab: React.FC = () => {
  return (
    <div className="tab-panel">
      <TodayHintCard />
      <MonthSummaryCard />
      <Dashboard />
      <BudgetProgressCard />
      <TransactionList limit={5} title="最近 5 筆" />
    </div>
  );
};

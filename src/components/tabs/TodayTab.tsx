import React from 'react';
import { Dashboard } from '../Dashboard';
import { TransactionList } from '../TransactionList';

export const TodayTab: React.FC = () => {
  return (
    <div className="tab-panel">
      <Dashboard />
      <TransactionList limit={5} title="最近 5 筆" />
    </div>
  );
};

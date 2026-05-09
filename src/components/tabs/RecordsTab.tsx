import React from 'react';
import { TransactionList } from '../TransactionList';

export const RecordsTab: React.FC = () => {
  return (
    <div className="tab-panel">
      <TransactionList title="所有紀錄" />
    </div>
  );
};

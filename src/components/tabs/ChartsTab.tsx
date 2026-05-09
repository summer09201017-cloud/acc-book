import React from 'react';
import { PieChartCard } from '../PieChartCard';
import { DailyTrendCard } from '../DailyTrendCard';

export const ChartsTab: React.FC = () => {
  return (
    <div className="tab-panel">
      <DailyTrendCard />
      <PieChartCard />
    </div>
  );
};

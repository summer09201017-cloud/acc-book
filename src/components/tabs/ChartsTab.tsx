import React from 'react';
import { LazyDailyTrendCard, LazyPieChartCard } from '../lazyCharts';
import { HeatmapCard } from '../HeatmapCard';

interface Props {
  onJumpToDate?: (date: string) => void;
}

export const ChartsTab: React.FC<Props> = ({ onJumpToDate }) => {
  return (
    <div className="tab-panel">
      <HeatmapCard onSelectDate={onJumpToDate} />
      <LazyDailyTrendCard />
      <LazyPieChartCard />
    </div>
  );
};

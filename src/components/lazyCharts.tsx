import React, { lazy, Suspense } from 'react';

// recharts is ~150KB gz; defer it until a tab that actually renders a chart
// requests it. Combined with vite.config manualChunks, recharts ends up in
// its own async chunk and stays out of the initial bundle.
const DailyTrendInner = lazy(() =>
  import('./DailyTrendCard').then((m) => ({ default: m.DailyTrendCard }))
);
const PieChartInner = lazy(() =>
  import('./PieChartCard').then((m) => ({ default: m.PieChartCard }))
);

const ChartFallback: React.FC<{ height?: number; label?: string }> = ({
  height = 240,
  label = '圖表載入中…',
}) => (
  <div className="card chart-skeleton" style={{ minHeight: height }}>
    <p className="muted">{label}</p>
  </div>
);

export const LazyDailyTrendCard: React.FC = () => (
  <Suspense fallback={<ChartFallback height={300} label="趨勢圖載入中…" />}>
    <DailyTrendInner />
  </Suspense>
);

export const LazyPieChartCard: React.FC = () => (
  <Suspense fallback={<ChartFallback height={340} label="圓餅圖載入中…" />}>
    <PieChartInner />
  </Suspense>
);

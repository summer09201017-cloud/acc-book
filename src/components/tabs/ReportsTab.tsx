import React from 'react';

export const ReportsTab: React.FC = () => {
  return (
    <div className="tab-panel">
      <div className="card">
        <h2 className="card-title">報告</h2>
        <div className="empty-state">
          <p>本月 vs 上月、Top 5 支出、預算達成率將在 Week 3 上線。</p>
        </div>
      </div>
    </div>
  );
};

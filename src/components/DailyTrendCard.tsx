import React, { useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { useExpense } from '../context/ExpenseContext';
import { currentMonth, pad2 } from '../utils/dateRange';

export const DailyTrendCard: React.FC = () => {
  const { transactions } = useExpense();

  const data = useMemo(() => {
    const cm = currentMonth();
    const today = new Date();
    const isCurrentMonth = today.getFullYear() === cm.year && today.getMonth() + 1 === cm.month;
    const cutoffDay = isCurrentMonth ? today.getDate() : cm.daysInMonth;

    const buckets = new Map<string, number>();
    for (const t of transactions) {
      if (t.type !== 'expense') continue;
      if (t.date < cm.start || t.date > cm.end) continue;
      buckets.set(t.date, (buckets.get(t.date) ?? 0) + t.amount);
    }

    const rows: { day: number; date: string; amount: number }[] = [];
    for (let d = 1; d <= cutoffDay; d++) {
      const date = `${cm.year}-${pad2(cm.month)}-${pad2(d)}`;
      rows.push({ day: d, date, amount: buckets.get(date) ?? 0 });
    }
    return rows;
  }, [transactions]);

  const total = data.reduce((s, r) => s + r.amount, 0);
  const days = data.length || 1;
  const avg = Math.round(total / days);

  return (
    <div className="card">
      <div className="chart-header">
        <h2 className="card-title">本月每日支出</h2>
        <div className="muted" style={{ fontSize: '0.85rem' }}>
          總計 ${total.toLocaleString()} · 日均 ${avg.toLocaleString()}
        </div>
      </div>
      {total === 0 ? (
        <div className="empty-chart"><p>本月還沒有支出紀錄</p></div>
      ) : (
        <div style={{ width: '100%', height: 240 }}>
          <ResponsiveContainer>
            <LineChart data={data} margin={{ top: 10, right: 12, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#eef0f3" />
              <XAxis dataKey="day" tick={{ fontSize: 11 }} interval="preserveStartEnd" />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip
                formatter={(v: number) => [`$${v.toLocaleString()}`, '支出']}
                labelFormatter={(l: number) => `第 ${l} 天`}
                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}
              />
              <Line
                type="monotone"
                dataKey="amount"
                stroke="var(--primary)"
                strokeWidth={2}
                dot={{ r: 2 }}
                activeDot={{ r: 5 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
};

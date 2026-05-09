import React, { useMemo, useState } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { useExpense } from '../context/ExpenseContext';
import { formatYearMonth, monthRangeFromYm } from '../utils/dateRange';

const FALLBACK_COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d', '#ffc658', '#d0ed57'];

export const PieChartCard: React.FC = () => {
  const { transactions, getCategory, activeMonth } = useExpense();
  const [chartType, setChartType] = useState<'expense' | 'income'>('expense');

  const data = useMemo(() => {
    const range = monthRangeFromYm(activeMonth);
    const filtered = transactions.filter((t) =>
      t.type === chartType && t.date >= range.start && t.date <= range.end
    );
    const totals = filtered.reduce<Record<string, number>>((acc, curr) => {
      acc[curr.categoryId] = (acc[curr.categoryId] || 0) + curr.amount;
      return acc;
    }, {});

    return Object.entries(totals)
      .map(([categoryId, amount]) => {
        const cat = getCategory(categoryId);
        return {
          name: cat?.name ?? '未知',
          value: amount,
          fill: cat?.bgColor,
        };
      })
      .filter((item) => item.value > 0)
      .sort((a, b) => b.value - a.value);
  }, [activeMonth, transactions, chartType, getCategory]);

  if (transactions.length === 0) {
    return (
      <div className="card chart-card">
        <h2 className="card-title">{formatYearMonth(activeMonth)}收支分析</h2>
        <div className="empty-chart"><p>尚無資料</p></div>
      </div>
    );
  }

  return (
    <div className="card chart-card">
      <div className="chart-header">
        <h2 className="card-title">{formatYearMonth(activeMonth)}收支分析</h2>
        <div className="chart-toggle">
          <button
            className={`chart-btn ${chartType === 'expense' ? 'active' : ''}`}
            onClick={() => setChartType('expense')}
          >
            支出
          </button>
          <button
            className={`chart-btn ${chartType === 'income' ? 'active' : ''}`}
            onClick={() => setChartType('income')}
          >
            收入
          </button>
        </div>
      </div>

      {data.length === 0 ? (
        <div className="empty-chart">
          <p>此分類目前沒有數據</p>
        </div>
      ) : (
        <div className="chart-container" style={{ width: '100%', height: 300 }}>
          <ResponsiveContainer>
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={90}
                paddingAngle={5}
                dataKey="value"
              >
                {data.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={entry.fill || FALLBACK_COLORS[index % FALLBACK_COLORS.length]}
                  />
                ))}
              </Pie>
              <Tooltip
                formatter={(value: number) => `$${value.toLocaleString()}`}
                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}
              />
              <Legend verticalAlign="bottom" height={36} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
};

import React, { useMemo } from 'react';
import { useExpense } from '../context/ExpenseContext';
import { ymd } from '../utils/dateRange';

interface Props {
  onSelectDate?: (date: string) => void;
}

const WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六'];
const MONTH_LABELS = ['1月','2月','3月','4月','5月','6月','7月','8月','9月','10月','11月','12月'];

interface Cell {
  key: string;
  date: string;
  amount: number;
  level: number;     // 0..4
  inFuture: boolean;
}

export const HeatmapCard: React.FC<Props> = ({ onSelectDate }) => {
  const { transactions } = useExpense();

  const { weeks, totalAmount, totalDays, maxAmount, monthMarkers } = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Anchor the rightmost column on the week containing today.
    // Grid layout = 53 columns × 7 rows (Sunday top → Saturday bottom).
    const lastSunday = new Date(today);
    lastSunday.setDate(today.getDate() - today.getDay());
    const startSunday = new Date(lastSunday);
    startSunday.setDate(lastSunday.getDate() - 52 * 7);

    const sums = new Map<string, number>();
    const earliest = startSunday.getTime();
    for (const tx of transactions) {
      if (tx.type !== 'expense') continue;
      const t = new Date(tx.date).getTime();
      if (Number.isNaN(t) || t < earliest) continue;
      sums.set(tx.date, (sums.get(tx.date) ?? 0) + tx.amount);
    }

    let maxAmount = 0;
    for (const v of sums.values()) if (v > maxAmount) maxAmount = v;
    // Use a soft cap (90th-percentile-ish via clamp at maxAmount) for level bucketing.
    const bucket = (amount: number): number => {
      if (amount <= 0 || maxAmount <= 0) return 0;
      const ratio = amount / maxAmount;
      if (ratio >= 0.75) return 4;
      if (ratio >= 0.5) return 3;
      if (ratio >= 0.25) return 2;
      return 1;
    };

    const todayMs = today.getTime();
    const weeks: Cell[][] = [];
    const monthMarkers: { col: number; label: string }[] = [];
    let lastMonthLabeled = -1;

    for (let w = 0; w < 53; w++) {
      const column: Cell[] = [];
      for (let d = 0; d < 7; d++) {
        const cellDate = new Date(startSunday);
        cellDate.setDate(startSunday.getDate() + w * 7 + d);
        const dateStr = ymd(cellDate);
        const amount = sums.get(dateStr) ?? 0;
        const inFuture = cellDate.getTime() > todayMs;
        column.push({
          key: dateStr,
          date: dateStr,
          amount,
          level: inFuture ? 0 : bucket(amount),
          inFuture,
        });
        // Month label on the first row only, when the month changes.
        if (d === 0) {
          const m = cellDate.getMonth();
          if (m !== lastMonthLabeled) {
            monthMarkers.push({ col: w, label: MONTH_LABELS[m] });
            lastMonthLabeled = m;
          }
        }
      }
      weeks.push(column);
    }

    let totalAmount = 0;
    let totalDays = 0;
    for (const v of sums.values()) {
      if (v > 0) {
        totalAmount += v;
        totalDays += 1;
      }
    }

    return { weeks, totalAmount, totalDays, maxAmount, monthMarkers };
  }, [transactions]);

  const avg = totalDays > 0 ? Math.round(totalAmount / totalDays) : 0;

  return (
    <div className="card heatmap-card">
      <div className="chart-header">
        <h2 className="card-title">365 天支出熱力圖</h2>
        <div className="muted" style={{ fontSize: '0.85rem' }}>
          {totalDays} 天有支出 · 合計 ${totalAmount.toLocaleString()} · 日均 ${avg.toLocaleString()}
        </div>
      </div>

      <div className="heatmap-scroll">
        <div className="heatmap-inner">
          <div className="heatmap-month-row" aria-hidden>
            {Array.from({ length: 53 }).map((_, col) => {
              const marker = monthMarkers.find((m) => m.col === col);
              return (
                <span key={col} className="heatmap-month-cell">
                  {marker?.label ?? ''}
                </span>
              );
            })}
          </div>

          <div className="heatmap-body">
            <div className="heatmap-weekday-col" aria-hidden>
              {WEEKDAYS.map((w, i) => (
                <span key={w} className={`heatmap-weekday ${i % 2 === 1 ? 'visible' : ''}`}>
                  {i % 2 === 1 ? w : ''}
                </span>
              ))}
            </div>
            <div
              className="heatmap-grid"
              role="grid"
              aria-label="近 365 天支出熱力圖"
            >
              {weeks.map((column, ci) => (
                <div key={ci} className="heatmap-col" role="row">
                  {column.map((cell) => {
                    if (cell.inFuture) {
                      return <span key={cell.key} className="heatmap-cell future" aria-hidden />;
                    }
                    const label = `${cell.date}：支出 $${cell.amount.toLocaleString()}`;
                    return (
                      <button
                        type="button"
                        key={cell.key}
                        className={`heatmap-cell level-${cell.level}`}
                        title={label}
                        aria-label={label}
                        onClick={() => onSelectDate?.(cell.date)}
                      />
                    );
                  })}
                </div>
              ))}
            </div>
          </div>

          <div className="heatmap-legend" aria-hidden>
            <span className="muted">少</span>
            {[0, 1, 2, 3, 4].map((lvl) => (
              <span key={lvl} className={`heatmap-cell level-${lvl}`} />
            ))}
            <span className="muted">多</span>
            {maxAmount > 0 && (
              <span className="muted heatmap-legend-max">
                · 單日最高 ${maxAmount.toLocaleString()}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

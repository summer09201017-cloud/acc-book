import React, { useMemo } from 'react';
import { useExpense } from '../../context/ExpenseContext';
import { currentMonth, previousMonth, sumInRange } from '../../utils/dateRange';
import { CategoryIcon } from '../CategoryIcon';
import { Category } from '../../db/schema';

interface CategoryTotal {
  categoryId: string;
  name: string;
  cat?: Category;
  bgColor: string;
  amount: number;
}

export const ReportsTab: React.FC = () => {
  const { transactions, getCategory } = useExpense();

  const data = useMemo(() => {
    const cm = currentMonth();
    const pm = previousMonth();

    const thisExp = sumInRange(transactions, 'expense', cm.start, cm.end);
    const lastExp = sumInRange(transactions, 'expense', pm.start, pm.end);
    const thisInc = sumInRange(transactions, 'income', cm.start, cm.end);
    const lastInc = sumInRange(transactions, 'income', pm.start, pm.end);

    // Top 5 expense categories this month
    const categoryTotals = new Map<string, number>();
    for (const t of transactions) {
      if (t.type !== 'expense') continue;
      if (t.date < cm.start || t.date > cm.end) continue;
      categoryTotals.set(t.categoryId, (categoryTotals.get(t.categoryId) ?? 0) + t.amount);
    }
    const topCategories: CategoryTotal[] = Array.from(categoryTotals.entries())
      .map(([id, amount]) => {
        const cat = getCategory(id);
        return {
          categoryId: id,
          name: cat?.name ?? '未知',
          cat,
          bgColor: cat?.bgColor ?? '#E5E7EB',
          amount,
        };
      })
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5);

    // Top 5 single transactions this month
    const topSingle = transactions
      .filter((t) => t.type === 'expense' && t.date >= cm.start && t.date <= cm.end)
      .slice()
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5);

    const totalCategoryAmount = topCategories.reduce((s, c) => s + c.amount, 0);

    return {
      cm, pm,
      thisExp, lastExp, thisInc, lastInc,
      expDiff: thisExp - lastExp,
      incDiff: thisInc - lastInc,
      topCategories,
      topSingle,
      totalCategoryAmount,
    };
  }, [transactions, getCategory]);

  const expRatio = data.lastExp > 0 ? Math.round((data.expDiff / data.lastExp) * 100) : null;
  const incRatio = data.lastInc > 0 ? Math.round((data.incDiff / data.lastInc) * 100) : null;

  return (
    <div className="tab-panel">
      <div className="card">
        <h2 className="card-title">本月 vs 上月</h2>
        <div className="report-compare">
          <div className="report-compare-row">
            <div className="report-compare-label">支出</div>
            <div className="report-compare-values">
              <div>
                <span className="muted">本月</span>
                <strong>${data.thisExp.toLocaleString()}</strong>
              </div>
              <div>
                <span className="muted">上月</span>
                <strong className="muted">${data.lastExp.toLocaleString()}</strong>
              </div>
              <div className={`report-diff ${data.expDiff > 0 ? 'down' : data.expDiff < 0 ? 'up' : 'flat'}`}>
                {data.expDiff === 0
                  ? '持平'
                  : `${data.expDiff > 0 ? '↑' : '↓'} $${Math.abs(data.expDiff).toLocaleString()}` +
                    (expRatio !== null ? ` (${expRatio > 0 ? '+' : ''}${expRatio}%)` : '')}
              </div>
            </div>
          </div>

          <div className="report-compare-row">
            <div className="report-compare-label">收入</div>
            <div className="report-compare-values">
              <div>
                <span className="muted">本月</span>
                <strong>${data.thisInc.toLocaleString()}</strong>
              </div>
              <div>
                <span className="muted">上月</span>
                <strong className="muted">${data.lastInc.toLocaleString()}</strong>
              </div>
              <div className={`report-diff ${data.incDiff > 0 ? 'up' : data.incDiff < 0 ? 'down' : 'flat'}`}>
                {data.incDiff === 0
                  ? '持平'
                  : `${data.incDiff > 0 ? '↑' : '↓'} $${Math.abs(data.incDiff).toLocaleString()}` +
                    (incRatio !== null ? ` (${incRatio > 0 ? '+' : ''}${incRatio}%)` : '')}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="card">
        <h2 className="card-title">本月 Top 5 支出分類</h2>
        {data.topCategories.length === 0 ? (
          <div className="empty-state"><p>本月還沒有支出紀錄。</p></div>
        ) : (
          <ul className="report-rank">
            {data.topCategories.map((c, i) => {
              const widthPct = data.topCategories[0].amount > 0
                ? (c.amount / data.topCategories[0].amount) * 100
                : 0;
              const sharePct = data.thisExp > 0
                ? Math.round((c.amount / data.thisExp) * 100)
                : 0;
              return (
                <li key={c.categoryId} className="report-rank-item">
                  <div className="report-rank-head">
                    <span className="report-rank-no">{i + 1}</span>
                    <CategoryIcon category={c.cat} size={28} className="report-rank-emoji" />
                    <span className="report-rank-name">{c.name}</span>
                    <span className="report-rank-amount">
                      ${c.amount.toLocaleString()} <span className="muted">({sharePct}%)</span>
                    </span>
                  </div>
                  <div className="report-rank-bar">
                    <div
                      className="report-rank-bar-fill"
                      style={{ width: `${widthPct}%`, background: c.bgColor }}
                    />
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <div className="card">
        <h2 className="card-title">本月最大 5 筆支出</h2>
        {data.topSingle.length === 0 ? (
          <div className="empty-state"><p>本月還沒有支出紀錄。</p></div>
        ) : (
          <ul className="report-single-list">
            {data.topSingle.map((tx) => {
              const cat = getCategory(tx.categoryId);
              return (
                <li key={tx.id} className="report-single-item">
                  <div className="report-single-left">
                    <CategoryIcon category={cat} size={36} className="report-single-emoji" />
                    <div>
                      <div className="report-single-name">{cat?.name ?? '未知'}</div>
                      <div className="report-single-meta muted">
                        {tx.date}{tx.note ? ` · ${tx.note}` : ''}
                      </div>
                    </div>
                  </div>
                  <div className="report-single-amount">${tx.amount.toLocaleString()}</div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
};

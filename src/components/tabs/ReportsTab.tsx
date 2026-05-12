import React, { useMemo } from 'react';
import { useExpense } from '../../context/ExpenseContext';
import { formatYearMonth, monthRangeFromYm, previousMonthOf, sumInRange } from '../../utils/dateRange';
import { CategoryIcon } from '../CategoryIcon';
import { Category } from '../../db/schema';

interface CategoryTotal {
  categoryId: string;
  name: string;
  cat?: Category;
  bgColor: string;
  amount: number;
}

interface MerchantTotal {
  token: string;
  amount: number;
  count: number;
}

// Strips common filler words / dates / numbers so the merchant token surfaces.
// Tokens are looked up case-insensitively and shorter than 1 character are dropped.
const STOP_WORDS = new Set([
  '的', '在', '一下', '今天', '昨天', '中午', '早餐', '午餐', '晚餐', '宵夜',
  '買', '吃', '喝', '請', '一杯', '一份', '兩份', '三份', '個', '元',
]);

const tokenizeNote = (note: string): string[] => {
  if (!note) return [];
  // Split on whitespace, punctuation, and digits while keeping CJK characters intact.
  const parts = note
    .replace(/[\s,，、\.。·;:;!?！？/\\()\[\]【】「」『』"'`~]+/g, ' ')
    .replace(/\d+/g, ' ')
    .split(/\s+/)
    .map((s) => s.trim())
    .filter(Boolean);
  return parts.filter((p) => !STOP_WORDS.has(p) && p.length >= 2);
};

export const ReportsTab: React.FC = () => {
  const { transactions, getCategory, activeMonth } = useExpense();

  const data = useMemo(() => {
    const cm = monthRangeFromYm(activeMonth);
    const pm = previousMonthOf(cm);

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

    // Top 5 merchants / tokens from notes (this month, expenses only)
    const merchantMap = new Map<string, MerchantTotal>();
    for (const t of transactions) {
      if (t.type !== 'expense') continue;
      if (t.date < cm.start || t.date > cm.end) continue;
      const tokens = tokenizeNote(t.note);
      // Dedupe within a single transaction so "早餐 早餐" doesn't double-count.
      const uniq = Array.from(new Set(tokens));
      for (const token of uniq) {
        const cur = merchantMap.get(token) ?? { token, amount: 0, count: 0 };
        cur.amount += t.amount;
        cur.count += 1;
        merchantMap.set(token, cur);
      }
    }
    const topMerchants = Array.from(merchantMap.values())
      .filter((m) => m.count >= 2) // only show recurring patterns
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5);

    return {
      cm, pm,
      thisExp, lastExp, thisInc, lastInc,
      expDiff: thisExp - lastExp,
      incDiff: thisInc - lastInc,
      topCategories,
      topSingle,
      topMerchants,
      totalCategoryAmount,
    };
  }, [activeMonth, transactions, getCategory]);

  const expRatio = data.lastExp > 0 ? Math.round((data.expDiff / data.lastExp) * 100) : null;
  const incRatio = data.lastInc > 0 ? Math.round((data.incDiff / data.lastInc) * 100) : null;

  return (
    <div className="tab-panel">
      <div className="card">
        <h2 className="card-title">{formatYearMonth(activeMonth)} vs 上月</h2>
        <div className="report-compare">
          <div className="report-compare-row">
            <div className="report-compare-label">支出</div>
            <div className="report-compare-values">
              <div>
                <span className="muted">選定月</span>
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
                <span className="muted">選定月</span>
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
        <h2 className="card-title">選定月 Top 5 支出分類</h2>
        {data.topCategories.length === 0 ? (
          <div className="empty-state"><p>這個月份還沒有支出紀錄。</p></div>
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
        <h2 className="card-title">選定月 Top 5 商家/關鍵字</h2>
        <p className="muted" style={{ marginTop: '-0.75rem', marginBottom: '0.75rem', fontSize: '0.8rem' }}>
          從備註自動萃取(至少出現 2 次),例如「星巴克」「全家」「Uber」。
        </p>
        {data.topMerchants.length === 0 ? (
          <div className="empty-state"><p>備註裡還沒有重複出現的關鍵字。</p></div>
        ) : (
          <ul className="report-merchant-list">
            {data.topMerchants.map((m, i) => {
              const widthPct = data.topMerchants[0].amount > 0
                ? (m.amount / data.topMerchants[0].amount) * 100
                : 0;
              return (
                <li key={m.token} className="report-rank-item">
                  <div className="report-rank-head">
                    <span className="report-rank-no">{i + 1}</span>
                    <span className="report-rank-name">{m.token}</span>
                    <span className="report-rank-amount">
                      ${m.amount.toLocaleString()} <span className="muted">({m.count} 筆)</span>
                    </span>
                  </div>
                  <div className="report-rank-bar">
                    <div
                      className="report-rank-bar-fill"
                      style={{ width: `${widthPct}%`, background: 'var(--primary)' }}
                    />
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <div className="card">
        <h2 className="card-title">選定月最大 5 筆支出</h2>
        {data.topSingle.length === 0 ? (
          <div className="empty-state"><p>這個月份還沒有支出紀錄。</p></div>
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

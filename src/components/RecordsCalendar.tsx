import React, { useMemo } from 'react';
import { Transaction } from '../db/schema';
import { pad2, ymd } from '../utils/dateRange';

interface Props {
  month: string;
  transactions: Transaction[];
  selectedDate: string;
  onSelectDate: (date: string) => void;
}

interface DayStats {
  income: number;
  expense: number;
  count: number;
}

const weekdays = ['日', '一', '二', '三', '四', '五', '六'];

const formatCurrency = (amount: number) => `$${amount.toLocaleString()}`;

export const RecordsCalendar: React.FC<Props> = ({
  month,
  transactions,
  selectedDate,
  onSelectDate,
}) => {
  const today = ymd(new Date());
  const [year, monthNumber] = month.split('-').map(Number);
  const daysInMonth = new Date(year, monthNumber, 0).getDate();
  const firstWeekday = new Date(year, monthNumber - 1, 1).getDay();

  const statsByDate = useMemo(() => {
    const map = new Map<string, DayStats>();
    for (const tx of transactions) {
      if (!tx.date.startsWith(month)) continue;
      const stats = map.get(tx.date) ?? { income: 0, expense: 0, count: 0 };
      stats.count += 1;
      if (tx.type === 'income') stats.income += tx.amount;
      else stats.expense += tx.amount;
      map.set(tx.date, stats);
    }
    return map;
  }, [month, transactions]);

  const maxExpense = useMemo(() => {
    let max = 0;
    statsByDate.forEach((stats) => {
      max = Math.max(max, stats.expense);
    });
    return max;
  }, [statsByDate]);

  const totals = useMemo(() => {
    let income = 0;
    let expense = 0;
    statsByDate.forEach((stats) => {
      income += stats.income;
      expense += stats.expense;
    });
    return { income, expense, balance: income - expense };
  }, [statsByDate]);

  const blanks = Array.from({ length: firstWeekday }, (_, i) => `blank-${i}`);
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  const expenseLevel = (expense: number) => {
    if (expense <= 0 || maxExpense <= 0) return 0;
    return Math.max(1, Math.ceil((expense / maxExpense) * 4));
  };

  return (
    <div className="card records-calendar-card">
      <div className="records-calendar-head">
        <div>
          <h2 className="card-title">月曆明細</h2>
          <p className="records-calendar-meta">
            {year} 年 {monthNumber} 月 · {transactions.length} 筆
          </p>
        </div>
        <div className="records-calendar-total">
          <span className="income">收 {formatCurrency(totals.income)}</span>
          <span className="expense">支 {formatCurrency(totals.expense)}</span>
          <span className={totals.balance >= 0 ? 'income' : 'expense'}>
            餘 {formatCurrency(totals.balance)}
          </span>
        </div>
      </div>

      <div className="records-calendar-weekdays" aria-hidden>
        {weekdays.map((weekday) => (
          <span key={weekday} className="records-calendar-weekday">{weekday}</span>
        ))}
      </div>

      <div className="records-calendar-grid">
        {blanks.map((key) => (
          <span key={key} className="records-calendar-cell empty" aria-hidden />
        ))}

        {days.map((day) => {
          const date = `${month}-${pad2(day)}`;
          const stats = statsByDate.get(date) ?? { income: 0, expense: 0, count: 0 };
          const balance = stats.income - stats.expense;
          const level = expenseLevel(stats.expense);
          const classes = [
            'records-calendar-cell',
            stats.count > 0 ? 'has-records' : '',
            stats.income > 0 && stats.expense === 0 ? 'income-only' : '',
            level > 0 ? `expense-level-${level}` : '',
            selectedDate === date ? 'selected' : '',
            today === date ? 'today' : '',
          ].filter(Boolean).join(' ');

          return (
            <button
              key={date}
              type="button"
              className={classes}
              onClick={() => onSelectDate(date)}
              aria-pressed={selectedDate === date}
              aria-label={`${date}，${stats.count} 筆，收入 ${formatCurrency(stats.income)}，支出 ${formatCurrency(stats.expense)}，餘額 ${formatCurrency(balance)}`}
            >
              <span className="records-calendar-top">
                <span className="records-calendar-day-number">{day}</span>
                {stats.count > 0 && <span className="records-calendar-count">{stats.count}</span>}
              </span>
              <span className="records-calendar-amounts">
                {stats.expense > 0 && (
                  <span className="records-calendar-amount expense">
                    支 {formatCurrency(stats.expense)}
                  </span>
                )}
                {stats.income > 0 && (
                  <span className="records-calendar-amount income">
                    收 {formatCurrency(stats.income)}
                  </span>
                )}
                {stats.count > 0 && (
                  <span className={`records-calendar-amount balance ${balance >= 0 ? 'income' : 'expense'}`}>
                    餘 {formatCurrency(balance)}
                  </span>
                )}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

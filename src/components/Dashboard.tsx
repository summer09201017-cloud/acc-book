import React, { useMemo } from 'react';
import { useExpense } from '../context/ExpenseContext';
import { ArrowUpCircle, ArrowDownCircle, Wallet } from 'lucide-react';
import { monthRangeFromYm } from '../utils/dateRange';

export const Dashboard: React.FC = () => {
  const { transactions, activeMonth } = useExpense();

  const { totalIncome, totalExpense, balance } = useMemo(() => {
    const range = monthRangeFromYm(activeMonth);
    return transactions.reduce(
      (acc, curr) => {
        if (curr.date < range.start || curr.date > range.end) return acc;
        if (curr.type === 'income') {
          acc.totalIncome += curr.amount;
          acc.balance += curr.amount;
        } else {
          acc.totalExpense += curr.amount;
          acc.balance -= curr.amount;
        }
        return acc;
      },
      { totalIncome: 0, totalExpense: 0, balance: 0 }
    );
  }, [activeMonth, transactions]);

  return (
    <div className="dashboard">
      <div className="summary-card balance-card">
        <div className="summary-icon balance">
          <Wallet size={24} />
        </div>
        <div className="summary-info">
          <h3>選定月結餘</h3>
          <p className="amount">${balance.toLocaleString()}</p>
        </div>
      </div>
      
      <div className="summary-row">
        <div className="summary-card income-card">
          <div className="summary-icon income">
            <ArrowUpCircle size={24} />
          </div>
          <div className="summary-info">
            <h3>選定月收入</h3>
            <p className="amount">${totalIncome.toLocaleString()}</p>
          </div>
        </div>
        
        <div className="summary-card expense-card">
          <div className="summary-icon expense">
            <ArrowDownCircle size={24} />
          </div>
          <div className="summary-info">
            <h3>選定月支出</h3>
            <p className="amount">${totalExpense.toLocaleString()}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

import React from 'react';
import { Trash2 } from 'lucide-react';
import { useExpense } from '../context/ExpenseContext';

interface Props {
  limit?: number;
  title?: string;
}

export const TransactionList: React.FC<Props> = ({ limit, title = '最近紀錄' }) => {
  const { transactions, deleteTransaction, getCategory } = useExpense();
  const items = typeof limit === 'number' ? transactions.slice(0, limit) : transactions;

  return (
    <div className="card list-card">
      <h2 className="card-title">{title}</h2>

      {items.length === 0 ? (
        <div className="empty-state">
          <p>目前沒有任何紀錄，趕快新增一筆吧！</p>
        </div>
      ) : (
        <ul className="transaction-list">
          {items.map((tx) => {
            const cat = getCategory(tx.categoryId);
            const emoji = cat?.emoji ?? '❓';
            const name = cat?.name ?? '未知';
            const bg = cat?.bgColor ?? '#E5E7EB';
            return (
              <li key={tx.id} className="transaction-item">
                <div className="transaction-info">
                  <div className="transaction-icon" style={{ backgroundColor: bg }}>
                    {emoji}
                  </div>
                  <div className="transaction-details">
                    <span className="transaction-category">{name}</span>
                    <span className="transaction-note">{tx.note || tx.date}</span>
                  </div>
                </div>
                <div className="transaction-actions">
                  <span className={`transaction-amount ${tx.type}`}>
                    {tx.type === 'income' ? '+' : '-'}${tx.amount.toLocaleString()}
                  </span>
                  <button
                    className="delete-btn"
                    onClick={() => deleteTransaction(tx.id)}
                    title="刪除"
                    aria-label="刪除這筆紀錄"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};

import React, { useRef } from 'react';
import { Copy, Pencil, Trash2 } from 'lucide-react';
import { useExpense } from '../context/ExpenseContext';
import { Transaction } from '../db/schema';
import { triggerHaptic } from '../hooks/useSettings';
import { CategoryIcon } from './CategoryIcon';

interface Props {
  limit?: number;
  title?: string;
  items?: Transaction[];
  emptyHint?: string;
  hideTitle?: boolean;
}

const LONG_PRESS_MS = 500;

export const TransactionList: React.FC<Props> = ({
  limit,
  title = '最近紀錄',
  items: itemsProp,
  emptyHint = '目前沒有任何紀錄，趕快新增一筆吧！',
  hideTitle = false,
}) => {
  const { transactions, deleteTransaction, duplicateTransaction, getCategory, openEditor } = useExpense();
  const source = itemsProp ?? transactions;
  const items = typeof limit === 'number' ? source.slice(0, limit) : source;

  // One shared timer is enough — only one row can be pressed at a time.
  const timerRef = useRef<number | null>(null);
  const firedRef = useRef(false);

  const startPress = (txId: string) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    firedRef.current = false;
    timerRef.current = window.setTimeout(() => {
      firedRef.current = true;
      timerRef.current = null;
      triggerHaptic(12);
      void duplicateTransaction(txId);
    }, LONG_PRESS_MS);
  };

  const cancelPress = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  return (
    <div className="card list-card">
      {!hideTitle && <h2 className="card-title">{title}</h2>}

      {items.length === 0 ? (
        <div className="empty-state">
          <p>{emptyHint}</p>
        </div>
      ) : (
        <ul className="transaction-list">
          {items.map((tx) => {
            const cat = getCategory(tx.categoryId);
            const name = cat?.name ?? '未知';
            return (
              <li
                key={tx.id}
                className="transaction-item"
                title="長按或點 📋 可複製此筆到今天"
                onPointerDown={(e) => {
                  // Don't start the long-press timer when pressing on a button (edit/delete);
                  // those have their own click handlers.
                  if ((e.target as HTMLElement).closest('button')) return;
                  startPress(tx.id);
                }}
                onPointerUp={cancelPress}
                onPointerLeave={cancelPress}
                onPointerCancel={cancelPress}
              >
                <div className="transaction-info">
                  <CategoryIcon category={cat} size={40} className="transaction-icon" />
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
                    className="icon-btn"
                    onClick={() => {
                      triggerHaptic(8);
                      void duplicateTransaction(tx.id);
                    }}
                    title="再記一筆相同的(複製到今天)"
                    aria-label="再記一筆相同的"
                  >
                    <Copy size={16} />
                  </button>
                  <button
                    className="icon-btn"
                    onClick={() => openEditor(tx)}
                    title="編輯"
                    aria-label="編輯這筆紀錄"
                  >
                    <Pencil size={16} />
                  </button>
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

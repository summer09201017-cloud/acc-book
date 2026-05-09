import React, { useEffect, useState } from 'react';
import { PlusCircle } from 'lucide-react';
import { useExpense } from '../context/ExpenseContext';
import { TransactionType } from '../db/schema';

interface Props {
  onSubmitted?: () => void;
}

export const TransactionForm: React.FC<Props> = ({ onSubmitted }) => {
  const { addTransaction, expenseCategories, incomeCategories } = useExpense();

  const [type, setType] = useState<TransactionType>('expense');
  const [amount, setAmount] = useState('');
  const [categoryId, setCategoryId] = useState<string>('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [note, setNote] = useState('');

  const currentCategories = type === 'expense' ? expenseCategories : incomeCategories;

  // Reset categoryId whenever type/categories change and current selection is invalid.
  useEffect(() => {
    if (currentCategories.length === 0) return;
    if (!currentCategories.some((c) => c.id === categoryId)) {
      setCategoryId(currentCategories[0].id);
    }
  }, [type, currentCategories, categoryId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const value = Number(amount);
    if (!amount || isNaN(value) || value <= 0 || !categoryId) return;

    await addTransaction({
      type,
      amount: value,
      categoryId,
      date,
      note: note.trim(),
    });

    setAmount('');
    setNote('');
    onSubmitted?.();
  };

  return (
    <div className="card form-card">
      <h2 className="card-title">新增紀錄</h2>
      <form onSubmit={handleSubmit} className="transaction-form">

        <div className="form-group type-toggle">
          <button
            type="button"
            className={`toggle-btn ${type === 'expense' ? 'expense-active' : ''}`}
            onClick={() => setType('expense')}
          >
            支出
          </button>
          <button
            type="button"
            className={`toggle-btn ${type === 'income' ? 'income-active' : ''}`}
            onClick={() => setType('income')}
          >
            收入
          </button>
        </div>

        <div className="form-row">
          <div className="form-group flex-1">
            <label>金額</label>
            <div className="input-with-icon">
              <span className="currency-symbol">$</span>
              <input
                type="number"
                inputMode="decimal"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0"
                required
                min="0"
              />
            </div>
          </div>

          <div className="form-group flex-1">
            <label>日期</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
            />
          </div>
        </div>

        <div className="form-group">
          <label>分類</label>
          <div className="category-grid">
            {currentCategories.map((cat) => (
              <button
                type="button"
                key={cat.id}
                className={`category-tile ${categoryId === cat.id ? 'active' : ''}`}
                onClick={() => setCategoryId(cat.id)}
                aria-pressed={categoryId === cat.id}
              >
                <span
                  className="category-tile-circle"
                  style={{ backgroundColor: cat.bgColor }}
                  aria-hidden
                >
                  {cat.emoji}
                </span>
                <span className="category-tile-name">{cat.name}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="form-group">
          <label>備註 (選填)</label>
          <input
            type="text"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="例如：午餐、薪水"
          />
        </div>

        <button type="submit" className="submit-btn">
          <PlusCircle size={20} />
          <span>新增紀錄</span>
        </button>
      </form>
    </div>
  );
};

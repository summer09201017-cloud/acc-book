import React, { useEffect, useMemo, useState } from 'react';
import { PlusCircle, Save } from 'lucide-react';
import { useExpense } from '../context/ExpenseContext';
import { Transaction, TransactionType } from '../db/schema';
import { evaluateExpression } from '../utils/expression';
import { CategoryIcon } from './CategoryIcon';

interface Props {
  onSubmitted?: () => void;
  editing?: Transaction | null;
}

const todayStr = () => new Date().toISOString().split('T')[0];

const QUICK_AMOUNTS = [50, 100, 500, 1000];

export const TransactionForm: React.FC<Props> = ({ onSubmitted, editing }) => {
  const { upsertTransaction, expenseCategories, incomeCategories } = useExpense();

  const [type, setType] = useState<TransactionType>(editing?.type ?? 'expense');
  const [amountText, setAmountText] = useState<string>(editing ? String(editing.amount) : '');
  const [categoryId, setCategoryId] = useState<string>(editing?.categoryId ?? '');
  const [date, setDate] = useState(editing?.date ?? todayStr());
  const [note, setNote] = useState(editing?.note ?? '');

  // Re-seed when the edit target changes (modal reopened on a different row).
  useEffect(() => {
    if (!editing) return;
    setType(editing.type);
    setAmountText(String(editing.amount));
    setCategoryId(editing.categoryId);
    setDate(editing.date);
    setNote(editing.note);
  }, [editing?.id]);

  const currentCategories = type === 'expense' ? expenseCategories : incomeCategories;

  useEffect(() => {
    if (currentCategories.length === 0) return;
    if (!currentCategories.some((c) => c.id === categoryId)) {
      setCategoryId(currentCategories[0].id);
    }
  }, [type, currentCategories, categoryId]);

  const evalResult = useMemo(() => evaluateExpression(amountText), [amountText]);
  const previewValue = evalResult.ok ? Math.round(evalResult.value * 100) / 100 : null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!evalResult.ok || previewValue === null || previewValue <= 0 || !categoryId) return;

    await upsertTransaction(
      {
        type,
        amount: previewValue,
        categoryId,
        date,
        note: note.trim(),
      },
      editing?.id
    );

    if (!editing) {
      setAmountText('');
      setNote('');
    }
    onSubmitted?.();
  };

  const applyQuickAmount = (n: number) => {
    // Tap to set; if the field already holds a plain integer, treat tapping as
    // additive (so 100 → tap 50 = 150) for fast multi-tap entry.
    if (/^\d+$/.test(amountText.trim())) {
      const next = Number(amountText) + n;
      setAmountText(String(next));
    } else {
      setAmountText(String(n));
    }
  };

  const isEdit = Boolean(editing);

  return (
    <div className="card form-card">
      <h2 className="card-title">{isEdit ? '編輯紀錄' : '新增紀錄'}</h2>
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
            <label>金額（可輸入算式：120+80*2）</label>
            <div className="input-with-icon">
              <span className="currency-symbol">$</span>
              <input
                type="text"
                inputMode="decimal"
                value={amountText}
                onChange={(e) => setAmountText(e.target.value)}
                placeholder="0 或 120+80*2"
                required
                aria-invalid={amountText !== '' && !evalResult.ok}
              />
            </div>
            {evalResult.isExpression && (
              <div className={`amount-preview ${evalResult.ok ? '' : 'error'}`}>
                {evalResult.ok
                  ? `= $${previewValue!.toLocaleString()}`
                  : '算式無效'}
              </div>
            )}
            <div className="quick-amount-row" role="group" aria-label="常用金額">
              {QUICK_AMOUNTS.map((n) => (
                <button
                  key={n}
                  type="button"
                  className="quick-amount-btn"
                  onClick={() => applyQuickAmount(n)}
                >
                  +{n}
                </button>
              ))}
              {amountText && (
                <button
                  type="button"
                  className="quick-amount-btn quick-amount-clear"
                  onClick={() => setAmountText('')}
                >
                  清除
                </button>
              )}
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
                <CategoryIcon category={cat} size={44} className="category-tile-circle" />
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
          {isEdit ? <Save size={20} /> : <PlusCircle size={20} />}
          <span>{isEdit ? '儲存修改' : '新增紀錄'}</span>
        </button>
      </form>
    </div>
  );
};

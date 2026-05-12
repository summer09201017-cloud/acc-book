import React, { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { useExpense } from '../context/ExpenseContext';
import { RecurringFrequency, TransactionType } from '../db/schema';
import { CategoryIcon } from './CategoryIcon';
import { ymd } from '../utils/dateRange';

const WEEKDAY_LABELS = ['日', '一', '二', '三', '四', '五', '六'];

export const RecurringRuleCard: React.FC = () => {
  const {
    recurringRules,
    expenseCategories,
    incomeCategories,
    getCategory,
    addRecurringRule,
    updateRecurringRule,
    deleteRecurringRule,
    showToast,
  } = useExpense();

  const [open, setOpen] = useState(false);
  const [label, setLabel] = useState('');
  const [type, setType] = useState<TransactionType>('expense');
  const [amountText, setAmountText] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [note, setNote] = useState('');
  const [frequency, setFrequency] = useState<RecurringFrequency>('monthly');
  const [dayOfMonth, setDayOfMonth] = useState<number>(1);
  const [weekday, setWeekday] = useState<number>(1);
  const [startDate, setStartDate] = useState(ymd(new Date()));

  const list = type === 'expense' ? expenseCategories : incomeCategories;

  const reset = () => {
    setLabel('');
    setAmountText('');
    setNote('');
    setCategoryId('');
    setFrequency('monthly');
    setDayOfMonth(1);
    setWeekday(1);
    setStartDate(ymd(new Date()));
  };

  const canSubmit = label.trim() && Number(amountText) > 0 && categoryId;

  const handleAdd = async () => {
    if (!canSubmit) return;
    await addRecurringRule({
      label: label.trim(),
      type,
      amount: Number(amountText),
      categoryId,
      note: note.trim(),
      frequency,
      dayOfMonth: frequency === 'monthly' ? dayOfMonth : undefined,
      weekday: frequency === 'weekly' ? weekday : undefined,
      startDate,
      enabled: true,
    });
    showToast({ message: `已新增規則「${label.trim()}」,下次開啟自動補上` });
    reset();
    setOpen(false);
  };

  return (
    <div className="card">
      <div className="card-title-row">
        <h2 className="card-title" style={{ marginBottom: 0 }}>重複交易規則</h2>
        <button
          type="button"
          className="settings-btn primary"
          onClick={() => setOpen((v) => !v)}
        >
          <Plus size={16} />
          <span>{open ? '收起' : '新增規則'}</span>
        </button>
      </div>
      <p className="muted" style={{ fontSize: '0.82rem', marginBottom: '0.75rem' }}>
        Netflix、房租、薪資、保險 — 設定後每月/每週自動補上對應日期的紀錄。
      </p>

      {open && (
        <div className="template-editor">
          <div className="template-editor-row">
            <input
              type="text"
              placeholder="規則名稱(例如:Netflix、房租)"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
            />
          </div>
          <div className="template-editor-row two-col">
            <div className="form-group type-toggle template-editor-toggle">
              <button
                type="button"
                className={`toggle-btn ${type === 'expense' ? 'expense-active' : ''}`}
                onClick={() => { setType('expense'); setCategoryId(''); }}
              >
                支出
              </button>
              <button
                type="button"
                className={`toggle-btn ${type === 'income' ? 'income-active' : ''}`}
                onClick={() => { setType('income'); setCategoryId(''); }}
              >
                收入
              </button>
            </div>
            <div className="input-with-icon">
              <span className="currency-symbol">$</span>
              <input
                type="number"
                inputMode="numeric"
                min="1"
                placeholder="金額"
                value={amountText}
                onChange={(e) => setAmountText(e.target.value)}
              />
            </div>
          </div>

          <div className="template-editor-row">
            <label className="template-editor-label">頻率</label>
            <div className="recurring-freq-row">
              <button
                type="button"
                className={`settings-btn ${frequency === 'monthly' ? 'primary' : ''}`}
                onClick={() => setFrequency('monthly')}
              >每月</button>
              <button
                type="button"
                className={`settings-btn ${frequency === 'weekly' ? 'primary' : ''}`}
                onClick={() => setFrequency('weekly')}
              >每週</button>
            </div>
          </div>

          {frequency === 'monthly' ? (
            <div className="template-editor-row">
              <label className="template-editor-label">每月第幾號(1-28)</label>
              <input
                type="number"
                inputMode="numeric"
                min="1"
                max="28"
                value={dayOfMonth}
                onChange={(e) => setDayOfMonth(Math.max(1, Math.min(28, Number(e.target.value) || 1)))}
              />
            </div>
          ) : (
            <div className="template-editor-row">
              <label className="template-editor-label">每週星期幾</label>
              <div className="recurring-weekday-row">
                {WEEKDAY_LABELS.map((lbl, i) => (
                  <button
                    key={i}
                    type="button"
                    className={`weekday-pill ${weekday === i ? 'active' : ''}`}
                    onClick={() => setWeekday(i)}
                  >{lbl}</button>
                ))}
              </div>
            </div>
          )}

          <div className="template-editor-row">
            <label className="template-editor-label">起算日</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>

          <div className="template-editor-row">
            <label className="template-editor-label">分類</label>
            <div className="category-grid template-editor-cat-grid">
              {list.map((cat) => (
                <button
                  type="button"
                  key={cat.id}
                  className={`category-tile ${categoryId === cat.id ? 'active' : ''}`}
                  onClick={() => setCategoryId(cat.id)}
                >
                  <CategoryIcon category={cat} size={36} className="category-tile-circle" />
                  <span className="category-tile-name">{cat.name}</span>
                </button>
              ))}
            </div>
          </div>
          <div className="template-editor-row">
            <input
              type="text"
              placeholder="備註(選填,沒填會用規則名稱)"
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </div>
          <div className="template-editor-actions">
            <button
              type="button"
              className="settings-btn primary"
              disabled={!canSubmit}
              onClick={handleAdd}
            >
              儲存規則
            </button>
            <button
              type="button"
              className="settings-btn"
              onClick={() => { reset(); setOpen(false); }}
            >
              取消
            </button>
          </div>
        </div>
      )}

      {recurringRules.length === 0 ? (
        <div className="empty-state"><p>還沒有規則,點上方「新增規則」開始。</p></div>
      ) : (
        <ul className="template-list">
          {recurringRules.map((r) => {
            const cat = getCategory(r.categoryId);
            const freqLabel = r.frequency === 'monthly'
              ? `每月 ${r.dayOfMonth ?? 1} 號`
              : `每週${WEEKDAY_LABELS[r.weekday ?? 1]}`;
            return (
              <li key={r.id} className="template-list-item">
                <CategoryIcon category={cat} size={32} />
                <div className="template-list-info">
                  <span className="template-list-label">
                    {r.label}
                    {!r.enabled && <span className="muted" style={{ fontSize: '0.78rem' }}> · 已停用</span>}
                  </span>
                  <span className="template-list-meta muted">
                    {r.type === 'expense' ? '支出' : '收入'} ${r.amount.toLocaleString()} · {freqLabel}
                  </span>
                </div>
                <button
                  type="button"
                  className={`settings-switch ${r.enabled ? 'on' : 'off'}`}
                  role="switch"
                  aria-checked={r.enabled}
                  title={r.enabled ? '停用' : '啟用'}
                  onClick={() => updateRecurringRule(r.id, { enabled: !r.enabled })}
                >
                  <span className="settings-switch-knob" />
                </button>
                <button
                  type="button"
                  className="delete-btn"
                  onClick={async () => {
                    await deleteRecurringRule(r.id);
                    showToast({ message: `已刪除規則「${r.label}」` });
                  }}
                  title="刪除"
                  aria-label={`刪除規則「${r.label}」`}
                >
                  <Trash2 size={14} />
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};

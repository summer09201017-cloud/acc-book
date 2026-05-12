import React, { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { useExpense } from '../context/ExpenseContext';
import { TransactionType } from '../db/schema';
import { CategoryIcon } from './CategoryIcon';

export const TemplateManagerCard: React.FC = () => {
  const {
    templates,
    expenseCategories,
    incomeCategories,
    getCategory,
    addTemplate,
    deleteTemplate,
    showToast,
  } = useExpense();
  const [open, setOpen] = useState(false);
  const [label, setLabel] = useState('');
  const [type, setType] = useState<TransactionType>('expense');
  const [amountText, setAmountText] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [note, setNote] = useState('');

  const list = type === 'expense' ? expenseCategories : incomeCategories;

  const reset = () => {
    setLabel('');
    setAmountText('');
    setNote('');
    setCategoryId('');
  };

  const canSubmit = label.trim() && Number(amountText) > 0 && categoryId;

  const handleAdd = async () => {
    if (!canSubmit) return;
    await addTemplate({
      label: label.trim(),
      type,
      amount: Number(amountText),
      categoryId,
      note: note.trim(),
    });
    showToast({ message: `已新增範本「${label.trim()}」` });
    reset();
    setOpen(false);
  };

  return (
    <div className="card">
      <div className="card-title-row">
        <h2 className="card-title" style={{ marginBottom: 0 }}>常用範本</h2>
        <button
          type="button"
          className="settings-btn primary"
          onClick={() => setOpen((v) => !v)}
        >
          <Plus size={16} />
          <span>{open ? '收起' : '新增範本'}</span>
        </button>
      </div>
      <p className="muted" style={{ fontSize: '0.82rem', marginBottom: '0.75rem' }}>
        建好常吃常買的組合(早餐 65、捷運 20、星巴克 130),記帳時點 chip 即可秒記。
      </p>

      {open && (
        <div className="template-editor">
          <div className="template-editor-row">
            <input
              type="text"
              placeholder="範本名稱(例如:早餐)"
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
              placeholder="備註(選填)"
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
              儲存範本
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

      {templates.length === 0 ? (
        <div className="empty-state"><p>還沒有範本,點上方「新增範本」開始。</p></div>
      ) : (
        <ul className="template-list">
          {templates.map((tmpl) => {
            const cat = getCategory(tmpl.categoryId);
            return (
              <li key={tmpl.id} className="template-list-item">
                <CategoryIcon category={cat} size={32} />
                <div className="template-list-info">
                  <span className="template-list-label">{tmpl.label}</span>
                  <span className="template-list-meta muted">
                    {tmpl.type === 'expense' ? '支出' : '收入'} ${tmpl.amount.toLocaleString()}
                    {tmpl.note ? ` · ${tmpl.note}` : ''}
                  </span>
                </div>
                <button
                  type="button"
                  className="delete-btn"
                  onClick={async () => {
                    await deleteTemplate(tmpl.id);
                    showToast({ message: `已刪除範本「${tmpl.label}」` });
                  }}
                  title="刪除"
                  aria-label={`刪除範本「${tmpl.label}」`}
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

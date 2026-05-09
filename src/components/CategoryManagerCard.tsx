import React, { useEffect, useMemo, useState } from 'react';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { useExpense } from '../context/ExpenseContext';
import { Category, TransactionType } from '../db/schema';
import { CATEGORY_COLOR_PALETTE } from '../db/defaultCategories';
import { CategoryIcon, ICON_NAMES } from './CategoryIcon';
import { Modal } from './Modal';

type Draft = {
  type: TransactionType;
  name: string;
  group: string;
  emoji: string;
  iconName?: string;
  bgColor: string;
};

const blankDraft = (type: TransactionType = 'expense'): Draft => ({
  type,
  name: '',
  group: '',
  emoji: '',
  iconName: undefined,
  bgColor: CATEGORY_COLOR_PALETTE[0],
});

export const CategoryManagerCard: React.FC = () => {
  const {
    expenseCategories,
    incomeCategories,
    addCategory,
    updateCategory,
    deleteCategory,
    showToast,
  } = useExpense();

  const [editing, setEditing] = useState<{ mode: 'add' | 'edit'; cat?: Category } | null>(null);

  return (
    <div className="card">
      <div className="card-title-row">
        <h2 className="card-title">分類管理</h2>
        <button
          type="button"
          className="settings-btn primary"
          onClick={() => setEditing({ mode: 'add' })}
        >
          <Plus size={16} />
          <span>新增類別</span>
        </button>
      </div>

      <p className="muted" style={{ marginBottom: '0.75rem' }}>
        預設類別不能刪除（避免歷史紀錄遺失），但可以改顏色與圖示。
        自訂類別刪除後，原本的紀錄會自動轉到「其他」。
      </p>

      <CategorySection
        title="支出"
        items={expenseCategories}
        onEdit={(cat) => setEditing({ mode: 'edit', cat })}
        onDelete={async (cat) => {
          const result = await deleteCategory(cat.id);
          if (result === null) return;
          showToast({
            message: result.reassigned > 0
              ? `已刪除「${cat.name}」，轉移 ${result.reassigned} 筆到其他`
              : `已刪除「${cat.name}」`,
          });
        }}
      />

      <CategorySection
        title="收入"
        items={incomeCategories}
        onEdit={(cat) => setEditing({ mode: 'edit', cat })}
        onDelete={async (cat) => {
          const result = await deleteCategory(cat.id);
          if (result === null) return;
          showToast({
            message: result.reassigned > 0
              ? `已刪除「${cat.name}」，轉移 ${result.reassigned} 筆到其他`
              : `已刪除「${cat.name}」`,
          });
        }}
      />

      <Modal
        open={editing !== null}
        onClose={() => setEditing(null)}
        title={editing?.mode === 'edit' ? '編輯分類' : '新增分類'}
      >
        {editing && (
          <CategoryEditor
            initial={editing.cat
              ? {
                  type: editing.cat.type,
                  name: editing.cat.name,
                  group: editing.cat.group,
                  emoji: editing.cat.emoji,
                  iconName: editing.cat.iconName,
                  bgColor: editing.cat.bgColor,
                }
              : blankDraft()}
            isBuiltin={editing.cat?.isBuiltin ?? false}
            mode={editing.mode}
            onCancel={() => setEditing(null)}
            onSave={async (draft) => {
              if (editing.mode === 'add') {
                await addCategory(draft);
                showToast({ message: `已新增「${draft.name}」` });
              } else if (editing.cat) {
                await updateCategory(editing.cat.id, draft);
                showToast({ message: `已更新「${draft.name}」` });
              }
              setEditing(null);
            }}
          />
        )}
      </Modal>
    </div>
  );
};

interface SectionProps {
  title: string;
  items: Category[];
  onEdit: (cat: Category) => void;
  onDelete: (cat: Category) => void;
}

const CategorySection: React.FC<SectionProps> = ({ title, items, onEdit, onDelete }) => (
  <div className="category-manager-section">
    <h3 className="category-manager-section-title">{title}</h3>
    <ul className="category-manager-list">
      {items.map((cat) => (
        <li key={cat.id} className="category-manager-item">
          <CategoryIcon category={cat} size={36} className="category-manager-icon" />
          <div className="category-manager-text">
            <span className="category-manager-name">{cat.name}</span>
            <span className="category-manager-group muted">{cat.group}</span>
          </div>
          <button
            type="button"
            className="icon-btn"
            onClick={() => onEdit(cat)}
            aria-label={`編輯「${cat.name}」`}
            title="編輯"
          >
            <Pencil size={16} />
          </button>
          {cat.isBuiltin ? (
            <span className="category-manager-builtin">預設</span>
          ) : (
            <button
              type="button"
              className="icon-btn icon-btn-danger"
              onClick={() => {
                if (window.confirm(`刪除「${cat.name}」？該分類下的紀錄會轉到「其他」。`)) {
                  onDelete(cat);
                }
              }}
              aria-label={`刪除「${cat.name}」`}
              title="刪除"
            >
              <Trash2 size={16} />
            </button>
          )}
        </li>
      ))}
    </ul>
  </div>
);

interface EditorProps {
  initial: Draft;
  isBuiltin: boolean;
  mode: 'add' | 'edit';
  onSave: (draft: Draft) => Promise<void>;
  onCancel: () => void;
}

const CategoryEditor: React.FC<EditorProps> = ({ initial, isBuiltin, mode, onSave, onCancel }) => {
  const [draft, setDraft] = useState<Draft>(initial);
  const [iconPickerOpen, setIconPickerOpen] = useState(false);

  // Re-seed when reopened on a different target.
  useEffect(() => {
    setDraft(initial);
    setIconPickerOpen(false);
  }, [initial.name, initial.type]);

  const previewCat = useMemo(
    () => ({ emoji: draft.emoji, iconName: draft.iconName, bgColor: draft.bgColor }),
    [draft.emoji, draft.iconName, draft.bgColor]
  );

  const canSubmit = draft.name.trim() !== '';

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    await onSave(draft);
  };

  return (
    <form onSubmit={submit} className="category-editor">
      <div className="category-editor-preview">
        <CategoryIcon category={previewCat} size={56} />
        <div>
          <div className="category-editor-preview-name">{draft.name || '未命名'}</div>
          <div className="muted" style={{ fontSize: '0.85rem' }}>
            {draft.type === 'expense' ? '支出' : '收入'} · {draft.group || '未分組'}
          </div>
        </div>
      </div>

      {mode === 'add' && (
        <div className="form-group type-toggle">
          <button
            type="button"
            className={`toggle-btn ${draft.type === 'expense' ? 'expense-active' : ''}`}
            onClick={() => setDraft((d) => ({ ...d, type: 'expense' }))}
          >
            支出
          </button>
          <button
            type="button"
            className={`toggle-btn ${draft.type === 'income' ? 'income-active' : ''}`}
            onClick={() => setDraft((d) => ({ ...d, type: 'income' }))}
          >
            收入
          </button>
        </div>
      )}

      <div className="form-group">
        <label>名稱</label>
        <input
          type="text"
          value={draft.name}
          onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
          placeholder="例如：訂閱、寵物、紅包"
          disabled={isBuiltin}
          required
        />
        {isBuiltin && (
          <div className="muted" style={{ fontSize: '0.8rem', marginTop: '0.25rem' }}>
            預設類別的名稱無法修改，但可以改外觀。
          </div>
        )}
      </div>

      <div className="form-group">
        <label>分組</label>
        <input
          type="text"
          value={draft.group}
          onChange={(e) => setDraft((d) => ({ ...d, group: e.target.value }))}
          placeholder="例如：日常、享樂、固定"
          disabled={isBuiltin}
        />
      </div>

      <div className="form-group">
        <label>顏色</label>
        <div className="color-palette">
          {CATEGORY_COLOR_PALETTE.map((c) => (
            <button
              key={c}
              type="button"
              className={`color-swatch ${draft.bgColor === c ? 'active' : ''}`}
              style={{ backgroundColor: c }}
              onClick={() => setDraft((d) => ({ ...d, bgColor: c }))}
              aria-label={`選擇顏色 ${c}`}
              aria-pressed={draft.bgColor === c}
            />
          ))}
        </div>
      </div>

      <div className="form-group">
        <label>圖示（優先用 Emoji，沒填時改用下方圖示）</label>
        <div className="emoji-row">
          <input
            type="text"
            value={draft.emoji}
            onChange={(e) => setDraft((d) => ({ ...d, emoji: e.target.value }))}
            placeholder="🍔"
            maxLength={4}
            className="emoji-input"
          />
          {draft.emoji && (
            <button
              type="button"
              className="settings-btn"
              onClick={() => setDraft((d) => ({ ...d, emoji: '' }))}
            >
              清除 Emoji
            </button>
          )}
          <button
            type="button"
            className="settings-btn"
            onClick={() => setIconPickerOpen((v) => !v)}
          >
            {iconPickerOpen ? '收合圖示' : '挑選圖示'}
          </button>
        </div>

        {iconPickerOpen && (
          <div className="icon-grid" role="listbox" aria-label="圖示">
            {ICON_NAMES.map((name) => {
              const selected = draft.iconName === name && !draft.emoji;
              return (
                <button
                  key={name}
                  type="button"
                  className={`icon-grid-item ${selected ? 'active' : ''}`}
                  onClick={() => setDraft((d) => ({ ...d, iconName: name }))}
                  aria-label={name}
                  aria-pressed={selected}
                >
                  <CategoryIcon
                    category={{ emoji: '', iconName: name, bgColor: draft.bgColor }}
                    size={32}
                  />
                </button>
              );
            })}
          </div>
        )}

        {draft.iconName && !draft.emoji && (
          <div className="muted" style={{ fontSize: '0.8rem', marginTop: '0.4rem' }}>
            目前使用圖示：{draft.iconName}
            <button
              type="button"
              className="link-btn"
              onClick={() => setDraft((d) => ({ ...d, iconName: undefined }))}
            >
              移除
            </button>
          </div>
        )}
      </div>

      <div className="settings-actions" style={{ justifyContent: 'flex-end' }}>
        <button type="button" className="settings-btn" onClick={onCancel}>
          取消
        </button>
        <button type="submit" className="settings-btn primary" disabled={!canSubmit}>
          {mode === 'add' ? '新增' : '儲存'}
        </button>
      </div>
    </form>
  );
};

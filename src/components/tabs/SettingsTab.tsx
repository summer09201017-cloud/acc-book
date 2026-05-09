import React, { useRef, useState } from 'react';
import { Download, Upload, Trash2, Moon, Sun } from 'lucide-react';
import { useExpense } from '../../context/ExpenseContext';
import { useTheme } from '../../hooks/useTheme';
import { buildExportPayload, downloadJson, importFromJson } from '../../utils/dataIO';
import { CategoryManagerCard } from '../CategoryManagerCard';

export const SettingsTab: React.FC = () => {
  const {
    expenseCategories,
    getBudget,
    setBudget,
    removeBudget,
    showToast,
  } = useExpense();
  const { theme, toggle: toggleTheme } = useTheme();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importing, setImporting] = useState(false);

  const handleExport = async () => {
    try {
      const payload = await buildExportPayload();
      const stamp = new Date().toISOString().replace(/[:T]/g, '-').slice(0, 16);
      downloadJson(`expense-tracker-${stamp}.json`, payload);
      showToast({ message: '已匯出資料' });
    } catch (e) {
      console.error(e);
      showToast({ message: '匯出失敗' });
    }
  };

  const handleImportClick = () => fileInputRef.current?.click();

  const handleImportChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    e.target.value = ''; // allow re-importing the same file later
    if (!f) return;
    setImporting(true);
    try {
      const summary = await importFromJson(f);
      showToast({
        message: `已匯入：紀錄 +${summary.txAdded}（重複略過 ${summary.txSkipped}）` +
          `／類別 +${summary.catAdded}／預算 ${summary.budgetsApplied}`,
      }, 6000);
    } catch (e) {
      console.error(e);
      showToast({ message: '匯入失敗：請確認檔案格式' });
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="tab-panel">
      <div className="card">
        <h2 className="card-title">外觀</h2>
        <div className="settings-actions">
          <button
            type="button"
            className="settings-btn"
            onClick={toggleTheme}
            aria-pressed={theme === 'dark'}
          >
            {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
            <span>{theme === 'dark' ? '切換淺色' : '切換深色'}</span>
          </button>
        </div>
      </div>

      <CategoryManagerCard />

      <div className="card">
        <h2 className="card-title">資料備份</h2>
        <p className="muted" style={{ marginBottom: '0.75rem' }}>
          將所有紀錄、分類、預算匯出成 JSON，或從備份檔還原。匯入採合併策略，相同 id 的紀錄會略過。
        </p>
        <div className="settings-actions">
          <button type="button" className="settings-btn primary" onClick={handleExport}>
            <Download size={16} />
            <span>匯出 JSON</span>
          </button>
          <button
            type="button"
            className="settings-btn"
            onClick={handleImportClick}
            disabled={importing}
          >
            <Upload size={16} />
            <span>{importing ? '匯入中…' : '匯入 JSON'}</span>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/json,.json"
            style={{ display: 'none' }}
            onChange={handleImportChange}
          />
        </div>
      </div>

      <div className="card">
        <h2 className="card-title">分類預算（每月）</h2>
        <p className="muted" style={{ marginBottom: '0.75rem' }}>
          設定後會出現在「今日」分頁，用進度條提醒已用比例。空白＝不設定預算。
        </p>
        <ul className="budget-edit-list">
          {expenseCategories.map((cat) => {
            const current = getBudget(cat.id);
            return (
              <BudgetEditRow
                key={cat.id}
                emoji={cat.emoji || '❓'}
                name={cat.name}
                bgColor={cat.bgColor}
                value={current?.monthlyLimit ?? null}
                onSave={async (v) => {
                  if (v === null) await removeBudget(cat.id);
                  else await setBudget(cat.id, v);
                  showToast({ message: v === null ? `已移除「${cat.name}」預算` : `已更新「${cat.name}」預算` });
                }}
              />
            );
          })}
        </ul>
      </div>
    </div>
  );
};

interface RowProps {
  emoji: string;
  name: string;
  bgColor: string;
  value: number | null;
  onSave: (v: number | null) => Promise<void>;
}

const BudgetEditRow: React.FC<RowProps> = ({ emoji, name, bgColor, value, onSave }) => {
  const [text, setText] = useState<string>(value !== null ? String(value) : '');

  const apply = async () => {
    const trimmed = text.trim();
    if (trimmed === '') {
      if (value !== null) await onSave(null);
      return;
    }
    const n = Number(trimmed);
    if (!Number.isFinite(n) || n < 0) return;
    if (n !== value) await onSave(n);
  };

  return (
    <li className="budget-edit-item">
      <span className="budget-edit-emoji" style={{ backgroundColor: bgColor }}>{emoji}</span>
      <span className="budget-edit-name">{name}</span>
      <div className="budget-edit-input">
        <span className="currency-symbol">$</span>
        <input
          type="number"
          inputMode="numeric"
          min="0"
          placeholder="未設定"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onBlur={apply}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              (e.target as HTMLInputElement).blur();
            }
          }}
        />
      </div>
      {value !== null && (
        <button
          type="button"
          className="icon-btn"
          onClick={async () => { setText(''); await onSave(null); }}
          title="移除預算"
          aria-label={`移除「${name}」預算`}
        >
          <Trash2 size={14} />
        </button>
      )}
    </li>
  );
};

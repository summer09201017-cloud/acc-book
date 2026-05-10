import React from 'react';
import { TabKey } from '../hooks/useActiveTab';

interface TabDef {
  key: TabKey;
  label: string;
  emoji: string;
}

const TABS: TabDef[] = [
  { key: 'today',    label: '今日', emoji: '📝' },
  { key: 'records',  label: '紀錄', emoji: '📋' },
  { key: 'charts',   label: '圖表', emoji: '📊' },
  { key: 'reports',  label: '報告', emoji: '📄' },
  { key: 'settings', label: '設定', emoji: '⚙️' },
];

interface Props {
  active: TabKey;
  onChange: (t: TabKey) => void;
}

export const TabBar: React.FC<Props> = ({ active, onChange }) => {
  return (
    <nav className="tab-bar" role="tablist" aria-label="主導覽">
      {TABS.map((t) => {
        const isActive = t.key === active;
        return (
          <button
            key={t.key}
            type="button"
            role="tab"
            aria-selected={isActive}
            className={`tab-bar-item ${isActive ? 'active' : ''}`}
            onClick={() => {
              if (!isActive && 'vibrate' in navigator) {
                try { navigator.vibrate(8); } catch { /* ignore */ }
              }
              onChange(t.key);
            }}
          >
            <span className="tab-bar-emoji" aria-hidden>{t.emoji}</span>
            <span className="tab-bar-label">{t.label}</span>
          </button>
        );
      })}
    </nav>
  );
};

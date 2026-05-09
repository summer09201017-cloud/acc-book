import React from 'react';
import { Plus } from 'lucide-react';

interface Props {
  onClick: () => void;
  label?: string;
}

export const Fab: React.FC<Props> = ({ onClick, label = '新增紀錄' }) => {
  return (
    <button
      type="button"
      className="fab"
      onClick={() => {
        if ('vibrate' in navigator) {
          try { navigator.vibrate(10); } catch { /* ignore */ }
        }
        onClick();
      }}
      aria-label={label}
    >
      <Plus size={24} />
    </button>
  );
};

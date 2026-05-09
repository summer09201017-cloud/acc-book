import React from 'react';
import { X } from 'lucide-react';
import { useExpense } from '../context/ExpenseContext';

export const Toast: React.FC = () => {
  const { toast, dismissToast } = useExpense();
  if (!toast) return null;

  return (
    <div className="toast" role="status" aria-live="polite">
      <span className="toast-message">{toast.message}</span>
      {toast.actionLabel && toast.onAction && (
        <button
          type="button"
          className="toast-action"
          onClick={() => toast.onAction!()}
        >
          {toast.actionLabel}
        </button>
      )}
      <button
        type="button"
        className="toast-close"
        onClick={dismissToast}
        aria-label="關閉提示"
      >
        <X size={16} />
      </button>
    </div>
  );
};

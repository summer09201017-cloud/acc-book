import React, { useEffect } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { RefreshCw, WifiOff, X } from 'lucide-react';

// Poll for a new service worker every 30 minutes while the app is open,
// so that a long-lived PWA tab eventually notices a deploy without a
// hard reload from the user.
const UPDATE_POLL_MS = 30 * 60 * 1000;

export const UpdatePrompt: React.FC = () => {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    offlineReady: [offlineReady, setOfflineReady],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(_swUrl, registration) {
      if (!registration) return;
      // Periodically ask the browser to re-fetch the SW script so we pick
      // up deploys without requiring the user to close every tab.
      const id = window.setInterval(() => {
        registration.update().catch(() => { /* offline / not yet ready */ });
      }, UPDATE_POLL_MS);
      // Also check once shortly after mount in case a deploy happened
      // between the user's last visit and now.
      const initial = window.setTimeout(() => {
        registration.update().catch(() => {});
      }, 10_000);
      return () => {
        window.clearInterval(id);
        window.clearTimeout(initial);
      };
    },
    onRegisterError(error) {
      console.warn('[pwa] SW registration failed', error);
    },
  });

  // Auto-dismiss the "offline ready" toast after a few seconds — it's
  // purely informational and the user doesn't need to click anything.
  useEffect(() => {
    if (!offlineReady) return;
    const t = window.setTimeout(() => setOfflineReady(false), 5000);
    return () => window.clearTimeout(t);
  }, [offlineReady, setOfflineReady]);

  if (!needRefresh && !offlineReady) return null;

  if (needRefresh) {
    return (
      <div className="update-prompt" role="status" aria-live="polite">
        <div className="update-prompt-body">
          <RefreshCw size={18} className="update-prompt-icon" />
          <div className="update-prompt-text">
            <strong>有新版本</strong>
            <span className="muted">點「立即更新」載入最新功能</span>
          </div>
        </div>
        <div className="update-prompt-actions">
          <button
            type="button"
            className="update-prompt-btn primary"
            onClick={() => updateServiceWorker(true)}
          >
            立即更新
          </button>
          <button
            type="button"
            className="update-prompt-btn"
            onClick={() => setNeedRefresh(false)}
            aria-label="稍後再說"
          >
            <X size={16} />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="update-prompt offline" role="status" aria-live="polite">
      <div className="update-prompt-body">
        <WifiOff size={18} className="update-prompt-icon" />
        <div className="update-prompt-text">
          <strong>已可離線使用</strong>
          <span className="muted">沒網路也記得到帳</span>
        </div>
      </div>
    </div>
  );
};

import React, { useEffect } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { RefreshCw, WifiOff, X } from 'lucide-react';

// Mobile clients usually re-open the PWA from the home screen rather than
// keeping a long-lived tab open, so we poll often while the page is visible
// AND every time the page regains the foreground.
const UPDATE_POLL_MS = 5 * 60 * 1000;

export const UpdatePrompt: React.FC = () => {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    offlineReady: [offlineReady, setOfflineReady],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(_swUrl, registration) {
      if (!registration) return;
      const check = () => registration.update().catch(() => { /* offline / not ready */ });
      // 2-second initial poke covers "user just opened the PWA after a deploy".
      const initial = window.setTimeout(check, 2_000);
      const interval = window.setInterval(check, UPDATE_POLL_MS);
      // Mobile users swipe between apps — re-check whenever the page comes
      // back to the foreground so an old install gets a chance to refresh
      // without waiting for the periodic interval.
      const onForeground = () => {
        if (document.visibilityState === 'visible') check();
      };
      document.addEventListener('visibilitychange', onForeground);
      window.addEventListener('focus', onForeground);
      window.addEventListener('pageshow', onForeground);
      return () => {
        window.clearTimeout(initial);
        window.clearInterval(interval);
        document.removeEventListener('visibilitychange', onForeground);
        window.removeEventListener('focus', onForeground);
        window.removeEventListener('pageshow', onForeground);
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

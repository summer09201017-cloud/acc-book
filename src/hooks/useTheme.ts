import { useEffect, useState } from 'react';

export type Theme = 'light' | 'dark';

const LS_KEY = 'expense-theme';

const isTheme = (v: unknown): v is Theme => v === 'light' || v === 'dark';

const readInitial = (): Theme => {
  try {
    const saved = localStorage.getItem(LS_KEY);
    if (isTheme(saved)) return saved;
  } catch {
    // ignore storage errors
  }
  return 'light';
};

const apply = (t: Theme) => {
  // Reflected on <html> so CSS in [data-theme="dark"] picks it up. Inline script in
  // index.html applies the same value before paint to avoid a light flash on reload.
  document.documentElement.setAttribute('data-theme', t);
  
  const metaTheme = document.querySelector('meta[name="theme-color"]');
  if (metaTheme) {
    if (t === 'dark') {
      metaTheme.setAttribute('content', '#0b1220');
    } else {
      // Revert to the primary color in light mode. We can read it from the CSS var
      // that useSettings maintains, falling back to default blue if not set yet.
      const primary = getComputedStyle(document.documentElement).getPropertyValue('--primary').trim() || '#3b82f6';
      metaTheme.setAttribute('content', primary);
    }
  }
};

export function useTheme(): { theme: Theme; setTheme: (t: Theme) => void; toggle: () => void } {
  const [theme, setThemeState] = useState<Theme>(readInitial);

  useEffect(() => {
    apply(theme);
    try { localStorage.setItem(LS_KEY, theme); } catch { /* ignore */ }
  }, [theme]);

  const setTheme = (t: Theme) => setThemeState(t);
  const toggle = () => setThemeState((t) => (t === 'light' ? 'dark' : 'light'));

  return { theme, setTheme, toggle };
}

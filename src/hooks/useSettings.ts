import { useEffect, useState } from 'react';

export interface AppSettings {
  haptic: boolean;
  nightlyReminder: boolean;   // shows a Notification at 23:30 if no record today
  accentColor: AccentKey;     // primary theme color key
}

export type AccentKey = 'blue' | 'green' | 'purple' | 'orange' | 'pink' | 'red';

export const ACCENT_PALETTE: Record<AccentKey, { label: string; primary: string; primaryHover: string }> = {
  blue:   { label: '海洋藍', primary: '#3b82f6', primaryHover: '#2563eb' },
  green:  { label: '森林綠', primary: '#10b981', primaryHover: '#059669' },
  purple: { label: '夢幻紫', primary: '#8b5cf6', primaryHover: '#7c3aed' },
  orange: { label: '日落橘', primary: '#f97316', primaryHover: '#ea580c' },
  pink:   { label: '甜心粉', primary: '#ec4899', primaryHover: '#db2777' },
  red:    { label: '熱情紅', primary: '#ef4444', primaryHover: '#dc2626' },
};

const LS_KEY = 'expense-settings';
const DEFAULTS: AppSettings = {
  haptic: true,
  nightlyReminder: false,
  accentColor: 'blue',
};

const isAccent = (v: unknown): v is AccentKey =>
  typeof v === 'string' && v in ACCENT_PALETTE;

const read = (): AppSettings => {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return DEFAULTS;
    const parsed = JSON.parse(raw);
    return {
      haptic: typeof parsed.haptic === 'boolean' ? parsed.haptic : DEFAULTS.haptic,
      nightlyReminder: typeof parsed.nightlyReminder === 'boolean' ? parsed.nightlyReminder : DEFAULTS.nightlyReminder,
      accentColor: isAccent(parsed.accentColor) ? parsed.accentColor : DEFAULTS.accentColor,
    };
  } catch {
    return DEFAULTS;
  }
};

const applyAccent = (key: AccentKey) => {
  const c = ACCENT_PALETTE[key];
  document.documentElement.style.setProperty('--primary', c.primary);
  document.documentElement.style.setProperty('--primary-hover', c.primaryHover);
  document.documentElement.setAttribute('data-accent', key);
};

// Module-level subscribers so multiple components stay in sync.
type Listener = (s: AppSettings) => void;
const listeners = new Set<Listener>();
let current: AppSettings = read();
applyAccent(current.accentColor);

const persist = (next: AppSettings) => {
  current = next;
  try { localStorage.setItem(LS_KEY, JSON.stringify(next)); } catch { /* ignore */ }
  listeners.forEach((fn) => fn(next));
};

export function useSettings() {
  const [settings, setLocal] = useState<AppSettings>(current);

  useEffect(() => {
    const fn = (s: AppSettings) => setLocal(s);
    listeners.add(fn);
    return () => { listeners.delete(fn); };
  }, []);

  const update = (patch: Partial<AppSettings>) => {
    const next = { ...current, ...patch };
    if (patch.accentColor && patch.accentColor !== current.accentColor) {
      applyAccent(patch.accentColor);
    }
    persist(next);
  };

  return { settings, update };
}

// Side-effect helper for non-component code (e.g. context).
export const triggerHaptic = (ms = 10) => {
  if (!current.haptic) return;
  if ('vibrate' in navigator) {
    try { navigator.vibrate(ms); } catch { /* ignore */ }
  }
};

export const getCurrentSettings = () => current;

import { useEffect, useState } from 'react';

export interface AppSettings {
  haptic: boolean;
  nightlyReminder: boolean;   // shows a Notification at 23:30 if no record today
  accentColor: AccentKey;     // primary theme color key (or 'custom' for free hex)
  accentCustomHex: string;    // hex used when accentColor === 'custom'
}

export type PresetAccent =
  | 'blue' | 'green' | 'purple' | 'orange' | 'pink' | 'red'
  | 'cyan' | 'teal' | 'indigo' | 'yellow' | 'gold';
export type AccentKey = PresetAccent | 'custom';

export const ACCENT_PALETTE: Record<PresetAccent, { label: string; primary: string; primaryHover: string }> = {
  blue:   { label: '海洋藍', primary: '#3b82f6', primaryHover: '#2563eb' },
  green:  { label: '森林綠', primary: '#10b981', primaryHover: '#059669' },
  purple: { label: '夢幻紫', primary: '#8b5cf6', primaryHover: '#7c3aed' },
  orange: { label: '日落橘', primary: '#f97316', primaryHover: '#ea580c' },
  pink:   { label: '甜心粉', primary: '#ec4899', primaryHover: '#db2777' },
  red:    { label: '熱情紅', primary: '#ef4444', primaryHover: '#dc2626' },
  cyan:   { label: '湖水青', primary: '#06b6d4', primaryHover: '#0891b2' },
  teal:   { label: '薄荷綠', primary: '#14b8a6', primaryHover: '#0d9488' },
  indigo: { label: '深空藍', primary: '#6366f1', primaryHover: '#4f46e5' },
  yellow: { label: '金黃黃', primary: '#eab308', primaryHover: '#ca8a04' },
  gold:   { label: '榮耀燙金', primary: '#d97706', primaryHover: '#b45309' },
};

const LS_KEY = 'expense-settings';
const DEFAULTS: AppSettings = {
  haptic: true,
  nightlyReminder: false,
  accentColor: 'blue',
  accentCustomHex: '#3b82f6',
};

const isPreset = (v: unknown): v is PresetAccent =>
  typeof v === 'string' && v in ACCENT_PALETTE;
const isAccent = (v: unknown): v is AccentKey =>
  isPreset(v) || v === 'custom';
const isHex = (v: unknown): v is string =>
  typeof v === 'string' && /^#[0-9a-fA-F]{6}$/.test(v);

// Darken a #rrggbb hex by ~12% to produce a hover variant for custom colours.
// Preset hovers come from the curated palette above and skip this helper.
export const darkenHex = (hex: string): string => {
  const h = hex.replace('#', '');
  if (h.length !== 6) return hex;
  const channels = [0, 2, 4].map((i) => {
    const n = Math.max(0, parseInt(h.slice(i, i + 2), 16) - 28);
    return n.toString(16).padStart(2, '0');
  });
  return `#${channels.join('')}`;
};

const read = (): AppSettings => {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return DEFAULTS;
    const parsed = JSON.parse(raw);
    return {
      haptic: typeof parsed.haptic === 'boolean' ? parsed.haptic : DEFAULTS.haptic,
      nightlyReminder: typeof parsed.nightlyReminder === 'boolean' ? parsed.nightlyReminder : DEFAULTS.nightlyReminder,
      accentColor: isAccent(parsed.accentColor) ? parsed.accentColor : DEFAULTS.accentColor,
      accentCustomHex: isHex(parsed.accentCustomHex) ? parsed.accentCustomHex : DEFAULTS.accentCustomHex,
    };
  } catch {
    return DEFAULTS;
  }
};

const applyAccent = (key: AccentKey, customHex: string) => {
  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  let primaryColor = '#3b82f6';

  if (key === 'custom') {
    const safeHex = isHex(customHex) ? customHex : DEFAULTS.accentCustomHex;
    primaryColor = safeHex;
    document.documentElement.style.setProperty('--primary', safeHex);
    document.documentElement.style.setProperty('--primary-hover', darkenHex(safeHex));
  } else {
    const c = ACCENT_PALETTE[key];
    primaryColor = c.primary;
    document.documentElement.style.setProperty('--primary', c.primary);
    document.documentElement.style.setProperty('--primary-hover', c.primaryHover);
  }
  document.documentElement.setAttribute('data-accent', key);

  const metaTheme = document.querySelector('meta[name="theme-color"]');
  if (metaTheme) {
    metaTheme.setAttribute('content', isDark ? '#0b1220' : primaryColor);
  }
};

// Module-level subscribers so multiple components stay in sync.
type Listener = (s: AppSettings) => void;
const listeners = new Set<Listener>();
let current: AppSettings = read();
applyAccent(current.accentColor, current.accentCustomHex);

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
    const accentChanged = patch.accentColor !== undefined && patch.accentColor !== current.accentColor;
    const customChanged = patch.accentCustomHex !== undefined && patch.accentCustomHex !== current.accentCustomHex;
    if (accentChanged || (next.accentColor === 'custom' && customChanged)) {
      applyAccent(next.accentColor, next.accentCustomHex);
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

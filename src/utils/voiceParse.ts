// Best-effort parse of Chinese speech text into { amount, note }.
// Strategy:
//   1. Convert Chinese digit strings ("九十五", "兩百三十") to arabic numbers.
//   2. Find a trailing number in the text. The number is the amount.
//   3. Whatever sits before (and any trailing CJK suffix like "元" stripped) is the note.
// This is intentionally lightweight — not a real grammar.

const CN_DIGITS: Record<string, number> = {
  '零': 0, '〇': 0,
  '一': 1, '二': 2, '兩': 2, '两': 2, '三': 3, '四': 4, '五': 5,
  '六': 6, '七': 7, '八': 8, '九': 9,
};

const CN_UNITS: Record<string, number> = {
  '十': 10, '百': 100, '千': 1000, '萬': 10_000, '万': 10_000,
};

// Convert a pure CJK numeral substring (e.g. "兩百三十五") to an integer.
// Returns null if the substring isn't a clean numeral.
function cjkToInt(s: string): number | null {
  if (!s) return null;
  // Accept short pure-arabic strings as a passthrough.
  if (/^\d+$/.test(s)) return Number(s);

  let total = 0;
  let section = 0;
  let current = 0;

  for (const ch of s) {
    if (ch in CN_DIGITS) {
      current = CN_DIGITS[ch];
      continue;
    }
    if (ch in CN_UNITS) {
      const unit = CN_UNITS[ch];
      if (unit === 10_000) {
        section = (section + (current || 0)) * unit;
        total += section;
        section = 0;
      } else {
        // "十" alone means 10. "二十" = 20.
        if (current === 0 && unit === 10) current = 1;
        section += current * unit;
      }
      current = 0;
      continue;
    }
    return null;
  }
  return total + section + current;
}

// Replace each CJK number cluster in the text with its arabic value.
function normalizeNumbers(text: string): string {
  return text.replace(/[零〇一二三四五六七八九十百千萬两兩万]+/g, (frag) => {
    const v = cjkToInt(frag);
    return v == null ? frag : String(v);
  });
}

export interface VoiceParseResult {
  amount: number | null;
  note: string;
  raw: string;
}

const TRAILING_NOISE = /[元塊圓角分,，。\.\s]+$/;
const LEADING_NOISE = /^[，,。\.\s]+/;

export function parseVoiceCommand(raw: string): VoiceParseResult {
  if (!raw) return { amount: null, note: '', raw };
  const normalized = normalizeNumbers(raw.trim());
  // Take the last numeric run as the amount.
  const matches = [...normalized.matchAll(/\d+(?:\.\d+)?/g)];
  if (matches.length === 0) return { amount: null, note: raw.trim(), raw };
  const last = matches[matches.length - 1];
  const amount = Number(last[0]);
  const before = normalized.slice(0, last.index ?? 0);
  const after = normalized.slice((last.index ?? 0) + last[0].length);
  const note = (before + after)
    .replace(TRAILING_NOISE, '')
    .replace(LEADING_NOISE, '')
    .trim();
  return { amount: Number.isFinite(amount) ? amount : null, note, raw };
}

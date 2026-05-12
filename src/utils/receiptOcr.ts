// Receipt OCR: lazy-loads tesseract.js, runs recognition against a user-picked
// image, and parses the text into best-guess amount / date / merchant.
//
// The Tesseract WASM + chi_tra language pack is ~12 MB on first use; we report
// progress so the UI can warn the user. Subsequent scans hit the cache.

import { pad2 } from './dateRange';

export interface OcrProgress {
  status: string;     // tesseract's stage label e.g. "loading language traineddata"
  progress: number;   // 0..1
}

export interface OcrResult {
  rawText: string;
  amount: number | null;
  amountCandidates: number[];   // ranked best-first, deduped
  date: string | null;          // YYYY-MM-DD
  merchant: string;             // best-guess first line, trimmed
}

// The gap allowance is generous because Tesseract often inserts spaces between
// keyword + currency symbol + value (e.g. "總計    $ 205").
const TOTAL_KEYWORD = /(?:總計|合計|總額|小計|金額|應付|實付|現金|消費|結帳金額|交易金額|共計|TOTAL|Total|total|AMOUNT|Amount)[^\d\n]{0,12}(\d{1,3}(?:[,，]\d{3})*(?:\.\d{1,2})?|\d{2,6}(?:\.\d{1,2})?)/g;

const PLAIN_NUMBER = /(\d{1,3}(?:[,，]\d{3})+(?:\.\d{1,2})?|\d{2,6}(?:\.\d{1,2})?)/g;

// Most paper receipts top out well under this; values above this are almost
// always transaction IDs, barcodes, or invoice numbers misread as amounts.
const REASONABLE_MAX = 200_000;

const normalizeNumber = (raw: string): number => Number(raw.replace(/[,，]/g, ''));

const dedupe = (nums: number[]): number[] => {
  const seen = new Set<number>();
  const out: number[] = [];
  for (const n of nums) {
    if (!Number.isFinite(n)) continue;
    if (seen.has(n)) continue;
    seen.add(n);
    out.push(n);
  }
  return out;
};

const guessDate = (text: string): string | null => {
  // AD: 2024/03/15 or 2024-03-15 or 2024.03.15
  const ad = text.match(/(20\d{2})[-/.](\d{1,2})[-/.](\d{1,2})/);
  if (ad) {
    const y = Number(ad[1]); const m = Number(ad[2]); const d = Number(ad[3]);
    if (m >= 1 && m <= 12 && d >= 1 && d <= 31) return `${y}-${pad2(m)}-${pad2(d)}`;
  }
  // 民國 (ROC) 1XX/MM/DD — common on Taiwanese receipts. Roughly 80-130 covers
  // 1991-2041 which spans any realistic receipt date.
  const roc = text.match(/(?:民國)?\s*(\d{2,3})[-/.](\d{1,2})[-/.](\d{1,2})/);
  if (roc) {
    const rocY = Number(roc[1]); const m = Number(roc[2]); const d = Number(roc[3]);
    if (rocY >= 80 && rocY <= 130 && m >= 1 && m <= 12 && d >= 1 && d <= 31) {
      return `${rocY + 1911}-${pad2(m)}-${pad2(d)}`;
    }
  }
  return null;
};

const guessMerchant = (text: string): string => {
  const lines = text.split(/\r?\n/);
  for (const raw of lines) {
    const line = raw.trim();
    if (!line) continue;
    // Skip lines that are mostly digits/punct (likely a receipt no. / phone / amount).
    const cjkOrAlpha = (line.match(/[A-Za-z一-鿿]/g) ?? []).length;
    if (cjkOrAlpha < 2) continue;
    if (/^\d/.test(line) && cjkOrAlpha < 4) continue;
    return line.slice(0, 40);
  }
  return '';
};

export function parseReceiptText(text: string): OcrResult {
  const rawText = text.trim();
  // Strip the recognised date so its components (year/month/day) don't pollute
  // the amount candidates with values like 2025 / 01 / 15.
  const dateMatch = rawText.match(/(20\d{2}[-/.]\d{1,2}[-/.]\d{1,2})|((?:民國)?\s*\d{2,3}[-/.]\d{1,2}[-/.]\d{1,2})/);
  const numericText = dateMatch ? rawText.replace(dateMatch[0], ' ') : rawText;
  // Also drop HH:MM time tokens (14:30) which OCR reads as standalone digits.
  const cleaned = numericText.replace(/\d{1,2}:\d{2}/g, ' ');

  // 1. Numbers near total-like keywords are strongest candidates.
  const totalNums = [...cleaned.matchAll(TOTAL_KEYWORD)]
    .map((m) => normalizeNumber(m[1]))
    .filter((n) => n > 0 && n <= REASONABLE_MAX);
  // 2. Fall back to all plausible numbers, sorted descending — receipts usually
  //    print the grand total as the largest non-id figure.
  const allNums = [...cleaned.matchAll(PLAIN_NUMBER)]
    .map((m) => normalizeNumber(m[1]))
    .filter((n) => n > 0 && n <= REASONABLE_MAX);

  const candidates = dedupe([...totalNums, ...allNums.slice().sort((a, b) => b - a)]);
  const amount = candidates[0] ?? null;

  return {
    rawText,
    amount,
    amountCandidates: candidates.slice(0, 6),
    date: guessDate(rawText),
    merchant: guessMerchant(rawText),
  };
}

export async function recognizeReceipt(
  file: Blob,
  onProgress?: (p: OcrProgress) => void
): Promise<OcrResult> {
  // Dynamic import so tesseract.js + WASM + traineddata only download when the
  // user actually scans a receipt — keeps initial PWA bundle small.
  const { createWorker } = await import('tesseract.js');
  const worker = await createWorker('chi_tra+eng', undefined, {
    logger: (m: { status?: string; progress?: number }) =>
      onProgress?.({ status: m.status ?? '', progress: m.progress ?? 0 }),
  });
  try {
    const { data } = await worker.recognize(file);
    return parseReceiptText(data.text);
  } finally {
    await worker.terminate();
  }
}

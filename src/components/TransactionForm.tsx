import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Camera, Mic, MicOff, PlusCircle, Save } from 'lucide-react';
import { useExpense } from '../context/ExpenseContext';
import { Transaction, TransactionType } from '../db/schema';
import { evaluateExpression } from '../utils/expression';
import { triggerHaptic } from '../hooks/useSettings';
import { parseVoiceCommand } from '../utils/voiceParse';
import { recognizeReceipt } from '../utils/receiptOcr';
import { CategoryIcon } from './CategoryIcon';

// Web Speech API isn't in lib.dom in this TS version; minimal local typing.
interface SpeechRecognitionResultEvent {
  results: ArrayLike<{ 0: { transcript: string }; isFinal: boolean; length: number }>;
}
interface SpeechRecognitionInstance {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: (e: SpeechRecognitionResultEvent) => void;
  onerror: (e: { error?: string }) => void;
  onend: () => void;
  start: () => void;
  stop: () => void;
}
type SpeechRecognitionCtor = new () => SpeechRecognitionInstance;

const getSpeechRecognition = (): SpeechRecognitionCtor | null => {
  if (typeof window === 'undefined') return null;
  const w = window as unknown as { SpeechRecognition?: SpeechRecognitionCtor; webkitSpeechRecognition?: SpeechRecognitionCtor };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
};

interface Props {
  onSubmitted?: () => void;
  editing?: Transaction | null;
}

const todayStr = () => new Date().toISOString().split('T')[0];

const QUICK_AMOUNTS = [50, 100, 500, 1000];

export const TransactionForm: React.FC<Props> = ({ onSubmitted, editing }) => {
  const { transactions, upsertTransaction, expenseCategories, incomeCategories, templates } = useExpense();

  const [type, setType] = useState<TransactionType>(editing?.type ?? 'expense');
  const [amountText, setAmountText] = useState<string>(editing ? String(editing.amount) : '');
  const [categoryId, setCategoryId] = useState<string>(editing?.categoryId ?? '');
  const [date, setDate] = useState(editing?.date ?? todayStr());
  const [note, setNote] = useState(editing?.note ?? '');

  // Re-seed when the edit target changes (modal reopened on a different row).
  useEffect(() => {
    if (!editing) return;
    setType(editing.type);
    setAmountText(String(editing.amount));
    setCategoryId(editing.categoryId);
    setDate(editing.date);
    setNote(editing.note);
  }, [editing?.id]);

  const currentCategories = type === 'expense' ? expenseCategories : incomeCategories;

  useEffect(() => {
    if (currentCategories.length === 0) return;
    if (!currentCategories.some((c) => c.id === categoryId)) {
      setCategoryId(currentCategories[0].id);
    }
  }, [type, currentCategories, categoryId]);

  const evalResult = useMemo(() => evaluateExpression(amountText), [amountText]);
  const previewValue = evalResult.ok ? Math.round(evalResult.value * 100) / 100 : null;

  const SpeechRecognitionCtor = useMemo(() => getSpeechRecognition(), []);
  const voiceSupported = SpeechRecognitionCtor !== null;
  const [listening, setListening] = useState(false);
  const [voiceHint, setVoiceHint] = useState<string>('');
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);

  // Receipt OCR state. `ocrCandidates` lets the user pick the right number
  // when the heuristic guesses wrong (e.g. line item vs. grand total).
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [ocrBusy, setOcrBusy] = useState(false);
  const [ocrProgress, setOcrProgress] = useState(0);
  const [ocrStatus, setOcrStatus] = useState<string>('');
  const [ocrError, setOcrError] = useState<string>('');
  const [ocrCandidates, setOcrCandidates] = useState<number[]>([]);

  useEffect(() => () => {
    try { recognitionRef.current?.stop(); } catch { /* ignore */ }
  }, []);

  const handleVoice = () => {
    if (!SpeechRecognitionCtor) return;
    if (listening) {
      try { recognitionRef.current?.stop(); } catch { /* ignore */ }
      return;
    }
    try {
      const rec = new SpeechRecognitionCtor();
      rec.lang = 'zh-TW';
      rec.continuous = false;
      rec.interimResults = false;
      rec.onresult = (e) => {
        const transcript = e.results[0]?.[0]?.transcript ?? '';
        const parsed = parseVoiceCommand(transcript);
        if (parsed.amount !== null) {
          setAmountText(String(parsed.amount));
        }
        if (parsed.note) {
          setNote((curr) => (curr ? `${curr} ${parsed.note}` : parsed.note));
        }
        setVoiceHint(`聽到:「${transcript}」`);
      };
      rec.onerror = (e) => {
        setVoiceHint(`語音辨識失敗${e.error ? `(${e.error})` : ''}`);
      };
      rec.onend = () => {
        setListening(false);
        recognitionRef.current = null;
      };
      recognitionRef.current = rec;
      rec.start();
      setListening(true);
      setVoiceHint('聆聽中… 試試「早餐九十五」「咖啡 120」');
    } catch {
      setVoiceHint('無法啟動語音辨識');
    }
  };

  const handleReceiptPick = () => {
    if (ocrBusy) return;
    setOcrError('');
    fileInputRef.current?.click();
  };

  const handleReceiptChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    // Allow re-selecting the same image later without remounting the input.
    e.target.value = '';
    if (!file) return;
    setOcrBusy(true);
    setOcrProgress(0);
    setOcrStatus('準備辨識引擎…');
    setOcrError('');
    setOcrCandidates([]);
    try {
      const result = await recognizeReceipt(file, ({ status, progress }) => {
        setOcrProgress(progress);
        // Tesseract emits English status labels; surface a friendlier
        // Traditional Chinese hint so the user knows what's happening.
        if (status.includes('loading')) setOcrStatus('下載辨識引擎(首次約 10MB)…');
        else if (status.includes('initializ')) setOcrStatus('初始化中…');
        else if (status.includes('recognizing')) setOcrStatus('辨識中…');
        else if (status) setOcrStatus(status);
      });
      if (result.amount !== null) setAmountText(String(result.amount));
      if (result.date) setDate(result.date);
      if (result.merchant) {
        setNote((curr) => (curr ? curr : result.merchant));
      }
      setOcrCandidates(result.amountCandidates);
      if (result.amount === null) {
        setOcrError('沒辨識出金額,試試把收據拍得更清楚');
      }
    } catch (err) {
      console.error('[ocr] failed', err);
      setOcrError('辨識失敗,請重試或手動輸入');
    } finally {
      setOcrBusy(false);
      setOcrStatus('');
      setOcrProgress(0);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!evalResult.ok || previewValue === null || previewValue <= 0 || !categoryId) return;

    await upsertTransaction(
      {
        type,
        amount: previewValue,
        categoryId,
        date,
        note: note.trim(),
      },
      editing?.id
    );

    triggerHaptic(editing ? 6 : 12);

    if (!editing) {
      setAmountText('');
      setNote('');
    }
    onSubmitted?.();
  };

  const applyQuickAmount = (n: number) => {
    // Tap to set; if the field already holds a plain integer, treat tapping as
    // additive (so 100 → tap 50 = 150) for fast multi-tap entry.
    if (/^\d+$/.test(amountText.trim())) {
      const next = Number(amountText) + n;
      setAmountText(String(next));
    } else {
      setAmountText(String(n));
    }
  };

  const isEdit = Boolean(editing);

  return (
    <div className="card form-card">
      <h2 className="card-title">{isEdit ? '編輯紀錄' : '新增紀錄'}</h2>

      {!isEdit && templates.length > 0 && (
        <div className="template-chip-row" role="group" aria-label="常用範本">
          {templates.map((tmpl) => (
            <button
              key={tmpl.id}
              type="button"
              className="template-chip"
              onClick={() => {
                setType(tmpl.type);
                setAmountText(String(tmpl.amount));
                setCategoryId(tmpl.categoryId);
                setNote(tmpl.note);
              }}
              title={`${tmpl.label} — $${tmpl.amount}`}
            >
              <span className="template-chip-label">{tmpl.label}</span>
              <span className="template-chip-amount">${tmpl.amount.toLocaleString()}</span>
            </button>
          ))}
        </div>
      )}

      <form onSubmit={handleSubmit} className="transaction-form">

        <div className="form-group type-toggle">
          <button
            type="button"
            className={`toggle-btn ${type === 'expense' ? 'expense-active' : ''}`}
            onClick={() => setType('expense')}
          >
            支出
          </button>
          <button
            type="button"
            className={`toggle-btn ${type === 'income' ? 'income-active' : ''}`}
            onClick={() => setType('income')}
          >
            收入
          </button>
        </div>

        <div className="form-row">
          <div className="form-group flex-1">
            <label>金額（可輸入算式：120+80*2）</label>
            <div className="input-with-icon">
              <span className="currency-symbol">$</span>
              <input
                type="text"
                inputMode="decimal"
                value={amountText}
                onChange={(e) => setAmountText(e.target.value)}
                placeholder="0 或 120+80*2"
                required
                aria-invalid={amountText !== '' && !evalResult.ok}
              />
            </div>
            {evalResult.isExpression && (
              <div className={`amount-preview ${evalResult.ok ? '' : 'error'}`}>
                {evalResult.ok
                  ? `= $${previewValue!.toLocaleString()}`
                  : '算式無效'}
              </div>
            )}
            <div className="quick-amount-row" role="group" aria-label="常用金額">
              {QUICK_AMOUNTS.map((n) => (
                <button
                  key={n}
                  type="button"
                  className="quick-amount-btn"
                  onClick={() => applyQuickAmount(n)}
                >
                  +{n}
                </button>
              ))}
              {amountText && (
                <button
                  type="button"
                  className="quick-amount-btn quick-amount-clear"
                  onClick={() => setAmountText('')}
                >
                  清除
                </button>
              )}
            </div>
            {/* Voice + receipt OCR live on their own row so they remain
                visible on narrow phones (the chip row above was wrapping them
                below the fold inside the cramped amount column). */}
            <div className="input-action-row" role="group" aria-label="輔助輸入">
              {voiceSupported && (
                <button
                  type="button"
                  className={`input-action-btn ${listening ? 'active' : ''}`}
                  onClick={handleVoice}
                  aria-pressed={listening}
                  title={listening ? '停止聆聽' : '語音輸入(中文)'}
                >
                  {listening ? <MicOff size={16} /> : <Mic size={16} />}
                  <span>{listening ? '停止聆聽' : '🎤 語音記帳'}</span>
                </button>
              )}
              <button
                type="button"
                className={`input-action-btn ${ocrBusy ? 'active' : ''}`}
                onClick={handleReceiptPick}
                disabled={ocrBusy}
                title="拍/選收據自動辨識金額"
              >
                <Camera size={16} />
                <span>{ocrBusy ? '辨識中…' : '📷 掃描收據'}</span>
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                style={{ display: 'none' }}
                onChange={handleReceiptChange}
              />
            </div>
            {voiceHint && <span className="voice-hint">{voiceHint}</span>}
            {ocrBusy && (
              <div className="ocr-progress" role="status" aria-live="polite">
                <div className="ocr-progress-bar">
                  <div
                    className="ocr-progress-fill"
                    style={{ width: `${Math.round(ocrProgress * 100)}%` }}
                  />
                </div>
                <span className="ocr-progress-label">{ocrStatus}</span>
              </div>
            )}
            {ocrError && <span className="voice-hint" style={{ color: 'var(--expense)' }}>{ocrError}</span>}
            {!ocrBusy && ocrCandidates.length > 1 && (
              <div className="ocr-candidates" role="group" aria-label="收據辨識金額候選">
                <span className="ocr-candidates-label">可能金額:</span>
                {ocrCandidates.map((n) => (
                  <button
                    key={n}
                    type="button"
                    className="quick-amount-btn"
                    onClick={() => setAmountText(String(n))}
                  >
                    ${n.toLocaleString()}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="form-group flex-1">
            <label>日期</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
            />
          </div>
        </div>

        <div className="form-group">
          <label>分類</label>
          <div className="category-grid">
            {currentCategories.map((cat) => (
              <button
                type="button"
                key={cat.id}
                className={`category-tile ${categoryId === cat.id ? 'active' : ''}`}
                onClick={() => setCategoryId(cat.id)}
                aria-pressed={categoryId === cat.id}
              >
                <CategoryIcon category={cat} size={44} className="category-tile-circle" />
                <span className="category-tile-name">{cat.name}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="form-group">
          <label>備註 (選填)</label>
          <input
            type="text"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="例如：午餐、薪資"
          />
          {transactions && (() => {
            const counts = new Map<string, number>();
            // Only look at the last 1000 transactions to keep it fast, or just iterate all.
            // We only care about the current type to suggest relevant notes.
            for (const t of transactions) {
              if (t.type !== type || !t.note) continue;
              counts.set(t.note, (counts.get(t.note) || 0) + 1);
            }
            const frequentNotes = Array.from(counts.entries())
              .sort((a, b) => b[1] - a[1])
              .slice(0, 5)
              .map((e) => e[0]);
              
            if (frequentNotes.length === 0) return null;
            
            return (
              <div className="quick-amount-row" style={{ marginTop: '0.5rem' }} role="group" aria-label="常用備註">
                {frequentNotes.map((n) => (
                  <button
                    key={n}
                    type="button"
                    className="quick-amount-btn"
                    onClick={() => setNote((curr) => curr ? `${curr} ${n}` : n)}
                  >
                    {n}
                  </button>
                ))}
              </div>
            );
          })()}
        </div>

        <button type="submit" className="submit-btn">
          {isEdit ? <Save size={20} /> : <PlusCircle size={20} />}
          <span>{isEdit ? '儲存修改' : '新增紀錄'}</span>
        </button>
      </form>
    </div>
  );
};

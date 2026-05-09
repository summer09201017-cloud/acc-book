// Tiny safe arithmetic parser. Supports + - * / × ÷ ( ) and decimal numbers.
// Recursive descent — no eval, no Function constructor.
//
// Grammar:
//   expr   := term   (('+' | '-') term)*
//   term   := factor (('*' | '/') factor)*
//   factor := '-' factor | '(' expr ')' | number

type Token =
  | { kind: 'num'; value: number }
  | { kind: 'op'; value: '+' | '-' | '*' | '/' }
  | { kind: 'lp' }
  | { kind: 'rp' };

const NORMALIZE: Record<string, string> = {
  '×': '*', 'x': '*', 'X': '*',
  '÷': '/',
  '（': '(', '）': ')',
  '＋': '+', '－': '-',
};

function tokenize(input: string): Token[] {
  const out: Token[] = [];
  let i = 0;
  while (i < input.length) {
    const ch = input[i];
    if (ch === ' ' || ch === ',' || ch === '\t') { i++; continue; }

    const norm = NORMALIZE[ch] ?? ch;

    if (norm === '+' || norm === '-' || norm === '*' || norm === '/') {
      out.push({ kind: 'op', value: norm });
      i++;
      continue;
    }
    if (norm === '(') { out.push({ kind: 'lp' }); i++; continue; }
    if (norm === ')') { out.push({ kind: 'rp' }); i++; continue; }

    if ((norm >= '0' && norm <= '9') || norm === '.') {
      let j = i;
      let dot = 0;
      while (j < input.length) {
        const c = input[j];
        if (c >= '0' && c <= '9') { j++; continue; }
        if (c === '.') { dot++; if (dot > 1) break; j++; continue; }
        break;
      }
      const num = Number(input.slice(i, j));
      if (!Number.isFinite(num)) throw new Error('invalid number');
      out.push({ kind: 'num', value: num });
      i = j;
      continue;
    }

    throw new Error(`unexpected character: ${ch}`);
  }
  return out;
}

class Parser {
  private pos = 0;
  constructor(private toks: Token[]) {}

  private peek(): Token | undefined { return this.toks[this.pos]; }
  private eat(): Token { return this.toks[this.pos++]; }

  parseExpr(): number {
    let left = this.parseTerm();
    while (true) {
      const t = this.peek();
      if (!t || t.kind !== 'op' || (t.value !== '+' && t.value !== '-')) break;
      this.eat();
      const right = this.parseTerm();
      left = t.value === '+' ? left + right : left - right;
    }
    return left;
  }

  private parseTerm(): number {
    let left = this.parseFactor();
    while (true) {
      const t = this.peek();
      if (!t || t.kind !== 'op' || (t.value !== '*' && t.value !== '/')) break;
      this.eat();
      const right = this.parseFactor();
      if (t.value === '/') {
        if (right === 0) throw new Error('divide by zero');
        left = left / right;
      } else {
        left = left * right;
      }
    }
    return left;
  }

  private parseFactor(): number {
    const t = this.peek();
    if (!t) throw new Error('unexpected end');
    if (t.kind === 'op' && t.value === '-') { this.eat(); return -this.parseFactor(); }
    if (t.kind === 'op' && t.value === '+') { this.eat(); return this.parseFactor(); }
    if (t.kind === 'lp') {
      this.eat();
      const v = this.parseExpr();
      const close = this.eat();
      if (!close || close.kind !== 'rp') throw new Error('missing )');
      return v;
    }
    if (t.kind === 'num') { this.eat(); return t.value; }
    throw new Error('unexpected token');
  }

  done(): boolean { return this.pos >= this.toks.length; }
}

export interface EvalResult {
  ok: boolean;
  value: number;
  // True only if the input contains an actual operator — used to decide
  // whether the UI should show "= 280" preview.
  isExpression: boolean;
}

const OPERATOR_RE = /[+\-*/×÷]/;

export function evaluateExpression(raw: string): EvalResult {
  const trimmed = raw.trim();
  if (trimmed === '') return { ok: false, value: 0, isExpression: false };

  // Strip leading sign for the "isExpression" check so "-50" isn't treated
  // as an expression preview.
  const body = trimmed.replace(/^[+\-]/, '');
  const isExpression = OPERATOR_RE.test(body) || /[()（）]/.test(body);

  try {
    const toks = tokenize(trimmed);
    const p = new Parser(toks);
    const v = p.parseExpr();
    if (!p.done()) return { ok: false, value: 0, isExpression };
    if (!Number.isFinite(v)) return { ok: false, value: 0, isExpression };
    return { ok: true, value: v, isExpression };
  } catch {
    return { ok: false, value: 0, isExpression };
  }
}

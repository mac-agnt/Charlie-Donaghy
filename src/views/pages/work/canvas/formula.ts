import { COLS, type Fmt } from "./model";

/* A small, safe formula engine for Canvas sheets. No eval.
   Supports numbers, percentages, cell refs (A1), ranges inside functions (A1:B4),
   + - * / and brackets, and SUM, AVERAGE (AVG), MIN, MAX, COUNT, ROUND, ABS. */

export type Val = number | string;

const ERR = (code: string) => {
  throw new Error(code);
};

const refRe = /^([A-Z])(\d+)$/;

function expand(a: string, b: string): string[] {
  const m1 = refRe.exec(a), m2 = refRe.exec(b);
  if (!m1 || !m2) return ERR("#REF");
  const c1 = Math.min(m1[1].charCodeAt(0), m2[1].charCodeAt(0)), c2 = Math.max(m1[1].charCodeAt(0), m2[1].charCodeAt(0));
  const r1 = Math.min(+m1[2], +m2[2]), r2 = Math.max(+m1[2], +m2[2]);
  const out: string[] = [];
  for (let c = c1; c <= c2; c++) for (let r = r1; r <= r2; r++) out.push(String.fromCharCode(c) + r);
  return out;
}

class Parser {
  i = 0;
  toks: string[];
  constructor(src: string, private get: (k: string) => Val) {
    const s = src.toUpperCase().replace(/\s+/g, "");
    this.toks = s.match(/\d+(?:\.\d+)?%?|\.\d+%?|[A-Z]+\d+|[A-Z]+|[-+*/(),:]/g) || [];
    if (this.toks.join("") !== s) ERR("#ERR");
  }
  peek() {
    return this.toks[this.i];
  }
  next() {
    return this.toks[this.i++];
  }
  num(v: Val): number {
    if (typeof v === "number") return v;
    if (v === "") return 0;
    if (v.startsWith("#")) ERR(v);
    const n = Number(v);
    return Number.isFinite(n) ? n : ERR("#VALUE");
  }
  parse(): number {
    const v = this.expr();
    if (this.i < this.toks.length) ERR("#ERR");
    return v;
  }
  expr(): number {
    let v = this.term();
    while (this.peek() === "+" || this.peek() === "-") v = this.next() === "+" ? v + this.term() : v - this.term();
    return v;
  }
  term(): number {
    let v = this.unary();
    while (this.peek() === "*" || this.peek() === "/") {
      const op = this.next();
      const r = this.unary();
      if (op === "/" && r === 0) ERR("#DIV/0");
      v = op === "*" ? v * r : v / r;
    }
    return v;
  }
  unary(): number {
    if (this.peek() === "-") {
      this.next();
      return -this.unary();
    }
    if (this.peek() === "+") {
      this.next();
      return this.unary();
    }
    return this.atom();
  }
  atom(): number {
    const t = this.next();
    if (t === undefined) return ERR("#ERR");
    if (/^\.?\d/.test(t)) return t.endsWith("%") ? parseFloat(t) / 100 : parseFloat(t);
    if (t === "(") {
      const v = this.expr();
      if (this.next() !== ")") ERR("#ERR");
      return v;
    }
    if (refRe.test(t)) {
      if (this.peek() === ":") ERR("#ERR");
      return this.num(this.get(t));
    }
    if (/^[A-Z]+$/.test(t)) {
      if (this.next() !== "(") ERR("#NAME");
      const args = this.args();
      return this.call(t, args);
    }
    return ERR("#ERR");
  }
  /** Function arguments; ranges expand to their numeric cells, blanks and text are skipped. */
  args(): number[] {
    const out: number[] = [];
    if (this.peek() === ")") {
      this.next();
      return out;
    }
    for (;;) {
      const t = this.peek();
      if (t && refRe.test(t) && this.toks[this.i + 1] === ":") {
        const a = this.next(), _ = this.next(), b = this.next();
        void _;
        expand(a, b).forEach((k) => {
          const v = this.get(k);
          if (typeof v === "number") out.push(v);
          else if (typeof v === "string" && v.startsWith("#")) ERR(v);
        });
      } else out.push(this.expr());
      const sep = this.next();
      if (sep === ")") return out;
      if (sep !== ",") ERR("#ERR");
    }
  }
  call(fn: string, a: number[]): number {
    switch (fn) {
      case "SUM": return a.reduce((s, x) => s + x, 0);
      case "AVERAGE":
      case "AVG": return a.length ? a.reduce((s, x) => s + x, 0) / a.length : ERR("#DIV/0");
      case "MIN": return a.length ? Math.min(...a) : 0;
      case "MAX": return a.length ? Math.max(...a) : 0;
      case "COUNT": return a.length;
      case "ABS": return Math.abs(a[0] ?? 0);
      case "ROUND": {
        const p = Math.pow(10, a[1] ?? 0);
        return Math.round((a[0] ?? 0) * p) / p;
      }
      default: return ERR("#NAME");
    }
  }
}

function literal(raw: string): Val {
  const t = raw.trim().replace(/[€,\s]/g, "");
  if (/^-?\d+(\.\d+)?%$/.test(t)) return parseFloat(t) / 100;
  if (/^-?(\d+(\.\d+)?|\.\d+)$/.test(t)) return parseFloat(t);
  return raw;
}

/** Every cell's value, memoised for one render. Cycles come back as #CYCLE. */
export function computeAll(cells: Record<string, string>): Record<string, Val> {
  const out: Record<string, Val> = {};
  const busy = new Set<string>();
  const get = (k: string): Val => {
    if (k in out) return out[k];
    const raw = cells[k];
    if (raw == null || raw === "") return "";
    if (raw[0] !== "=") return (out[k] = literal(raw));
    if (busy.has(k)) return "#CYCLE";
    busy.add(k);
    let v: Val;
    try {
      v = new Parser(raw.slice(1), get).parse();
      if (!Number.isFinite(v)) v = "#ERR";
    } catch (e) {
      v = e instanceof Error && e.message.startsWith("#") ? e.message : "#ERR";
    }
    busy.delete(k);
    return (out[k] = v);
  };
  Object.keys(cells).forEach(get);
  return out;
}

export function display(v: Val | undefined, fmt?: Fmt): string {
  if (v === undefined || v === "") return "";
  if (typeof v === "string") return v;
  if (fmt === "eur") return (v < 0 ? "-€" : "€") + Math.abs(v).toLocaleString("en-IE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  if (fmt === "pct") return (v * 100).toFixed(1) + "%";
  return v.toLocaleString("en-IE", { maximumFractionDigits: 2 });
}

export const keyOf = (c: number, r: number) => COLS[c] + r;

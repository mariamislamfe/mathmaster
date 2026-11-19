// Question + shortcut engine. Every generator returns the exact answer and a
// worked mental-math route computed from the actual numbers.

export type Category = 'arithmetic' | 'business' | 'logic';
export type Skill =
  | 'add' | 'sub' | 'mul21' | 'mul22' | 'div' | 'square' | 'root'
  | 'pct' | 'margin' | 'change' | 'ratio' | 'breakeven'
  | 'ev' | 'condprob' | 'sequence' | 'estimate';

export const SKILLS: Record<Skill, { label: string; cat: Category; ms: number }> = {
  add: { label: 'Addition', cat: 'arithmetic', ms: 2500 },
  sub: { label: 'Subtraction', cat: 'arithmetic', ms: 3000 },
  mul21: { label: 'N-digit × 1-digit', cat: 'arithmetic', ms: 3500 },
  mul22: { label: '2-digit × 2-digit', cat: 'arithmetic', ms: 6000 },
  div: { label: 'Division', cat: 'arithmetic', ms: 4000 },
  square: { label: 'Squares', cat: 'arithmetic', ms: 4000 },
  root: { label: 'Square roots', cat: 'arithmetic', ms: 4500 },
  pct: { label: 'Percent of', cat: 'business', ms: 4000 },
  margin: { label: 'Margins', cat: 'business', ms: 6000 },
  change: { label: '% change', cat: 'business', ms: 6000 },
  ratio: { label: 'Ratios & scaling', cat: 'business', ms: 6000 },
  breakeven: { label: 'Break-even', cat: 'business', ms: 6500 },
  ev: { label: 'Expected value', cat: 'logic', ms: 8000 },
  condprob: { label: 'Probability', cat: 'logic', ms: 12000 },
  sequence: { label: 'Sequences', cat: 'logic', ms: 8000 },
  estimate: { label: 'Estimation ±5%', cat: 'logic', ms: 7000 },
};

export const CATS: Record<Category, string> = { arithmetic: 'Arithmetic', business: 'Business', logic: 'Logic' };
export const ALL_SKILLS = Object.keys(SKILLS) as Skill[];
export const skillsOf = (c: string) => ALL_SKILLS.filter((s) => c === 'all' || SKILLS[s].cat === c);

export interface Question {
  id: string; skill: Skill; cat: Category; level: number; targetMs: number;
  prompt: string; answer: number; shortcut: string; unit?: string; tolAbs?: number; tolRel?: number;
}
type Core = Pick<Question, 'prompt' | 'answer' | 'shortcut' | 'unit' | 'tolAbs' | 'tolRel'>;

// ---------- helpers ----------
const R = (a: number, b: number) => Math.floor(Math.random() * (b - a + 1)) + a;
const P = <T,>(xs: readonly T[]): T => xs[Math.floor(Math.random() * xs.length)];
export const fmt = (n: number, d = 2) => n.toLocaleString('en-US', { maximumFractionDigits: d }).replace('-', '−');
const f = fmt;
const abs = Math.abs;
const gcd = (a: number, b: number): number => (b ? gcd(b, a % b) : abs(a));
const frac = (n: number, d: number) => { const g = gcd(n, d); return `${f(n / g)}/${f(d / g)}`; };
const op = (n: number) => (n < 0 ? '−' : '+');
const signed = (n: number) => (n < 0 ? `−${abs(n)}` : `+${n}`);
const money = (n: number) => (n < 0 ? `−$${f(abs(n))}` : `$${f(n)}`);
const places = (n: number) => String(n).split('').map((c, i, a) => +c * 10 ** (a.length - 1 - i)).filter(Boolean);
const sig = (n: number, s: number) => { const k = 10 ** (Math.floor(Math.log10(abs(n))) - s + 1); return Math.round(n / k) * k; };

function squareRoute(n: number) {
  if (n % 10 === 5) { const k = (n - 5) / 10; return `Ends in 5: ${k}×${k + 1} = ${f(k * (k + 1))}, append 25 → ${f(n * n)}`; }
  if (n % 10 === 0) return `${n / 10}² = ${f((n / 10) ** 2)}, append 00 → ${f(n * n)}`;
  const base = Math.round(n / 10) * 10, d = base - n, other = n - d;
  return `Pull to a round number: (${n}${op(d)}${abs(d)})×(${n}${op(-d)}${abs(d)}) + ${abs(d)}² = ${f(base)}×${f(other)} + ${d * d} = ${f(base * other)} + ${d * d} = ${f(n * n)}`;
}

function mulRoute(a: number, b: number) {
  const p = a * b;
  if (a === b) return squareRoute(a);
  if (a === 11 || b === 11) { const x = a === 11 ? b : a; return `×11 = ×10 + itself: ${f(x * 10)} + ${f(x)} = ${f(p)}`; }
  if (a < 100 && b < 100 && Math.floor(a / 10) === Math.floor(b / 10) && (a % 10) + (b % 10) === 10) {
    const t = Math.floor(a / 10);
    return `Same tens, units sum to 10: ${t}×${t + 1} = ${t * (t + 1)}, append ${(a % 10) * (b % 10)}`.replace(/append (\d)$/, 'append 0$1') + ` → ${f(p)}`;
  }
  if ((a + b) % 2 === 0 && ((a + b) / 2) % 5 === 0) {
    const m = (a + b) / 2, d = abs(a - b) / 2;
    return `Difference of squares around ${m}: ${m}² − ${d}² = ${f(m * m)} − ${d * d} = ${f(p)}`;
  }
  for (const [k, x] of [[a, b], [b, a]]) {
    if (k === 15) return `×15 = ×10 + half: ${f(x * 10)} + ${f(x * 5)} = ${f(p)}`;
    if (k === 25) return `×25 = ×100 ÷ 4: ${f(x * 100)} ÷ 4 = ${f(p)}`;
    if (k === 50) return `×50 = ×100 ÷ 2: ${f(x * 100)} ÷ 2 = ${f(p)}`;
    if (k === 12) return `×12 = ×10 + ×2: ${f(x * 10)} + ${f(x * 2)} = ${f(p)}`;
  }
  const [y, x] = a < b ? [a, b] : [b, a];
  if ([1, 2, 8, 9].includes(y % 10)) {
    const yr = Math.round(y / 10) * 10, k = y - yr;
    return `${f(x)}×${yr} = ${f(x * yr)}, ${op(k)} ${f(x)}×${abs(k)} (${f(x * abs(k))}) = ${f(p)}`;
  }
  if (y % 10 === 0) return `${f(x)}×${y / 10} = ${f((x * y) / 10)}, append 0 → ${f(p)}`;
  const yt = y - (y % 10), yu = y % 10;
  return `Split ${y} = ${yt} + ${yu}: ${f(x * yt)} + ${f(x * yu)} = ${f(p)}`;
}

function pctRoute(p: number, x: number) {
  const ans = (p * x) / 100, ten = x / 10, one = x / 100;
  const named: Record<number, string> = { 50: 'half', 25: 'a quarter', 75: 'three quarters', 12.5: 'an eighth', 37.5: 'three eighths', 62.5: 'five eighths' };
  if (named[p]) return `${p}% is ${named[p]} of ${f(x)} → ${f(ans)}`;
  if (p % 1) {
    const i = Math.floor(p);
    return i ? `1% = ${f(one)}. ${i}% = ${f(one * i)}, plus half of 1% (${f(one / 2)}) = ${f(ans)}` : `1% = ${f(one)}, half of it = ${f(ans)}`;
  }
  const t = Math.floor(p / 10), u = p % 10, head = `10% = ${f(ten)}`;
  if (u === 0) return t === 1 ? head : `${head}, ×${t} = ${f(ans)}`;
  if (u === 5) return `${head}${t > 1 ? `, ${t * 10}% = ${f(ten * t)}` : ''}, 5% = half of 10% = ${f(ten / 2)} → ${f(ans)}`;
  if (u < 5) return `${head}, 1% = ${f(one)}.${t ? ` ${t * 10}% = ${f(ten * t)} +` : ''} ${u}% (${f(one * u)}) = ${f(ans)}`;
  return `${head}, 1% = ${f(one)}. ${(t + 1) * 10}% = ${f(ten * (t + 1))} − ${10 - u}% (${f(one * (10 - u))}) = ${f(ans)}`;
}

// ---------- generators (L = 1..5) ----------
const GEN: Record<Skill, (L: number) => Core> = {
  add: (L) => {
    const [a0, a1, b0, b1] = [[10, 99, 10, 99], [100, 999, 10, 99], [100, 999, 100, 999], [1000, 9999, 100, 999], [1000, 9999, 1000, 9999]][L - 1];
    const a = R(a0, a1), b = R(b0, b1), s = a + b, st = b < 100 ? 10 : 100, br = Math.round(b / st) * st, d = br - b;
    return {
      prompt: `${f(a)} + ${f(b)}`, answer: s,
      shortcut: d === 0 ? `${f(b)} is already round → ${f(s)}` : `Round ${f(b)} to ${f(br)}: ${f(a)} + ${f(br)} = ${f(a + br)}, then ${op(-d)} ${abs(d)} = ${f(s)}`,
    };
  },
  sub: (L) => {
    const [a0, a1, b0, b1] = [[10, 99, 10, 99], [100, 999, 10, 99], [100, 999, 100, 999], [1000, 9999, 100, 999], [1000, 9999, 1000, 9999]][L - 1];
    let a = R(a0, a1), b = R(b0, b1);
    if (b > a) [a, b] = [b, a];
    if (a === b) a++;
    const st = b < 100 ? 10 : 100, br = Math.round(b / st) * st, d = br - b;
    let sc: string;
    if (d === 0) sc = `${f(b)} is already round → ${f(a - b)}`;
    else if (br > a) sc = `Count up from ${f(b)} to ${f(a)}: ${f(a - b)}`;
    else sc = `Round ${f(b)} to ${f(br)}: ${f(a)} − ${f(br)} = ${f(a - br)}, then ${op(d)} ${abs(d)} = ${f(a - b)}`;
    return { prompt: `${f(a)} − ${f(b)}`, answer: a - b, shortcut: sc };
  },
  mul21: (L) => {
    const [a0, a1, b0] = [[11, 29, 2], [21, 99, 3], [100, 499, 3], [100, 999, 6], [1000, 9999, 3]][L - 1];
    const a = R(a0, a1), b = R(b0, 9), p = a * b;
    let sc: string;
    if (b === 5) sc = `×5 = ×10 ÷ 2: ${f(a * 10)} ÷ 2 = ${f(p)}`;
    else if (a % 10 >= 8) { const ar = a + 10 - (a % 10), k = ar - a; sc = `${f(ar)}×${b} = ${f(ar * b)}, minus ${k}×${b} (${k * b}) = ${f(p)}`; }
    else { const ps = places(a); sc = `${ps.map((x) => `${f(x)}×${b}`).join(' + ')} = ${ps.map((x) => f(x * b)).join(' + ')} = ${f(p)}`; }
    return { prompt: `${f(a)} × ${b}`, answer: p, shortcut: sc };
  },
  mul22: (L) => {
    let a: number, b: number;
    if (L >= 2 && L <= 3 && Math.random() < 0.35) {
      if (Math.random() < 0.5) { const t = R(2, 9), u = R(1, 9); a = t * 10 + u; b = t * 10 + 10 - u; }
      else { const m = R(2, 9) * 10, d = R(1, 9); a = m + d; b = m - d; }
    } else {
      const [a0, a1, b0, b1] = [[11, 19, 11, 15], [11, 99, 11, 99], [21, 99, 21, 99], [100, 499, 11, 99], [100, 999, 21, 99]][L - 1];
      a = R(a0, a1); b = R(b0, b1);
    }
    return { prompt: `${f(a)} × ${f(b)}`, answer: a * b, shortcut: mulRoute(a, b) };
  },
  div: (L) => {
    const [d0, d1, q0, q1] = [[2, 9, 11, 30], [3, 9, 20, 99], [6, 19, 12, 99], [11, 25, 21, 150], [12, 49, 101, 500]][L - 1];
    const d = R(d0, d1), q = R(q0, q1), a = d * q;
    let sc: string;
    if (d === 5) sc = `÷5 = ×2 ÷ 10: ${f(a * 2)} ÷ 10 = ${q}`;
    else if (d === 25) sc = `÷25 = ×4 ÷ 100: ${f(a * 4)} ÷ 100 = ${q}`;
    else {
      const k = 10 ** (String(q).length - 1), big = Math.floor(q / k) * k;
      sc = big === q ? `${d}×${q / k} = ${f(a / k)}, shift ${String(k).length - 1} place(s) → ${q}`
        : `Split ${f(a)} = ${f(d * big)} + ${f(a - d * big)} → ${big} + ${q - big} = ${q}`;
    }
    return { prompt: `${f(a)} ÷ ${d}`, answer: q, shortcut: sc };
  },
  square: (L) => {
    const [n0, n1] = [[11, 25], [26, 60], [61, 99], [101, 150], [151, 300]][L - 1];
    const n = R(n0, n1);
    return { prompt: `${n}²`, answer: n * n, shortcut: squareRoute(n) };
  },
  root: (L) => {
    const [n0, n1] = [[11, 30], [31, 70], [71, 99], [101, 199], [200, 999]][L - 1];
    const n = R(n0, n1), N = n * n, t = Math.floor(n / 10);
    const ends: Record<number, number[]> = { 0: [0], 1: [1, 9], 4: [2, 8], 5: [5], 6: [4, 6], 9: [3, 7] };
    const c = ends[N % 10];
    let sc = `Last digit ${N % 10} → root ends in ${c.join(' or ')}. ${t * 10}² = ${f((t * 10) ** 2)} ≤ ${f(N)} < ${f((t * 10 + 10) ** 2)}`;
    if (c.length > 1) { const m = t * 10 + 5; sc += `. ${m}² = ${f(m * m)}, it's ${N < m * m ? 'below' : 'above'} → ${n}`; }
    else sc += ` → ${n}`;
    return { prompt: `√${f(N)}`, answer: n, shortcut: sc };
  },

  pct: (L) => {
    if (L >= 2 && Math.random() < 0.2) {
      const x = P([25, 50, 20]), p = R(12, 96);
      return { prompt: `${p}% of ${x}`, answer: (p * x) / 100, tolAbs: 0.01, shortcut: `Swap them: ${p}% of ${x} = ${x}% of ${p} = ${f((p * x) / 100)}` };
    }
    const p = L === 1 ? P([5, 10, 20, 25, 50]) : L === 2 ? P([15, 30, 35, 45, 12.5, 75, 40, 60]) : L === 3 ? P([7, 13, 17, 18, 22, 23, 35, 45, 65, 85]) : L === 4 ? R(1, 99) : P([2.5, 7.5, 12.5, 17.5, 37.5, 62.5, 0.5, 1.5]);
    const x = L <= 2 ? R(2, 40) * 20 : L === 3 ? R(10, 99) * 10 : L === 4 ? R(10, 200) * 10 : R(5, 125) * 40;
    return { prompt: `${p}% of ${f(x)}`, answer: (p * x) / 100, tolAbs: 0.01, shortcut: pctRoute(p, x) };
  },
  margin: (L) => {
    if (L >= 4 && Math.random() < 0.5) {
      const M = P([10, 20, 25, 40, 50, 60, 75, 100, 150, 200]), m = (M / (100 + M)) * 100, C = R(2, 50) * 10;
      return { prompt: `Cost $${C}, marked up ${M}%. Margin on price?`, unit: '%', answer: m, tolAbs: 0.5, shortcut: `Margin = markup ÷ (1 + markup) = ${M}/${100 + M} = ${frac(M, 100 + M)} ≈ ${f(m, 1)}%` };
    }
    const m = P(L === 1 ? [10, 20, 25, 50] : L === 2 ? [15, 30, 35, 40, 60, 75] : [12.5, 22.5, 27.5, 32.5, 37.5, 42.5, 55, 65]);
    const pr = L <= 2 ? P([20, 40, 80, 100, 200, 400]) : R(3, 25) * 40;
    const profit = Math.round(pr * m) / 100, C = pr - profit;
    return { prompt: `Price $${f(pr)}, cost $${f(C)}. Gross margin?`, unit: '%', answer: m, tolAbs: 0.05, shortcut: `Profit = ${f(pr)} − ${f(C)} = ${f(profit)}. ${f(profit)}/${f(pr)} = ${frac(profit, pr)} = ${m}%` };
  },
  change: (L) => {
    if (L === 5) {
      const a = P([10, 20, 25, 30, 40, 50]), b = -P([10, 20, 25, 30, 40, 50]);
      const [x, y] = Math.random() < 0.5 ? [a, b] : [b, a], net = x + y + (x * y) / 100;
      return { prompt: `${signed(x)}% then ${signed(y)}%. Net change?`, unit: '%', answer: net, tolAbs: 0.05, shortcut: `a + b + ab/100 = ${x} ${op(y)} ${abs(y)} − ${f(abs(x * y) / 100)} = ${f(net)}%` };
    }
    if (L === 4) {
      const g = P([10, 20, 25, 50, 60, 75, -20, -25, -50]), O = R(2, 40) * 40, N = O + (O * g) / 100;
      return { prompt: `After a ${abs(g)}% ${g > 0 ? 'increase' : 'decrease'}, it's $${f(N)}. Original?`, answer: O, shortcut: `${f(N)} ÷ ${f(1 + g / 100)} = ${f(N)} × ${frac(100, 100 + g)} = ${f(O)}` };
    }
    const g = L === 1 ? P([10, 20, 25, 50, -10, -20, -25, -50]) : L === 2 ? P([5, 15, 30, 35, 40, 60, 75, -5, -15, -30, -35, -40, -60]) : P([-1, 1]) * R(1, 60);
    const O = L === 1 ? P([20, 40, 80, 100, 200, 400]) : L === 2 ? R(2, 40) * 20 : R(3, 99) * 100, N = O + (O * g) / 100;
    return { prompt: `${f(O)} → ${f(N)}. % change?`, unit: '%', answer: g, tolAbs: 0.05, shortcut: `Δ = ${f(N)} − ${f(O)} = ${f(N - O)}. ${f(N - O)}/${f(O)} = ${frac(N - O, O)} = ${f(g)}%` };
  },
  ratio: (L) => {
    if (L <= 3) {
      const hi = L === 1 ? 5 : 9, parts = L === 3 ? [R(1, 6), R(1, 6), R(1, 6)] : [R(1, hi), R(1, hi)];
      if (parts.every((x) => x === parts[0])) parts[0]++;
      const s = parts.reduce((a, b) => a + b, 0), k = L === 1 ? R(2, 20) : R(2, 40) * 5, T = s * k, top = Math.max(...parts);
      return { prompt: `Split $${f(T)} in ratio ${parts.join(':')}. Largest share?`, answer: top * k, shortcut: `${parts.join(' + ')} = ${s} parts. 1 part = ${f(T)} ÷ ${s} = ${f(k)}. ×${top} = ${f(top * k)}` };
    }
    if (L === 4) {
      const n1 = R(2, 8), n2 = R(3, 12) + (R(0, 1) ? 0 : 1), u = R(1, 12) * 25, m = n2 === n1 ? n2 + 1 : n2;
      return { prompt: `${n1} units cost $${f(n1 * u)}. Cost of ${m}?`, answer: m * u, shortcut: `1 unit = ${f(n1 * u)} ÷ ${n1} = ${u}. ×${m} = ${f(m * u)}` };
    }
    const w1 = R(3, 12), d1 = R(4, 20), T = w1 * d1;
    const ds = Array.from({ length: T - 1 }, (_, i) => i + 2).filter((x) => T % x === 0 && x !== w1 && x <= 60);
    const w2 = P(ds.length ? ds : [T]);
    return { prompt: `${w1} people finish a job in ${d1} days. Days for ${w2} people?`, answer: T / w2, shortcut: `Total work = ${w1}×${d1} = ${T} person-days. ${T} ÷ ${w2} = ${T / w2}` };
  },
  breakeven: (L) => {
    if (L === 5) {
      const r = P([20, 25, 40, 50, 60, 75, 80]), F = R(2, 30) * 6000, ans = (F * 100) / r;
      return { prompt: `Fixed costs $${f(F)}, contribution margin ${r}%. Break-even revenue?`, answer: ans, shortcut: `Revenue = fixed ÷ CM% = ${f(F)} × ${frac(100, r)} = ${f(ans)}` };
    }
    const c = L === 1 ? R(2, 10) * 5 : R(4, 45), u = L === 1 ? R(2, 20) * 10 : R(2, 40) * 50, v = L === 1 ? R(1, 10) * 5 : R(3, 90), F = c * u;
    const tp = L === 4 ? c * R(1, 20) * 10 : 0, ans = (F + tp) / c;
    return {
      prompt: `Fixed $${f(F)}. Price $${v + c}, variable cost $${v}/unit. ${tp ? `Units for $${f(tp)} profit?` : 'Break-even units?'}`,
      answer: ans, shortcut: `Contribution = ${v + c} − ${v} = ${c}/unit. ${tp ? `(${f(F)} + ${f(tp)})` : f(F)} ÷ ${c} = ${f(ans)}`,
    };
  },

  ev: (L) => {
    if (L <= 2) {
      const p = P([10, 20, 25, 40, 50, 60, 75, 80, 90]), W = R(1, L === 1 ? 10 : 50) * 20, Lo = R(1, L === 1 ? 10 : 50) * 20;
      const a = (p * W) / 100, b = ((100 - p) * Lo) / 100;
      return { prompt: `${p}% to win $${f(W)}, otherwise lose $${f(Lo)}. EV?`, answer: a - b, tolAbs: 0.01, shortcut: `${p}%×${f(W)} = ${f(a)}; ${100 - p}%×${f(Lo)} = ${f(b)}. ${f(a)} − ${f(b)} = ${money(a - b)}` };
    }
    if (L === 5) {
      const k = R(2, 12), c = R(1, 40), e = 3.5 * k - c;
      return { prompt: `Pay $${c} to roll a die, win $${k} × the face. EV per play?`, answer: e, tolAbs: 0.01, shortcut: `Average face = 3.5 → 3.5×${k} = ${f(3.5 * k)}, minus ${c} = ${money(e)}` };
    }
    const ps = P([[50, 30, 20], [60, 30, 10], [40, 40, 20], [25, 25, 50], [70, 20, 10], [45, 35, 20]]), vs = ps.map(() => R(-10, 30) * 10);
    const terms = ps.map((p, i) => (p * vs[i]) / 100), e = terms.reduce((a, b) => a + b, 0);
    return { prompt: `Payoffs: ${ps.map((p, i) => `${p}% → ${money(vs[i])}`).join(', ')}. EV?`, answer: e, tolAbs: 0.01, shortcut: `${terms.map((t) => f(t)).join(' + ').replace(/\+ −/g, '− ')} = ${money(e)}` };
  },
  condprob: (L) => {
    if (L === 1) {
      const r = R(1, 9), n = r + R(1, 9) * (r < 5 ? 1 : 2), w = P([5, 10, 20, 4]), N = w * Math.ceil(n / w) || n, a = (r / N) * 100;
      return { prompt: `Bag: ${r} red out of ${N} balls. Draw one. P(red)?`, unit: '%', answer: a, tolAbs: 0.5, shortcut: `${r}/${N} = ${frac(r, N)} ≈ ${f(a, 1)}%` };
    }
    if (L === 2) {
      const r = R(2, 6), b = R(2, 8), n = r + b, a = ((r * (r - 1)) / (n * (n - 1))) * 100;
      return { prompt: `Bag: ${r} red, ${b} blue. Draw 2 without replacement. P(both red)?`, unit: '%', answer: a, tolAbs: 0.5, shortcut: `${r}/${n} × ${r - 1}/${n - 1} = ${frac(r * (r - 1), n * (n - 1))} ≈ ${f(a, 1)}%` };
    }
    if (L === 3) {
      if (Math.random() < 0.5) {
        const n = R(3, 6), a = (1 - 0.5 ** n) * 100;
        return { prompt: `Flip ${n} fair coins. P(at least one head)?`, unit: '%', answer: a, tolAbs: 0.5, shortcut: `Complement: 1 − (1/2)^${n} = 1 − 1/${2 ** n} ≈ ${f(a, 1)}%` };
      }
      const n = R(2, 3), a = (1 - (5 / 6) ** n) * 100;
      return { prompt: `Roll ${n} dice. P(at least one six)?`, unit: '%', answer: a, tolAbs: 0.5, shortcut: `Complement: 1 − (5/6)^${n} = 1 − ${5 ** n}/${6 ** n} ≈ ${f(a, 1)}%` };
    }
    const p = P([1, 2, 5, 10]), s = P([80, 90, 95, 99]), fp = P([5, 10, 20]);
    const sick = 10 * p, tp = (sick * s) / 100, healthy = 1000 - sick, fpos = (healthy * fp) / 100, a = (tp / (tp + fpos)) * 100;
    return {
      prompt: `Prevalence ${p}%. Test catches ${s}% of cases, false-positive rate ${fp}%. You test positive. P(disease)?`, unit: '%', answer: a, tolAbs: 1,
      shortcut: `Picture 1,000 people: ${sick} sick → ${f(tp, 1)} positive; ${healthy} healthy → ${f(fpos, 1)} positive. ${f(tp, 1)} ÷ ${f(tp + fpos, 1)} ≈ ${f(a, 1)}%`,
    };
  },
  sequence: (L) => {
    const kind = L === 1 ? 0 : L === 2 ? P([0, 1]) : L === 3 ? P([1, 2]) : L === 4 ? P([2, 3]) : P([3, 4]);
    let t: number[], rule: string;
    if (kind === 0) {
      const a = R(-20, 40), d = (L === 1 ? 1 : P([-1, 1])) * R(3, 15);
      t = [0, 1, 2, 3, 4, 5].map((i) => a + i * d); rule = `Constant step ${signed(d)}: ${t[4]} ${op(d)} ${abs(d)} = ${t[5]}`;
    } else if (kind === 1) {
      const a = R(1, 6), r = R(2, 4);
      t = [0, 1, 2, 3, 4, 5].map((i) => a * r ** i); rule = `Each term ×${r}: ${f(t[4])} × ${r} = ${f(t[5])}`;
    } else if (kind === 2) {
      const d = R(1, 8), s = R(1, 5); t = [R(1, 20)];
      for (let i = 0; i < 5; i++) t.push(t[i] + d + i * s);
      rule = `Gaps grow by ${s} (${[0, 1, 2, 3].map((i) => d + i * s).join(', ')}) → next gap ${d + 4 * s}: ${t[4]} + ${d + 4 * s} = ${t[5]}`;
    } else if (kind === 3) {
      const k = R(-5, 10), st = R(1, 8);
      t = [0, 1, 2, 3, 4, 5].map((i) => (st + i) ** 2 + k); rule = `n²${k ? ` ${op(k)} ${abs(k)}` : ''} for n = ${st}, ${st + 1}, … → ${st + 5}²${k ? ` ${op(k)} ${abs(k)}` : ''} = ${t[5]}`;
    } else {
      t = [R(1, 9), R(1, 9)];
      for (let i = 2; i < 6; i++) t.push(t[i - 1] + t[i - 2]);
      rule = `Each term is the sum of the previous two: ${t[3]} + ${t[4]} = ${t[5]}`;
    }
    return { prompt: `${t.slice(0, 5).map((x) => f(x)).join(', ')}, ?`, answer: t[5], shortcut: rule };
  },
  estimate: (L) => {
    const base = { tolRel: 0.05, unit: undefined as string | undefined };
    if (L === 3) {
      const b = R(13, 97), a = Math.round(b * (R(30, 600) + Math.random())), A = Math.round(a / b) * b;
      return { ...base, prompt: `≈ ${f(a)} ÷ ${b}`, answer: a / b, shortcut: `Nearest clean multiple: ${f(A)} ÷ ${b} = ${f(A / b)} (exact ${f(a / b, 1)})` };
    }
    if (L === 4) {
      const p = R(11, 49) + R(1, 9) / 10, x = R(1000, 9999), X = sig(x, 3), pr = Math.round(p), ans = (p * x) / 100;
      return { ...base, prompt: `≈ ${p}% of ${f(x)}`, answer: ans, shortcut: `Round: ${pr}% of ${f(X)} → 10% = ${f(X / 10)}, so ≈ ${f((pr * X) / 100, 0)} (exact ${f(ans)})` };
    }
    if (L === 5 && Math.random() < 0.5) {
      const N = R(1000, 99999), n = Math.floor(Math.sqrt(N)), g = (N - n * n) / (2 * n);
      return { ...base, prompt: `≈ √${f(N)}`, answer: Math.sqrt(N), shortcut: `${n}² = ${f(n * n)}. Gap ${f(N - n * n)} ÷ (2×${n}) ≈ ${f(g, 1)} → ≈ ${f(n + g, 1)} (exact ${f(Math.sqrt(N))})` };
    }
    const a = L === 1 ? R(101, 999) : R(1001, 9999), b = L === 5 ? R(101, 999) : R(21, 99);
    const A = sig(a, a >= 1000 ? 3 : 2), B = sig(b, 2);
    return { ...base, prompt: `≈ ${f(a)} × ${f(b)}`, answer: a * b, shortcut: `Round to friendly figures: ${f(A)} × ${f(B)} = ${f(A * B)} (exact ${f(a * b)})` };
  },
};

// ---------- public API ----------
export function generate(skill: Skill, level = 1): Question {
  const L = Math.min(5, Math.max(1, Math.round(level)));
  const core = GEN[skill](L);
  return { ...core, id: Math.random().toString(36).slice(2, 10), skill, cat: SKILLS[skill].cat, level: L, targetMs: Math.round(SKILLS[skill].ms * (1 + (L - 1) * 0.3)) };
}

export function check(q: Question, v: number) {
  const tol = Math.max(q.tolAbs ?? 1e-6, q.tolRel ? abs(q.answer) * q.tolRel : 0);
  return abs(v - q.answer) <= tol + 1e-9;
}

export function parseInput(s: string): number | null {
  const t = s.replace(/[,\s$%]/g, '').replace(/[−–]/g, '-');
  if (!t || t === '-' || t === '.' || t === '-.') return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

/** Learning order, easiest first. New skills unlock along this path. */
export const CURRICULUM: Skill[] = ['add', 'sub', 'mul21', 'pct', 'div', 'square', 'change', 'mul22', 'ratio', 'margin', 'root', 'sequence', 'breakeven', 'ev', 'estimate', 'condprob'];
export const UNLOCK_LEVEL = 2;
export const STREAK_UP = 3;

export type SkillState = { level: number; streak: number; misses: number };
export const freshState = (): SkillState => ({ level: 1, streak: 0, misses: 0 });

/** 3 correct-and-quick in a row → level up. 2 misses in a row → level down. Slow-but-correct holds. */
export function step(s: SkillState, ok: boolean, quick: boolean): SkillState {
  if (ok && quick) {
    const streak = s.streak + 1;
    return streak >= STREAK_UP && s.level < 5 ? { level: s.level + 1, streak: 0, misses: 0 } : { ...s, streak: Math.min(streak, STREAK_UP), misses: 0 };
  }
  if (ok) return { ...s, misses: 0 };
  const misses = s.misses + 1;
  return misses >= 2 && s.level > 1 ? { level: s.level - 1, streak: 0, misses: 0 } : { ...s, streak: 0, misses };
}

/** Skills in play: everything already past the unlock level, plus at most two still being learned. */
export function activeSkills(pool: Skill[], level: (s: Skill) => number): Skill[] {
  const out: Skill[] = [];
  let learning = 0;
  for (const s of CURRICULUM.filter((x) => pool.includes(x))) {
    out.push(s);
    if (level(s) < UNLOCK_LEVEL && ++learning >= 2) break;
  }
  return out;
}

'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ALL_SKILLS, SKILLS, STREAK_UP, activeSkills, check, fmt, freshState, generate, parseInput, skillsOf, step, type Question, type Skill, type SkillState } from '@/lib/engine';

type Mode = 'sprint' | 'practice' | 'drill';
type Log = { at: string; cat: string; skill: Skill; level: number; prompt: string; answer: string; given: string; correct: boolean; slow: boolean; ms: number; shortcut: string; unit?: string };
type Phase = 'load' | 'run' | 'review' | 'done';

const sec = (ms: number) => (ms / 1000).toFixed(2) + 's';
const clock = (ms: number) => { const s = Math.max(0, Math.ceil(ms / 1000)); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; };
const NAMES: Record<Mode, string> = { sprint: 'Sprint', practice: 'Practice', drill: 'Weakness drill' };

export default function Trainer({ mode, scope, secs }: { mode: Mode; scope: string; secs: number }) {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>('load');
  const [q, setQ] = useState<Question | null>(null);
  const [val, setVal] = useState('');
  const [flash, setFlash] = useState<'' | 'ok' | 'bad'>('');
  const [last, setLast] = useState<Log | null>(null);
  const [left, setLeft] = useState(secs * 1000);
  const [auto, setAuto] = useState(false);
  const [note, setNote] = useState('');
  const [saved, setSaved] = useState<'' | 'saving' | 'saved' | 'local'>('');
  const [, tick] = useState(0);

  const pool = useRef<Skill[]>([]);
  const states = useRef<Record<string, SkillState>>({});
  const touched = useRef(new Set<Skill>());
  const retry = useRef<{ skill: Skill; need: number; tries: number } | null>(null);
  const logs = useRef<Log[]>([]);
  const t0 = useRef(0), started = useRef(0), input = useRef<HTMLInputElement>(null), ended = useRef(false);
  const timed = mode !== 'practice', teach = mode !== 'sprint';
  const st = (s: Skill) => states.current[s] ?? freshState();
  const lvl = (s: Skill) => st(s).level;

  // After a miss: same skill until 2 right in a row. Otherwise: unlocked skills, weighted toward the weaker ones.
  const pick = (avoid?: Skill): Skill => {
    if (retry.current) return retry.current.skill;
    const act = mode === 'drill' ? pool.current : activeSkills(pool.current, lvl);
    const c = act.length > 1 ? act.filter((s) => s !== avoid) : act;
    const w = c.map((s) => 6 - lvl(s));
    let r = Math.random() * w.reduce((a, b) => a + b, 0);
    for (let i = 0; i < c.length; i++) if ((r -= w[i]) < 0) return c[i];
    return c[0];
  };
  const ask = (s: Skill) => { setQ(generate(s, lvl(s))); setVal(''); t0.current = performance.now(); };

  const next = useCallback(() => ask(pick(q?.skill)), [q]); // eslint-disable-line react-hooks/exhaustive-deps

  // boot: pull skill states + weak skills from Neon
  useEffect(() => {
    let live = true;
    try { setAuto(localStorage.getItem('auto') === '1'); } catch {}
    fetch('/api/state').then((r) => r.json()).catch(() => ({ states: {}, weak: [] })).then((st) => {
      if (!live) return;
      states.current = st.states || {};
      let p: Skill[] = mode === 'drill' ? (st.weak || []).filter((s: string) => s in SKILLS) : skillsOf(scope);
      if (mode === 'drill' && p.length < 3) {
        setNote(p.length ? 'Not enough history for three weak skills yet; topped up at random.' : 'No history yet; drilling three random skills.');
        const rest = ALL_SKILLS.filter((s) => !p.includes(s)).sort(() => Math.random() - 0.5);
        p = [...p, ...rest.slice(0, 3 - p.length)];
      }
      pool.current = p.length ? p : ALL_SKILLS;
      started.current = Date.now();
      setPhase('run');
      ask(pick());
    });
    return () => { live = false; };
  }, [mode, scope]); // eslint-disable-line react-hooks/exhaustive-deps

  const finish = useCallback(() => {
    if (ended.current) return;
    ended.current = true;
    setPhase('done');
    if (!logs.current.length) return;
    setSaved('saving');
    fetch('/api/session', {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ mode, scope, startedAt: new Date(started.current).toISOString(), durationMs: Date.now() - started.current, logs: logs.current,
        states: [...touched.current].map((s) => ({ skill: s, ...states.current[s] })) }),
    }).then((r) => r.json()).then((r) => setSaved(r.ok ? 'saved' : 'local')).catch(() => setSaved('local'));
  }, [mode, scope]);

  // countdown
  useEffect(() => {
    if (!timed || phase === 'load' || phase === 'done') return;
    const id = setInterval(() => {
      const l = secs * 1000 - (Date.now() - started.current);
      setLeft(l);
      if (l <= 0) finish();
    }, 100);
    return () => clearInterval(id);
  }, [timed, phase, secs, finish]);

  useEffect(() => { if (phase === 'run') input.current?.focus(); }, [phase, q]);

  const submit = (raw: string) => {
    if (!q || phase !== 'run') return;
    const v = parseInput(raw);
    if (v === null) return;
    const ms = Math.round(performance.now() - t0.current), ok = check(q, v), slow = ms > q.targetMs;
    const log: Log = { at: new Date().toISOString(), cat: q.cat, skill: q.skill, level: q.level, prompt: q.prompt, answer: fmt(q.answer), given: raw.trim(), correct: ok, slow, ms, shortcut: q.shortcut, unit: q.unit };
    logs.current.push(log);
    tick((n) => n + 1);

    const before = st(q.skill), after = step(before, ok, ms <= q.targetMs * 1.5);
    const act0 = activeSkills(pool.current, lvl);
    states.current[q.skill] = after;
    touched.current.add(q.skill);
    const unlocked = mode === 'drill' ? [] : activeSkills(pool.current, lvl).filter((s) => !act0.includes(s));
    if (unlocked.length) setNote(`Unlocked: ${unlocked.map((s) => SKILLS[s].label).join(', ')}`);
    else if (after.level !== before.level) setNote(`${SKILLS[q.skill].label}: level ${before.level} → ${after.level}${after.level < before.level ? ' (easing off)' : ''}`);

    const r = retry.current;
    if (!ok) { const tries = r?.skill === q.skill ? r.tries + 1 : 1; retry.current = tries >= 6 ? null : { skill: q.skill, need: 2, tries }; }
    else if (r?.skill === q.skill && --r.need <= 0) retry.current = null;

    setLast(log);
    if (teach && (!ok || slow)) { setPhase('review'); return; }
    setFlash(ok ? 'ok' : 'bad');
    setTimeout(() => setFlash(''), 160);
    next();
  };

  // keys outside the input (review / done)
  useEffect(() => {
    const on = (e: KeyboardEvent) => {
      if (phase === 'review' && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); setPhase('run'); next(); }
      else if (phase === 'review' && e.key === 'Escape') finish();
      else if (phase === 'done' && e.key === 'Enter') window.location.reload();
      else if (phase === 'done' && e.key === 'Escape') router.push('/');
    };
    window.addEventListener('keydown', on);
    return () => window.removeEventListener('keydown', on);
  }, [phase, next, finish, router]);

  const all = logs.current, right = all.filter((l) => l.correct).length;
  const acc = all.length ? Math.round((right / all.length) * 100) : 0;
  const avg = right ? all.filter((l) => l.correct).reduce((s, l) => s + l.ms, 0) / right : 0;

  if (phase === 'load') return <div className="py-32 text-center font-mono text-xs text-mute">loading…</div>;

  if (phase === 'done') {
    const flagged = all.filter((l) => !l.correct || l.slow);
    return (
      <div className="py-12">
        <div className="font-mono text-[11px] uppercase tracking-wider text-mute">{NAMES[mode]} · complete</div>
        <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 border-y border-line divide-x divide-line">
          {[['Questions', all.length], ['Accuracy', acc + '%'], ['Avg correct', avg ? sec(avg) : '—'], ['Flagged', flagged.length]].map(([k, v]) => (
            <div key={k} className="py-4 px-4 first:pl-0"><div className="text-[11px] text-mute">{k}</div><div className="mt-1 text-2xl font-mono">{v}</div></div>
          ))}
        </div>
        <div className="mt-3 font-mono text-[11px] text-mute">
          {saved === 'saving' && 'saving…'}{saved === 'saved' && 'saved to Neon'}{saved === 'local' && 'not saved: set DATABASE_URL in .env.local'}
        </div>

        <h2 className="mt-10 font-mono text-[11px] uppercase tracking-wider text-mute">Review: misses and slow answers</h2>
        {flagged.length === 0 ? <p className="mt-4 text-sm text-mute">Nothing flagged. Clean run.</p> : (
          <ul className="mt-3 divide-y divide-line border-y border-line">
            {flagged.map((l, i) => (
              <li key={i} className="py-4 grid sm:grid-cols-[1fr_auto] gap-2">
                <div>
                  <div className="font-mono">{l.prompt} = <span className="text-fg">{l.answer}{l.unit}</span></div>
                  <div className="mt-1.5 text-sm text-mute leading-relaxed">{l.shortcut}</div>
                </div>
                <div className="font-mono text-xs sm:text-right space-y-1">
                  <div className={l.correct ? 'text-warn' : 'text-bad'}>{l.correct ? 'slow' : 'miss'} · {sec(l.ms)}</div>
                  {!l.correct && <div className="text-mute">you: <span className="line-through">{l.given}</span></div>}
                </div>
              </li>
            ))}
          </ul>
        )}
        <div className="mt-8 flex gap-5 font-mono text-[11px] text-mute"><span><kbd>↵</kbd> again</span><span><kbd>esc</kbd> home</span></div>
      </div>
    );
  }

  if (!q) return null;
  const long = q.prompt.length > 22;

  return (
    <div className="py-6 sm:py-10 min-h-[70vh] flex flex-col">
      <div className="flex items-center justify-between font-mono text-[11px] text-mute">
        <span className="uppercase tracking-wider">{NAMES[mode]}{mode !== 'drill' && scope !== 'all' ? ` · ${scope}` : ''}</span>
        <span className={`text-sm ${timed && left < 10000 ? 'text-acc' : 'text-fg'}`}>{timed ? clock(left) : `${all.length} done`}</span>
        <span>{all.length ? `${right}/${all.length} · ${acc}%` : '—'}</span>
      </div>
      {timed && <div className="mt-3 h-px bg-line"><div className="h-px bg-fg origin-left" style={{ transform: `scaleX(${Math.max(0, left) / (secs * 1000)})` }} /></div>}

      <div className="flex-1 flex flex-col justify-center py-12">
        {phase === 'review' && last ? (
          <div className="max-w-2xl">
            <div className={`font-mono text-[11px] uppercase tracking-wider ${last.correct ? 'text-warn' : 'text-bad'}`}>
              {last.correct ? `correct, but slow: ${sec(last.ms)} / target ${sec(q.targetMs)}` : `miss · you answered ${last.given}`}
            </div>
            <div className="mt-4 font-mono text-3xl sm:text-4xl">{last.prompt} = {last.answer}{last.unit}</div>
            <div className="mt-6 border-l-2 border-acc pl-4 py-1">
              <div className="font-mono text-[11px] uppercase tracking-wider text-mute">Shortcut</div>
              <div className="mt-1.5 leading-relaxed">{last.shortcut}</div>
            </div>
            <div className="mt-8 flex gap-5 font-mono text-[11px] text-mute"><span><kbd>↵</kbd> next</span><span><kbd>esc</kbd> end</span></div>
          </div>
        ) : (
          <div>
            <div className="font-mono text-[11px] uppercase tracking-wider text-mute flex items-center gap-3">
              <span>{SKILLS[q.skill].label}</span><span>L{q.level}</span>
              <span className="flex gap-1" title={`${STREAK_UP} quick correct answers in a row to level up`}>
                {Array.from({ length: STREAK_UP }, (_, i) => <i key={i} className={`size-1.5 rounded-full ${i < st(q.skill).streak ? 'bg-acc' : 'bg-line'}`} />)}
              </span>
              <span>{sec(q.targetMs)}</span>
            </div>
            {retry.current?.skill === q.skill && (
              <div className="mt-2 text-xs text-warn">Same type again: {retry.current.need} more right in a row to move on.</div>
            )}
            <div className={`mt-4 ${long ? 'text-2xl sm:text-3xl max-w-2xl leading-snug' : 'font-mono text-5xl sm:text-7xl tracking-tight'}`}>{q.prompt}</div>
            <div className="mt-8 h-px bg-line relative overflow-hidden">
              <div key={q.id} className="absolute inset-0 bg-acc origin-left" style={{ animation: `fill ${q.targetMs}ms linear forwards` }} />
            </div>
            <div className="flex items-baseline gap-2 mt-4">
              <input
                ref={input} type="text" inputMode="decimal" autoComplete="off" spellCheck={false} value={val}
                placeholder="answer"
                onChange={(e) => {
                  const s = e.target.value;
                  setVal(s);
                  const v = parseInput(s);
                  if (auto && v !== null && !s.endsWith('.') && Math.abs(v - q.answer) < 1e-9) submit(s);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') { e.preventDefault(); submit(val); }
                  else if (e.key === 'Tab') { e.preventDefault(); setAuto((a) => { try { localStorage.setItem('auto', a ? '0' : '1'); } catch {} return !a; }); }
                  else if (e.key === 'Escape') finish();
                }}
                className={`w-full bg-transparent font-mono text-4xl sm:text-5xl placeholder:text-line transition-colors ${flash === 'ok' ? 'text-ok' : flash === 'bad' ? 'text-bad' : ''}`}
              />
              {q.unit && <span className="font-mono text-3xl text-mute">{q.unit}</span>}
            </div>
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 font-mono text-[11px] text-mute border-t border-line pt-3">
        {last && phase === 'run' && (
          <span className={last.correct ? (last.slow ? 'text-warn' : 'text-ok') : 'text-bad'}>
            {last.prompt} = {last.answer} · {sec(last.ms)}
          </span>
        )}
        {note && <span className="text-acc">{note}</span>}
        <span className="ml-auto"><kbd>↵</kbd> submit</span>
        <span><kbd>tab</kbd> auto-submit {auto ? 'on' : 'off'}</span>
        <span><kbd>esc</kbd> end</span>
      </div>
    </div>
  );
}

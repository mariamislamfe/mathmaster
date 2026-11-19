'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ALL_SKILLS, CATS, SKILLS, type Category } from '@/lib/engine';

const MODES = [
  { k: '1', id: 'sprint', name: 'Sprint', desc: 'Against the clock, no stops. Shortcuts for every miss come in the review at the end.' },
  { k: '2', id: 'practice', name: 'Practice', desc: 'Start here. No timer. A miss or slow answer stops and shows the shortcut.' },
  { k: '3', id: 'drill', name: 'Weakness drill', desc: '5 minutes only on the three sub-skills you miss most.' },
];
const SCOPES = [{ k: 'a', id: 'all', name: 'All' }, { k: 's', id: 'arithmetic', name: 'Arithmetic' }, { k: 'b', id: 'business', name: 'Business' }, { k: 'l', id: 'logic', name: 'Logic' }];
const LENS = [{ k: 'q', v: 60, name: '1 min' }, { k: 'w', v: 120, name: '2 min' }, { k: 'e', v: 300, name: '5 min' }];

function Opt({ on, k, children, onClick, off }: { on: boolean; k: string; children: React.ReactNode; onClick: () => void; off?: boolean }) {
  return (
    <button disabled={off} onClick={onClick}
      className={`h-9 px-3 flex items-center gap-2.5 border text-sm transition-colors disabled:opacity-30 ${on ? 'border-fg bg-panel' : 'border-line text-mute hover:text-fg'}`}>
      <kbd>{k.toUpperCase()}</kbd>{children}
    </button>
  );
}

export default function Home() {
  const router = useRouter();
  const [mode, setMode] = useState('sprint');
  const [scope, setScope] = useState('all');
  const [len, setLen] = useState(120);

  useEffect(() => {
    try { const s = JSON.parse(localStorage.getItem('setup') || '{}'); s.mode && setMode(s.mode); s.scope && setScope(s.scope); s.len && setLen(s.len); } catch {}
  }, []);

  const start = () => {
    try { localStorage.setItem('setup', JSON.stringify({ mode, scope, len })); } catch {}
    router.push(`/train?mode=${mode}&scope=${scope}&t=${len}`);
  };

  useEffect(() => {
    const on = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const k = e.key.toLowerCase();
      const m = MODES.find((x) => x.k === k), s = SCOPES.find((x) => x.k === k), l = LENS.find((x) => x.k === k);
      if (m) setMode(m.id); else if (s) setScope(s.id); else if (l) setLen(l.v); else if (k === 'enter') start();
    };
    window.addEventListener('keydown', on);
    return () => window.removeEventListener('keydown', on);
  });

  const row = 'grid sm:grid-cols-[120px_1fr] gap-3 sm:gap-6 py-5';
  const label = 'font-mono text-[11px] uppercase tracking-wider text-mute pt-2.5';

  return (
    <div className="py-12 sm:py-20">
      <h1 className="text-3xl sm:text-4xl font-medium tracking-tight max-w-xl leading-[1.15]">
        Arithmetic, business math and quant reasoning. Timed to the millisecond.
      </h1>
      <p className="mt-4 text-mute max-w-lg">Every question ships with the mental route to solve it. Difficulty adapts per sub-skill. No mouse needed.</p>

      <div className="mt-12 border-y border-line divide-y divide-line">
        <div className={row}>
          <div className={label}>Mode</div>
          <div className="grid sm:grid-cols-3 gap-2">
            {MODES.map((m) => (
              <button key={m.id} onClick={() => setMode(m.id)}
                className={`text-left p-3 border transition-colors ${mode === m.id ? 'border-fg bg-panel' : 'border-line hover:border-mute'}`}>
                <div className="flex items-center justify-between text-sm font-medium">{m.name}<kbd>{m.k}</kbd></div>
                <div className="mt-1.5 text-xs text-mute leading-relaxed">{m.desc}</div>
              </button>
            ))}
          </div>
        </div>
        <div className={row}>
          <div className={label}>Scope</div>
          <div className="flex flex-wrap gap-2">
            {SCOPES.map((s) => <Opt key={s.id} k={s.k} on={scope === s.id} off={mode === 'drill'} onClick={() => setScope(s.id)}>{s.name}</Opt>)}
          </div>
        </div>
        <div className={row}>
          <div className={label}>Length</div>
          <div className="flex flex-wrap gap-2">
            {LENS.map((l) => <Opt key={l.v} k={l.k} on={len === l.v} off={mode !== 'sprint'} onClick={() => setLen(l.v)}>{l.name}</Opt>)}
          </div>
        </div>
      </div>

      <button onClick={start} className="mt-8 h-11 px-5 bg-fg text-bg text-sm font-medium flex items-center gap-3 hover:opacity-90">
        Start session <span className="font-mono text-xs opacity-60">↵</span>
      </button>

      <div className="mt-20 grid sm:grid-cols-3 gap-8">
        {(Object.keys(CATS) as Category[]).map((c) => (
          <div key={c}>
            <div className="font-mono text-[11px] uppercase tracking-wider text-mute border-b border-line pb-2">{CATS[c]}</div>
            <ul className="mt-2 text-sm space-y-1">
              {ALL_SKILLS.filter((s) => SKILLS[s].cat === c).map((s) => (
                <li key={s} className="flex justify-between"><span>{SKILLS[s].label}</span><span className="font-mono text-xs text-mute">{(SKILLS[s].ms / 1000).toFixed(1)}s</span></li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <p className="mt-3 font-mono text-[11px] text-mute">Target time at level 1. Each level adds 30%.</p>
    </div>
  );
}

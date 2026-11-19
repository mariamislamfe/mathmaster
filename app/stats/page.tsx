import Link from 'next/link';
import { db, type Row } from '@/lib/db';
import { ALL_SKILLS, CATS, SKILLS } from '@/lib/engine';
import Trend from '@/components/Trend';

export const dynamic = 'force-dynamic';
const TZ = process.env.APP_TZ || 'Africa/Cairo';
const H = ({ children }: { children: React.ReactNode }) => <h2 className="font-mono text-[11px] uppercase tracking-wider text-mute">{children}</h2>;
const day = (d: Date) => d.toISOString().slice(0, 10);

function status(n: number, acc: number, slow: number) {
  if (!n) return { t: '—', c: 'text-mute' };
  if (n < 5) return { t: 'Few data', c: 'text-mute' };
  if (acc >= 90 && slow <= 25) return { t: 'Mastered', c: 'text-ok' };
  if (acc >= 80) return { t: 'Needs speed', c: 'text-warn' };
  return { t: 'Weak', c: 'text-bad' };
}

export default async function Stats() {
  const sql = await db();
  if (!sql) {
    return (
      <div className="py-20 max-w-lg">
        <H>Stats</H>
        <p className="mt-4">No database connected.</p>
        <p className="mt-2 text-sm text-mute">Add your Neon connection string as <code className="font-mono text-fg">DATABASE_URL</code> in <code className="font-mono text-fg">.env.local</code> and restart. Tables are created on first request.</p>
      </div>
    );
  }

  const [heat, trend, skills, vault, tot] = (await Promise.all([
    sql`select to_char(d, 'YYYY-MM-DD') d, count(*)::int n
        from (select (created_at at time zone ${TZ})::date d from question_logs where created_at > now() - interval '200 days') t group by 1`,
    sql`select to_char(d, 'YYYY-MM-DD') d, round(avg(ms))::int ms, round(100 * avg(correct::int))::int acc
        from (select (created_at at time zone ${TZ})::date d, ms, correct from question_logs where created_at > now() - interval '30 days') t
        group by 1 order by 1`,
    sql`select skill, count(*)::int n, round(100 * avg(correct::int))::int acc,
        coalesce(round(avg(ms) filter (where correct)), 0)::int ms, round(100 * avg(slow::int))::int slow,
        (array_agg(level order by created_at desc))[1] lvl
        from question_logs where created_at > now() - interval '60 days' group by skill`,
    sql`select prompt, answer, given, correct, ms, shortcut, skill from question_logs
        where not correct or slow order by created_at desc limit 40`,
    sql`select count(*)::int q, count(distinct session_id)::int s, coalesce(sum(ms) / 60000, 0)::int min,
        coalesce(round(100 * avg(correct::int)), 0)::int acc from question_logs`,
  ])) as Row[][];

  // heatmap: 26 full weeks ending today (in APP_TZ)
  const counts = new Map<string, number>(heat.map((r) => [r.d, r.n]));
  const today = new Date(new Intl.DateTimeFormat('en-CA', { timeZone: TZ }).format(new Date()) + 'T00:00:00Z');
  const start = new Date(today); start.setUTCDate(start.getUTCDate() - 25 * 7 - today.getUTCDay());
  const cells: { d: string; n: number; future: boolean }[] = [];
  for (let x = new Date(start); cells.length < 26 * 7; x.setUTCDate(x.getUTCDate() + 1)) cells.push({ d: day(x), n: counts.get(day(x)) ?? 0, future: x > today });
  const shade = (n: number) => (n === 0 ? 'var(--panel)' : `color-mix(in oklab, var(--acc) ${n < 20 ? 30 : n < 50 ? 55 : n < 100 ? 78 : 100}%, var(--panel))`);
  let streak = 0;
  for (let x = new Date(today), first = true; ; x.setUTCDate(x.getUTCDate() - 1), first = false) {
    if (counts.get(day(x))) streak++; else if (!first) break;
  }

  const bySkill = new Map(skills.map((r) => [r.skill, r]));
  const t = tot[0];

  return (
    <div className="py-10 space-y-14">
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-x-10 gap-y-4">
          {[['Questions', t.q.toLocaleString()], ['Sessions', t.s], ['Minutes', t.min], ['Accuracy', t.acc + '%'], ['Streak', streak + 'd']].map(([k, v]) => (
            <div key={k}><div className="text-[11px] text-mute">{k}</div><div className="mt-1 font-mono text-2xl">{v}</div></div>
          ))}
        </div>
        <Link href="/train?mode=drill" className="h-9 px-4 flex items-center bg-fg text-bg text-sm font-medium hover:opacity-90">Drill weaknesses</Link>
      </div>

      <section>
        <H>Consistency · 26 weeks</H>
        <div className="mt-4 overflow-x-auto">
          <div className="grid grid-flow-col grid-rows-7 gap-[3px] w-max">
            {cells.map((c) => (
              <div key={c.d} title={`${c.d}: ${c.n} questions`} className="size-[11px] sm:size-[13px]"
                style={{ background: c.future ? 'transparent' : shade(c.n) }} />
            ))}
          </div>
        </div>
      </section>

      <section>
        <div className="flex items-center gap-5">
          <H>Speed vs accuracy · 30 days</H>
          <span className="ml-auto flex items-center gap-1.5 text-[11px] text-mute"><i className="w-3 h-px bg-fg" />avg time</span>
          <span className="flex items-center gap-1.5 text-[11px] text-mute"><i className="w-3 h-px bg-acc" />accuracy</span>
        </div>
        <div className="mt-4"><Trend data={trend as { d: string; ms: number; acc: number }[]} /></div>
      </section>

      <section>
        <H>Weakness radar · 60 days</H>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-sm min-w-[560px]">
            <thead>
              <tr className="text-left text-[11px] text-mute border-b border-line">
                <th className="font-normal py-2">Sub-skill</th><th className="font-normal">Level</th><th className="font-normal text-right">Attempts</th>
                <th className="font-normal pl-6 w-[30%]">Accuracy</th><th className="font-normal text-right">Avg speed</th><th className="font-normal text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {ALL_SKILLS.map((s) => {
                const r = bySkill.get(s), n = r?.n ?? 0, st = status(n, r?.acc ?? 0, r?.slow ?? 0);
                return (
                  <tr key={s} className={n ? '' : 'text-mute'}>
                    <td className="py-2.5">{SKILLS[s].label} <span className="text-[11px] text-mute ml-1">{CATS[SKILLS[s].cat]}</span></td>
                    <td className="font-mono">{r ? `L${r.lvl}` : '—'}</td>
                    <td className="font-mono text-right">{n || '—'}</td>
                    <td className="pl-6">
                      {n ? <div className="flex items-center gap-3"><div className="flex-1 h-1 bg-panel"><div className="h-1 bg-fg" style={{ width: `${r!.acc}%` }} /></div><span className="font-mono w-10 text-right">{r!.acc}%</span></div> : '—'}
                    </td>
                    <td className="font-mono text-right">{n && r!.ms ? (r!.ms / 1000).toFixed(2) + 's' : '—'}</td>
                    <td className={`text-right text-xs ${st.c}`}>{st.t}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <H>Mistake & shortcut vault</H>
        {vault.length === 0 ? <p className="mt-4 text-sm text-mute">Empty. Misses and slow answers will collect here.</p> : (
          <ul className="mt-3 divide-y divide-line border-y border-line">
            {vault.map((v, i) => (
              <li key={i} className="py-4 grid sm:grid-cols-[1fr_auto] gap-2">
                <div>
                  <div className="font-mono">{v.prompt} = {v.answer}</div>
                  <div className="mt-1.5 text-sm text-mute leading-relaxed">{v.shortcut}</div>
                </div>
                <div className="font-mono text-xs sm:text-right space-y-1">
                  <div className={v.correct ? 'text-warn' : 'text-bad'}>{v.correct ? 'slow' : 'miss'} · {(v.ms / 1000).toFixed(2)}s</div>
                  <div className="text-mute">{SKILLS[v.skill as keyof typeof SKILLS]?.label}{!v.correct && <> · you: <span className="line-through">{v.given}</span></>}</div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

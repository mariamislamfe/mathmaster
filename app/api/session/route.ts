import { db, type Row } from '@/lib/db';

export async function POST(req: Request) {
  const sql = await db();
  if (!sql) return Response.json({ ok: false, reason: 'no-db' });
  const b = await req.json();
  const logs: Row[] = Array.isArray(b.logs) ? b.logs : [];
  if (!logs.length) return Response.json({ ok: true });
  const [s] = (await sql`insert into sessions (mode, scope, started_at, duration_ms, total, correct)
    values (${b.mode}, ${b.scope}, ${b.startedAt}, ${b.durationMs}, ${logs.length}, ${logs.filter((l) => l.correct).length})
    returning id`) as Row[];
  await sql`insert into question_logs (session_id, created_at, category, skill, level, prompt, answer, given, correct, slow, ms, shortcut)
    select ${s.id}, x.at, x.cat, x.skill, x.level, x.prompt, x.answer, x.given, x.correct, x.slow, x.ms, x.shortcut
    from jsonb_to_recordset(${JSON.stringify(logs)}::jsonb)
      as x(at timestamptz, cat text, skill text, level int, prompt text, answer text, given text, correct boolean, slow boolean, ms int, shortcut text)`;
  const states: Row[] = Array.isArray(b.states) ? b.states : [];
  if (states.length) {
    await sql`insert into skill_state (skill, level, streak, misses)
      select x.skill, x.level, x.streak, x.misses from jsonb_to_recordset(${JSON.stringify(states)}::jsonb) as x(skill text, level int, streak int, misses int)
      on conflict (skill) do update set level = excluded.level, streak = excluded.streak, misses = excluded.misses, updated_at = now()`;
  }
  return Response.json({ ok: true, id: s.id });
}

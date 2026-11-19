import { db, type Row } from '@/lib/db';
export const dynamic = 'force-dynamic';

// Current adaptive level per skill + the three weakest skills (last 30 days, min 5 attempts).
export async function GET() {
  const sql = await db();
  if (!sql) return Response.json({ db: false, states: {}, weak: [] });
  const [st, wk] = (await Promise.all([
    sql`select skill, level, streak, misses from skill_state`,
    sql`select skill from question_logs where created_at > now() - interval '30 days'
        group by skill having count(*) >= 5
        order by avg(correct::int) - 0.5 * avg(slow::int) asc limit 3`,
  ])) as Row[][];
  return Response.json({ db: true, states: Object.fromEntries(st.map((r) => [r.skill, { level: r.level, streak: r.streak, misses: r.misses }])), weak: wk.map((r) => r.skill) });
}

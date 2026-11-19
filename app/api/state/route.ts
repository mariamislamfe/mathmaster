import { db, type Row } from '@/lib/db';
export const dynamic = 'force-dynamic';

// Current adaptive level per skill + the three weakest skills (last 30 days, min 5 attempts).
export async function GET() {
  const sql = await db();
  if (!sql) return Response.json({ db: false, levels: {}, weak: [] });
  const [lv, wk] = (await Promise.all([
    sql`select distinct on (skill) skill, level from question_logs order by skill, created_at desc`,
    sql`select skill from question_logs where created_at > now() - interval '30 days'
        group by skill having count(*) >= 5
        order by avg(correct::int) - 0.5 * avg(slow::int) asc limit 3`,
  ])) as Row[][];
  return Response.json({ db: true, levels: Object.fromEntries(lv.map((r) => [r.skill, r.level])), weak: wk.map((r) => r.skill) });
}

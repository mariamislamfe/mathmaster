import { neon, type NeonQueryFunction } from '@neondatabase/serverless';

// Neon schema — applied idempotently on first request.
export const SCHEMA = [
  `create table if not exists sessions (
    id serial primary key,
    mode text not null,               -- sprint | practice | drill
    scope text,                       -- all | arithmetic | business | logic | drill
    started_at timestamptz not null default now(),
    duration_ms int,
    total int not null default 0,
    correct int not null default 0
  )`,
  `create table if not exists question_logs (
    id bigserial primary key,
    session_id int references sessions(id) on delete cascade,
    created_at timestamptz not null default now(),
    category text not null,
    skill text not null,
    level int not null,
    prompt text not null,
    answer text not null,
    given text,
    correct boolean not null,
    slow boolean not null,
    ms int not null,
    shortcut text
  )`,
  `create table if not exists skill_state (
    skill text primary key,
    level int not null default 1,
    streak int not null default 0,     -- quick correct answers in a row
    misses int not null default 0,     -- misses in a row
    updated_at timestamptz not null default now()
  )`,
  `create index if not exists ql_skill_time on question_logs (skill, created_at desc)`,
  `create index if not exists ql_time on question_logs (created_at)`,
];

type Sql = NeonQueryFunction<false, false>;
export type Row = Record<string, any>;
let ready: Promise<Sql> | null = null;

export function db(): Promise<Sql | null> {
  const url = process.env.DATABASE_URL;
  if (!url) return Promise.resolve(null);
  ready ??= (async () => {
    const sql = neon(url);
    for (const s of SCHEMA) await sql.query(s);
    return sql;
  })().catch((e) => { ready = null; throw e; });
  return ready as Promise<Sql>;
}

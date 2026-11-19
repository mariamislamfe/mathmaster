import Trainer from '@/components/Trainer';

export default async function Train({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const p = await searchParams;
  const mode = p.mode === 'practice' || p.mode === 'drill' ? p.mode : 'sprint';
  const secs = mode === 'drill' ? 300 : Math.min(600, Math.max(30, Number(p.t) || 120));
  return <Trainer mode={mode} scope={mode === 'drill' ? 'drill' : p.scope || 'all'} secs={secs} />;
}

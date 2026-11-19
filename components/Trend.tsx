'use client';
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

const tick = { fill: 'var(--mute)', fontSize: 11, fontFamily: 'JetBrains Mono, monospace' };

export default function Trend({ data }: { data: { d: string; ms: number; acc: number }[] }) {
  if (!data.length) return <p className="py-16 text-sm text-mute">No sessions in the last 30 days.</p>;
  return (
    <div className="h-64">
      <ResponsiveContainer>
        <LineChart data={data} margin={{ top: 8, right: 0, left: -12, bottom: 0 }}>
          <CartesianGrid stroke="var(--line)" vertical={false} />
          <XAxis dataKey="d" tick={tick} tickLine={false} axisLine={{ stroke: 'var(--line)' }} tickFormatter={(d: string) => d.slice(5)} minTickGap={24} />
          <YAxis yAxisId="ms" tick={tick} tickLine={false} axisLine={false} tickFormatter={(v: number) => (v / 1000).toFixed(1) + 's'} />
          <YAxis yAxisId="acc" orientation="right" domain={[0, 100]} tick={tick} tickLine={false} axisLine={false} tickFormatter={(v: number) => v + '%'} />
          <Tooltip
            cursor={{ stroke: 'var(--line)' }}
            contentStyle={{ background: 'var(--panel)', border: '1px solid var(--line)', borderRadius: 0, fontSize: 12, fontFamily: 'JetBrains Mono, monospace' }}
            labelStyle={{ color: 'var(--mute)' }}
            formatter={(v: any, n: any) => (n === 'ms' ? [(v / 1000).toFixed(2) + 's', 'avg time'] : [v + '%', 'accuracy'])}
          />
          <Line yAxisId="ms" dataKey="ms" stroke="var(--fg)" strokeWidth={1.5} dot={false} isAnimationActive={false} />
          <Line yAxisId="acc" dataKey="acc" stroke="var(--acc)" strokeWidth={1.5} dot={false} isAnimationActive={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

import { motion, useSpring, useTransform } from 'framer-motion';
import { useEffect } from 'react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, AreaChart, Area } from 'recharts';
import { fmtTime, type HistPoint, type Severity } from '../sim/model';

/** Número com atualização suave. */
export function Num({ v, d = 1 }: { v: number; d?: number }) {
  const spring = useSpring(v, { stiffness: 90, damping: 20 });
  useEffect(() => spring.set(v), [v, spring]);
  const txt = useTransform(spring, (x) => (Number.isFinite(x) ? x.toLocaleString('pt-BR', { minimumFractionDigits: d, maximumFractionDigits: d }) : '—'));
  return <motion.span>{txt}</motion.span>;
}

export const fmt = (v: number, d = 1) => v.toLocaleString('pt-BR', { minimumFractionDigits: d, maximumFractionDigits: d });

export function Kpi({ l, v, u, d = 1, s, cls }: { l: string; v: number | string; u?: string; d?: number; s?: React.ReactNode; cls?: string }) {
  return (
    <div className="kpi">
      <div className="l">{l}</div>
      <div className={'v ' + (cls ?? '')}>
        {typeof v === 'number' ? <Num v={v} d={d} /> : v}
        {u && <small>{u}</small>}
      </div>
      {s && <div className="s">{s}</div>}
    </div>
  );
}

export const sevLabel: Record<Severity, string> = { crit: 'CRÍTICO', warn: 'ADVERTÊNCIA', info: 'INFO' };

export function Panel({ title, right, children, className, bodyClass }: { title: React.ReactNode; right?: React.ReactNode; children: React.ReactNode; className?: string; bodyClass?: string }) {
  return (
    <section className={'panel ' + (className ?? '')}>
      <div className="panel-h">
        {title}
        <span className="grow" />
        {right}
      </div>
      <div className={bodyClass ?? 'panel-b'}>{children}</div>
    </section>
  );
}

const axis = { stroke: '#6f8599', fontSize: 10.5, fontFamily: 'IBM Plex Mono' };
const tip = {
  contentStyle: { background: '#0c1d2f', border: '1px solid #27445f', fontSize: 11.5, fontFamily: 'IBM Plex Mono', borderRadius: 0 },
  labelStyle: { color: '#9eb2c4' },
};

export function TrendChart({
  data,
  series,
  height = 200,
  unit = '',
  domain,
  area,
}: {
  data: HistPoint[];
  series: { k: string; n: string; c: string; dash?: string }[];
  height?: number;
  unit?: string;
  domain?: [number | string, number | string];
  area?: boolean;
}) {
  const C = area ? AreaChart : LineChart;
  return (
    <ResponsiveContainer width="100%" height={height}>
      <C data={data} margin={{ top: 6, right: 10, left: -8, bottom: 0 }}>
        <CartesianGrid stroke="#1d3650" strokeDasharray="2 4" vertical={false} />
        <XAxis dataKey="t" tickFormatter={(t) => fmtTime(t).slice(-8, -3)} {...axis} minTickGap={40} />
        <YAxis {...axis} domain={domain ?? ['auto', 'auto']} unit={unit} width={56} tickFormatter={(v) => (Math.abs(v) >= 1000 ? `${(v / 1000).toFixed(0)}k` : fmt(v, Math.abs(v) < 100 ? 1 : 0))} />
        <Tooltip {...tip} labelFormatter={(t) => fmtTime(Number(t))} formatter={(v: number) => fmt(v, Math.abs(v) < 100 ? 2 : 0)} />
        <Legend wrapperStyle={{ fontSize: 11, color: '#9eb2c4' }} iconType="plainline" />
        {series.map((s) =>
          area ? (
            <Area key={s.k} type="monotone" dataKey={s.k} name={s.n} stroke={s.c} fill={s.c} fillOpacity={0.1} strokeWidth={1.6} isAnimationActive={false} dot={false} strokeDasharray={s.dash} />
          ) : (
            <Line key={s.k} type="monotone" dataKey={s.k} name={s.n} stroke={s.c} strokeWidth={1.6} isAnimationActive={false} dot={false} strokeDasharray={s.dash} />
          ),
        )}
      </C>
    </ResponsiveContainer>
  );
}

export const SECTOR_COLORS = ['#36c5df', '#0088cc', '#8fd3a8', '#f2b632', '#ff8a3d', '#c59cff'];

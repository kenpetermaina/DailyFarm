import { ResponsiveContainer, AreaChart, Area, BarChart, Bar, Cell, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import { BarChart3 } from 'lucide-react';
import { EmptyState } from './ui';

const DARK = '#064E32';
const MID = '#16834A';
const SOFT = '#7CC59B';
const AXIS = { fontSize: 12, fill: '#718078' };
const fmt = (v) => [`${Number(v).toLocaleString('en-GB', { maximumFractionDigits: 2 })} L`, 'Milk'];

function Empty() {
  return <EmptyState icon={BarChart3} title="No milk recorded for this period">Record milk to see the graph.</EmptyState>;
}
const hasData = (data, key = 'total') => data.some((d) => Number(d[key]) > 0);

export function TrendChart({ data, height = 300 }) {
  if (!hasData(data)) return <Empty />;
  return (
    <div className="chart-box" style={{ height }}>
      <ResponsiveContainer>
        <AreaChart data={data} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
          <defs>
            <linearGradient id="gMilk" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={MID} stopOpacity={0.28} />
              <stop offset="100%" stopColor={MID} stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#E6ECE8" vertical={false} />
          <XAxis dataKey="label" tick={AXIS} tickLine={false} axisLine={false} minTickGap={18} />
          <YAxis tick={AXIS} tickLine={false} axisLine={false} unit=" L" />
          <Tooltip formatter={fmt} labelStyle={{ fontWeight: 600 }} />
          <Area isAnimationActive={false} type="monotone" dataKey="total" stroke={MID} strokeWidth={2.5} fill="url(#gMilk)" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export function BarsChart({ data, xKey = 'label', yKey = 'total', height = 280, color = MID, highlightLast = false }) {
  if (!hasData(data, yKey)) return <Empty />;
  return (
    <div className="chart-box" style={{ height }}>
      <ResponsiveContainer>
        <BarChart data={data} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#E6ECE8" vertical={false} />
          <XAxis dataKey={xKey} tick={AXIS} tickLine={false} axisLine={false} interval={0} height={36} />
          <YAxis tick={AXIS} tickLine={false} axisLine={false} unit=" L" />
          <Tooltip formatter={fmt} cursor={{ fill: 'rgba(22,131,74,0.06)' }} />
          <Bar isAnimationActive={false} dataKey={yKey} radius={[8, 8, 0, 0]} fill={color}>
            {highlightLast && data.map((_, i) => <Cell key={i} fill={i === data.length - 1 ? DARK : color} />)}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function SessionChart({ totals }) {
  const data = [
    { label: 'Morning', total: totals.MORNING, fill: DARK },
    { label: 'Lunch', total: totals.LUNCH, fill: MID },
    { label: 'Evening', total: totals.EVENING, fill: SOFT },
  ];
  if (!hasData(data)) return <Empty />;
  return (
    <div className="chart-box short">
      <ResponsiveContainer>
        <BarChart data={data} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#E6ECE8" vertical={false} />
          <XAxis dataKey="label" tick={AXIS} tickLine={false} axisLine={false} />
          <YAxis tick={AXIS} tickLine={false} axisLine={false} unit=" L" />
          <Tooltip formatter={fmt} cursor={{ fill: 'rgba(22,131,74,0.06)' }} />
          <Bar isAnimationActive={false} dataKey="total" radius={[8, 8, 0, 0]}>
            {data.map((d) => <Cell key={d.label} fill={d.fill} />)}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function CowChart({ cows }) {
  const data = cows.slice(0, 12).map((c) => ({ label: c.name, total: c.total }));
  return <BarsChart data={data} height={280} />;
}

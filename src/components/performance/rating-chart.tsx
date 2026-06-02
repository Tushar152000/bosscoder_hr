'use client';

import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

export interface RatingPoint {
  label: string;
  rating: number | null;
}

interface Props {
  data: RatingPoint[];
  averageLine?: number | null;
  height?: number;
}

export function RatingChart({ data, averageLine = null, height = 280 }: Props) {
  if (data.every((d) => d.rating == null)) {
    return (
      <div
        className="flex items-center justify-center rounded-lg border border-dashed border-[#E2E8F0] text-[12px] text-slate-400"
        style={{ height }}
      >
        No rating history yet — finalize a manager evaluation to see the trend.
      </div>
    );
  }

  return (
    <div style={{ width: '100%', height }}>
      <ResponsiveContainer>
        <AreaChart data={data} margin={{ top: 16, right: 16, left: 0, bottom: 8 }}>
          <defs>
            <linearGradient id="ratingGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#0C447C" stopOpacity={0.15} />
              <stop offset="100%" stopColor="#0C447C" stopOpacity={0.01} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="rgba(0,0,0,0.06)" vertical={false} />
          <XAxis
            dataKey="label"
            stroke="#94a3b8"
            fontSize={11}
            tickLine={false}
            axisLine={{ stroke: 'rgba(0,0,0,0.08)' }}
          />
          <YAxis
            domain={[1, 5]}
            ticks={[1, 2, 3, 4, 5]}
            reversed
            stroke="#94a3b8"
            fontSize={11}
            tickLine={false}
            axisLine={false}
            width={28}
          />
          <Tooltip
            cursor={{ stroke: 'rgba(0,0,0,0.08)', strokeWidth: 1 }}
            contentStyle={{
              background: '#fff',
              border: '1px solid #E2E8F0',
              borderRadius: 8,
              color: '#1e293b',
              fontSize: 12,
            }}
            labelStyle={{ color: '#64748b' }}
            formatter={(value) => {
              if (typeof value === 'number') return [`${value.toFixed(2)} / 5`, 'Rating'];
              if (typeof value === 'string') return [value, ''];
              return ['—', ''];
            }}
          />
          {averageLine != null && (
            <ReferenceLine
              y={averageLine}
              stroke="#0F6E56"
              strokeDasharray="4 4"
              strokeOpacity={0.7}
              label={{
                value: `Avg ${averageLine.toFixed(1)}`,
                position: 'right',
                fill: '#0F6E56',
                fontSize: 10,
              }}
            />
          )}
          <Area
            type="monotone"
            dataKey="rating"
            stroke="#0C447C"
            strokeWidth={2}
            fill="url(#ratingGradient)"
            dot={{ r: 3.5, fill: '#0C447C', strokeWidth: 0 }}
            activeDot={{ r: 5, fill: '#0C447C', stroke: '#fff', strokeWidth: 2 }}
            connectNulls
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

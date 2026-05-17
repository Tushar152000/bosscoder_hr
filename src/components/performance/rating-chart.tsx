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
  /** X-axis label (e.g. "Apr 26", "Q2 26"). */
  label: string;
  /** 1–5; null = no data for this period. */
  rating: number | null;
}

interface Props {
  data: RatingPoint[];
  /** Optional reference line — e.g. team or company average. */
  averageLine?: number | null;
  /** Height in px. */
  height?: number;
}

export function RatingChart({ data, averageLine = null, height = 280 }: Props) {
  // Convert nulls to gaps in the chart by filtering out non-numeric ratings —
  // recharts renders the gap correctly when a Y value is null, so we keep
  // the original array.
  if (data.every((d) => d.rating == null)) {
    return (
      <div
        className="flex items-center justify-center rounded-lg border border-dashed border-default text-sm text-muted"
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
              <stop offset="0%" stopColor="rgb(99,91,255)" stopOpacity={0.45} />
              <stop offset="100%" stopColor="rgb(99,91,255)" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="rgba(255,255,255,0.05)" vertical={false} />
          <XAxis
            dataKey="label"
            stroke="rgb(148,158,187)"
            fontSize={11}
            tickLine={false}
            axisLine={{ stroke: 'rgba(255,255,255,0.08)' }}
          />
          <YAxis
            domain={[1, 5]}
            ticks={[1, 2, 3, 4, 5]}
            stroke="rgb(148,158,187)"
            fontSize={11}
            tickLine={false}
            axisLine={false}
            width={28}
          />
          <Tooltip
            cursor={{ stroke: 'rgba(255,255,255,0.1)', strokeWidth: 1 }}
            contentStyle={{
              background: 'rgb(20 26 53)',
              border: '1px solid rgb(33 41 71)',
              borderRadius: 8,
              color: '#e8ebf5',
              fontSize: 12,
            }}
            labelStyle={{ color: '#94a0c2' }}
            formatter={(value) => {
              if (typeof value === 'number') return [`${value.toFixed(2)} / 5`, 'Rating'];
              if (typeof value === 'string') return [value, ''];
              return ['—', ''];
            }}
          />
          {averageLine != null && (
            <ReferenceLine
              y={averageLine}
              stroke="rgb(34,197,94)"
              strokeDasharray="4 4"
              strokeOpacity={0.7}
              label={{
                value: `Avg ${averageLine.toFixed(1)}`,
                position: 'right',
                fill: 'rgb(74,222,128)',
                fontSize: 10,
              }}
            />
          )}
          <Area
            type="monotone"
            dataKey="rating"
            stroke="rgb(126,133,255)"
            strokeWidth={2.25}
            fill="url(#ratingGradient)"
            dot={{ r: 3.5, fill: 'rgb(126,133,255)', strokeWidth: 0 }}
            activeDot={{ r: 5, fill: 'rgb(149,158,255)', stroke: 'rgb(20,26,53)', strokeWidth: 2 }}
            connectNulls
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

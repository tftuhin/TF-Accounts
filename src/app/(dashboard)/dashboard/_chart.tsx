"use client";

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from "recharts";

interface ChartRow { name: string; Income: number; Expenses: number; Profit: number }

export function PerformanceChart({ data }: { data: ChartRow[] }) {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={data} margin={{ top: 4, right: 16, left: 0, bottom: 4 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#D1D9E6" />
        <XAxis dataKey="name" tick={{ fill: "#7E8EA3", fontSize: 12 }} axisLine={false} tickLine={false} />
        <YAxis
          tick={{ fill: "#7E8EA3", fontSize: 11 }} axisLine={false} tickLine={false}
          tickFormatter={(v: number) => v >= 1000 ? `$${(v / 1000).toFixed(0)}k` : `$${v}`}
        />
        <Tooltip
          contentStyle={{ background: "#FFFFFF", border: "1px solid #D1D9E6", borderRadius: 8, boxShadow: "0 4px 12px rgba(0,0,0,0.08)" }}
          labelStyle={{ color: "#0D1117", fontWeight: 600 }}
          formatter={(value: number) => [`$${value.toLocaleString()}`, undefined]}
        />
        <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12, color: "#5B6B82" }} />
        <Bar dataKey="Income" fill="#10B981" radius={[4, 4, 0, 0]} />
        <Bar dataKey="Expenses" fill="#EF4444" radius={[4, 4, 0, 0]} />
        <Bar dataKey="Profit" fill="#8B5CF6" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

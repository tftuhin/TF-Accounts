"use client";

import {
  BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer,
  LineChart, Line, CartesianGrid, Area, AreaChart, ComposedChart
} from "recharts";
import { cn } from "@/lib/utils";

interface SubBrandChartData {
  entityName: string;
  entityColor: string;
  monthlyData: { month: string; income: number; expenses: number }[];
}

interface SubBrandChartsProps {
  data: SubBrandChartData[];
}

export function SubBrandCharts({ data }: SubBrandChartsProps) {
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold text-ink-white">Sub-Brand Performance</h3>
          <p className="text-xs text-ink-muted mt-0.5">Monthly income vs expenses by entity</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {data.map((entity) => (
          <div key={entity.entityName} className="card overflow-hidden">
            <div className="card-header flex items-center gap-2.5">
              <div
                className="w-2.5 h-2.5 rounded-full"
                style={{ background: entity.entityColor }}
              />
              <span className="text-sm font-semibold text-ink-white">{entity.entityName}</span>
            </div>
            <div className="p-4">
              <ResponsiveContainer width="100%" height={220}>
                <ComposedChart data={entity.monthlyData} margin={{ top: 5, right: 5, bottom: 5, left: -15 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#2A3140" />
                  <XAxis
                    dataKey="month"
                    tick={{ fill: "#7D8A9B", fontSize: 11 }}
                    axisLine={{ stroke: "#2A3140" }}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fill: "#7D8A9B", fontSize: 10 }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
                  />
                  <Tooltip
                    contentStyle={{
                      background: "#131920",
                      border: "1px solid #2A3140",
                      borderRadius: 8,
                      fontSize: 12,
                      color: "#CBD5E1",
                    }}
                    formatter={(value: number) => [`$${value.toLocaleString()}`, undefined]}
                  />
                  <Legend
                    iconType="circle"
                    iconSize={6}
                    wrapperStyle={{ fontSize: 11, color: "#7D8A9B" }}
                  />
                  <Area
                    type="monotone"
                    dataKey="income"
                    fill={`${entity.entityColor}15`}
                    stroke={entity.entityColor}
                    strokeWidth={2}
                    name="Income"
                  />
                  <Bar
                    dataKey="expenses"
                    fill="#EF4444"
                    fillOpacity={0.6}
                    radius={[3, 3, 0, 0]}
                    barSize={20}
                    name="Expenses"
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Consolidated comparison bar chart
export function ConsolidatedComparisonChart({
  data,
}: {
  data: { name: string; income: number; expenses: number; color: string }[];
}) {
  return (
    <div className="card overflow-hidden">
      <div className="card-header">
        <h3 className="text-sm font-semibold text-ink-white">Revenue Comparison</h3>
        <p className="text-2xs text-ink-muted mt-0.5">All entities · Current period</p>
      </div>
      <div className="p-4">
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={data} margin={{ top: 5, right: 5, bottom: 5, left: -15 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#2A3140" />
            <XAxis
              dataKey="name"
              tick={{ fill: "#7D8A9B", fontSize: 11 }}
              axisLine={{ stroke: "#2A3140" }}
              tickLine={false}
            />
            <YAxis
              tick={{ fill: "#7D8A9B", fontSize: 10 }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
            />
            <Tooltip
              contentStyle={{
                background: "#131920",
                border: "1px solid #2A3140",
                borderRadius: 8,
                fontSize: 12,
              }}
              formatter={(value: number) => [`$${value.toLocaleString()}`, undefined]}
            />
            <Legend iconType="circle" iconSize={6} wrapperStyle={{ fontSize: 11 }} />
            <Bar dataKey="income" fill="#10B981" radius={[4, 4, 0, 0]} name="Income" />
            <Bar dataKey="expenses" fill="#EF4444" fillOpacity={0.7} radius={[4, 4, 0, 0]} name="Expenses" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

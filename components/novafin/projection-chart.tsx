"use client"

import { Area, AreaChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"
import { type Fila, fmt, monthLabel } from "@/lib/finance"

export function ProjectionChart({ proyeccion }: { proyeccion: Fila[] }) {
  const data = proyeccion.map((f) => ({
    label: monthLabel(f.mes),
    Ahorro: Math.round(f.ahorroAcumulado * 100) / 100,
    Gastos: Math.round(f.gastosAcumulado * 100) / 100,
  }))

  const interval = data.length > 14 ? Math.ceil(data.length / 8) : 0

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer>
        <AreaChart data={data} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
          <defs>
            <linearGradient id="gAhorro" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--color-ahorro)" stopOpacity={0.35} />
              <stop offset="100%" stopColor="var(--color-ahorro)" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="gGastos" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--color-gastos)" stopOpacity={0.35} />
              <stop offset="100%" stopColor="var(--color-gastos)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ fill: "var(--color-muted-foreground)", fontSize: 11 }}
            axisLine={{ stroke: "var(--color-border)" }}
            tickLine={false}
            minTickGap={25}
          />
          <YAxis
            tick={{ fill: "var(--color-muted-foreground)", fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            width={56}
            tickFormatter={(v) => `$${Number(v).toLocaleString("es-EC")}`}
          />
          <Tooltip
            contentStyle={{
              background: "var(--color-popover)",
              border: "1px solid var(--color-border)",
              borderRadius: 10,
              fontSize: 12,
              color: "var(--color-popover-foreground)",
            }}
            labelStyle={{ color: "var(--color-foreground)", fontWeight: 600 }}
            formatter={(v: number, name: string) => [`$${fmt(v)}`, name]}
          />
          <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
          <Area type="monotone" dataKey="Ahorro" stroke="var(--color-ahorro)" strokeWidth={2} fill="url(#gAhorro)" />
          <Area type="monotone" dataKey="Gastos" stroke="var(--color-gastos)" strokeWidth={2} fill="url(#gGastos)" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}

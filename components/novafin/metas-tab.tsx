"use client"

import { type Dispatch, type SetStateAction, useState } from "react"
import { Plus, Sparkles, Target, Trash2 } from "lucide-react"
import {
  type Config,
  type Fila,
  type GastosPorMes,
  type Meta,
  type Prioridad,
  PRIORIDADES,
  fmt,
  generarProyeccion,
  monthLabel,
  primerMesQueAlcanza,
  uid,
} from "@/lib/finance"
import { Field, MoneyInput, Panel, TextInput } from "./ui-kit"
import { cn } from "@/lib/utils"

const PRIORIDAD_STYLE: Record<Prioridad, string> = {
  Alta: "border-destructive/40 bg-destructive/10 text-destructive",
  Media: "border-primary/40 bg-primary/10 text-primary",
  Baja: "border-accent/40 bg-accent/10 text-accent",
}

export function MetasTab({
  config,
  proyeccion,
  metas,
  setMetas,
  gastosPorMes,
}: {
  config: Config
  proyeccion: Fila[]
  metas: Meta[]
  setMetas: Dispatch<SetStateAction<Meta[]>>
  gastosPorMes: GastosPorMes
}) {
  const [nueva, setNueva] = useState<{ nombre: string; categoria: string; precio: string; prioridad: Prioridad }>({
    nombre: "",
    categoria: "",
    precio: "",
    prioridad: "Media",
  })
  const [seleccion, setSeleccion] = useState<string[]>([])

  const agregar = () => {
    if (!nueva.nombre.trim() || !Number(nueva.precio)) return
    setMetas((prev) => [
      ...prev,
      {
        id: uid(),
        nombre: nueva.nombre.trim(),
        categoria: nueva.categoria.trim(),
        precio: Number(nueva.precio),
        prioridad: nueva.prioridad,
        comprado: false,
        mesComprado: null,
      },
    ])
    setNueva({ nombre: "", categoria: "", precio: "", prioridad: "Media" })
  }

  const borrar = (id: string) => {
    setMetas((prev) => prev.filter((m) => m.id !== id))
    setSeleccion((prev) => prev.filter((x) => x !== id))
  }

  const toggleComprado = (id: string) => {
    setMetas((prev) =>
      prev.map((m) => {
        if (m.id !== id) return m
        if (m.comprado) return { ...m, comprado: false, mesComprado: null }
        const proy = generarProyeccion(
          config,
          gastosPorMes,
          prev.filter((x) => x.id !== id || !x.comprado),
        )
        return { ...m, comprado: true, mesComprado: primerMesQueAlcanza(proy, m.precio) || config.mesInicio }
      }),
    )
  }

  const cambiarMes = (id: string, mes: string) =>
    setMetas((prev) => prev.map((m) => (m.id === id ? { ...m, mesComprado: mes } : m)))

  const toggleSim = (id: string) =>
    setSeleccion((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))

  const totalSim = metas
    .filter((m) => seleccion.includes(m.id) && !m.comprado)
    .reduce((s, m) => s + m.precio, 0)
  const mesSim = primerMesQueAlcanza(proyeccion, totalSim)

  return (
    <div className="space-y-6">
      {/* Add form */}
      <Panel>
        <div className="mb-4 flex items-center gap-2">
          <Target className="size-4 text-primary" />
          <span className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Nueva meta</span>
        </div>
        <div className="flex flex-wrap items-end gap-3">
          <Field label="Artículo" className="min-w-[180px] flex-1">
            <TextInput
              value={nueva.nombre}
              onChange={(v) => setNueva({ ...nueva, nombre: v })}
              placeholder="ej. Moto XYZ"
              onEnter={agregar}
            />
          </Field>
          <Field label="Categoría" className="w-36">
            <TextInput
              value={nueva.categoria}
              onChange={(v) => setNueva({ ...nueva, categoria: v })}
              placeholder="opcional"
              onEnter={agregar}
            />
          </Field>
          <Field label="Precio" className="w-32">
            <MoneyInput value={nueva.precio} onChange={(v) => setNueva({ ...nueva, precio: v })} placeholder="0.00" onEnter={agregar} />
          </Field>
          <Field label="Prioridad" className="w-32">
            <select
              value={nueva.prioridad}
              onChange={(e) => setNueva({ ...nueva, prioridad: e.target.value as Prioridad })}
              className="w-full rounded-lg border border-input bg-background/60 px-3 py-2 text-sm text-foreground outline-none focus:border-ring focus:ring-2 focus:ring-ring/30"
            >
              {PRIORIDADES.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </Field>
          <button
            type="button"
            onClick={agregar}
            className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
          >
            <Plus className="size-4" />
            Añadir
          </button>
        </div>
      </Panel>

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full text-sm min-w-[700px]">
          <thead>
            <tr className="border-b border-border text-left text-[11px] text-muted-foreground">
              <th className="px-3 py-2.5 font-medium">Sim.</th>
              <th className="px-3 py-2.5 font-medium">Artículo</th>
              <th className="px-3 py-2.5 font-medium">Categoría</th>
              <th className="px-3 py-2.5 font-medium">Prioridad</th>
              <th className="px-3 py-2.5 text-right font-medium">Precio</th>
              <th className="px-3 py-2.5 font-medium">Comprado</th>
              <th className="px-3 py-2.5 font-medium">Mes</th>
              <th className="px-3 py-2.5" />
            </tr>
          </thead>
          <tbody className="divide-y divide-border/60">
            {metas.map((m) => {
              const mesAlcance = !m.comprado ? primerMesQueAlcanza(proyeccion, m.precio) : null
              return (
                <tr key={m.id} className={cn("transition-colors hover:bg-secondary/30", m.comprado && "opacity-60")}>
                  <td className="px-3 py-2.5">
                    {!m.comprado && (
                      <input
                        type="checkbox"
                        checked={seleccion.includes(m.id)}
                        onChange={() => toggleSim(m.id)}
                        aria-label={`Simular ${m.nombre}`}
                        className="size-4 accent-[var(--color-accent)]"
                      />
                    )}
                  </td>
                  <td className="px-3 py-2.5">
                    <div className={cn("text-foreground", m.comprado && "line-through")}>{m.nombre}</div>
                    {mesAlcance && <div className="text-xs text-primary">alcanzable en {monthLabel(mesAlcance)}</div>}
                  </td>
                  <td className="px-3 py-2.5 text-muted-foreground">{m.categoria || "—"}</td>
                  <td className="px-3 py-2.5">
                    <span className={cn("rounded-md border px-2 py-0.5 text-xs font-medium", PRIORIDAD_STYLE[m.prioridad])}>
                      {m.prioridad}
                    </span>
                  </td>
                  <td className="px-3 py-2.5">
                    <MoneyInput
                      className="w-28 ml-auto"
                      value={m.precio || ""}
                      onChange={(v) => {
                         setMetas(prev => prev.map(x => x.id === m.id ? { ...x, precio: Number(v) || 0 } : x))
                      }}
                      placeholder="0.00"
                    />
                  </td>
                  <td className="px-3 py-2.5">
                    <input
                      type="checkbox"
                      checked={m.comprado}
                      onChange={() => toggleComprado(m.id)}
                      aria-label={`Marcar ${m.nombre} como comprado`}
                      className="size-4 accent-[var(--color-primary)]"
                    />
                  </td>
                  <td className="px-3 py-2.5">
                    {m.comprado ? (
                      <select
                        value={m.mesComprado || ""}
                        onChange={(e) => cambiarMes(m.id, e.target.value)}
                        className="rounded-lg border border-input bg-background px-2 py-1 text-xs capitalize text-foreground outline-none focus:border-ring"
                      >
                        {proyeccion.map((f) => (
                          <option key={f.mes} value={f.mes}>
                            {f.label}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="px-3 py-2.5 text-right">
                    <button
                      type="button"
                      onClick={() => borrar(m.id)}
                      aria-label={`Quitar ${m.nombre}`}
                      className="text-muted-foreground transition-colors hover:text-destructive"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </td>
                </tr>
              )
            })}
            {metas.length === 0 && (
              <tr>
                <td colSpan={8} className="px-3 py-10 text-center text-sm text-muted-foreground">
                  Todavía no has añadido artículos a tu lista de metas.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Simulator */}
      {seleccion.length > 0 && (
        <div className="flex items-start gap-3 rounded-xl border border-accent/30 bg-accent/5 px-4 py-3">
          <Sparkles className="mt-0.5 size-5 shrink-0 text-accent" />
          <p className="text-sm leading-relaxed text-foreground">
            Combo seleccionado: <strong className="tnum">${fmt(totalSim)}</strong> —{" "}
            {mesSim ? (
              <>
                lo tendrías cubierto en <strong className="text-accent">{monthLabel(mesSim, true)}</strong>.
              </>
            ) : (
              <>
                fuera del rango proyectado ({config.mesesAProyectar} meses) — amplía la proyección en Configuración.
              </>
            )}
          </p>
        </div>
      )}
    </div>
  )
}

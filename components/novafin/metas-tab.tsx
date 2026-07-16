"use client"

import { type Dispatch, type SetStateAction, useState, Fragment } from "react"
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
  precioEfectivoMeta,
  uid,
  type WishlistItem,
  type MetaTipo,
} from "@/lib/finance"
import { Field, MoneyInput, Panel, TextInput, parseDecimal, Segmented } from "./ui-kit"
import { cn } from "@/lib/utils"

const PRIORIDAD_STYLE: Record<Prioridad, string> = {
  Alta: "border-destructive/40 bg-destructive/10 text-destructive",
  Media: "border-primary/40 bg-primary/10 text-primary",
  Baja: "border-accent/40 bg-accent/10 text-accent",
}

function markMetaComprada(
  meta: Meta,
  allMetas: Meta[],
  config: Config,
  gastosPorMes: GastosPorMes,
): Meta {
  if (meta.comprado) return { ...meta, comprado: false, mesComprado: null }
  const proy = generarProyeccion(
    config,
    gastosPorMes,
    allMetas.filter((x) => x.id !== meta.id || !x.comprado),
  )
  return {
    ...meta,
    comprado: true,
    mesComprado: primerMesQueAlcanza(proy, meta.precio) || config.mesInicio,
  }
}

function WishlistGroupEditor({ meta, updateMeta }: { meta: Meta; updateMeta: (m: Meta) => void }) {
  const [nuevoItem, setNuevoItem] = useState<{ nombre: string; precio: string; prioridad: Prioridad; link: string }>({
    nombre: "",
    precio: "",
    prioridad: "Media",
    link: "",
  })

  const agregarItem = () => {
    const p = parseDecimal(nuevoItem.precio)
    if (!nuevoItem.nombre.trim() || !p) return
    const items = [...(meta.items || []), {
      id: uid(),
      nombre: nuevoItem.nombre.trim(),
      precio: p,
      prioridad: nuevoItem.prioridad,
      comprado: false,
      link: nuevoItem.link.trim()
    }]
    updateMeta({ ...meta, items })
    setNuevoItem({ nombre: "", precio: "", prioridad: "Media", link: "" })
  }

  const borrarItem = (id: string) => {
    updateMeta({ ...meta, items: (meta.items || []).filter(i => i.id !== id) })
  }

  const toggleItem = (id: string) => {
    const items = (meta.items || []).map(i => i.id === id ? { ...i, comprado: !i.comprado } : i)
    updateMeta({ ...meta, items })
  }

  const items = meta.items || []

  return (
    <div className="p-4 bg-muted/30">
      <div className="bg-background rounded-lg border border-border overflow-hidden">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-muted/50 border-b border-border text-left">
              <th className="px-3 py-2 font-medium">Ítem</th>
              <th className="px-3 py-2 font-medium">Prioridad</th>
              <th className="px-3 py-2 font-medium">Enlace</th>
              <th className="px-3 py-2 font-medium text-right">Costo</th>
              <th className="px-3 py-2 font-medium">Estado</th>
              <th className="px-3 py-2" />
            </tr>
          </thead>
          <tbody className="divide-y divide-border/50">
            {items.map(item => (
              <tr key={item.id} className={cn("transition-colors", item.comprado && "opacity-60")}>
                <td className="px-3 py-2">
                  <div className={cn("font-medium", item.comprado && "line-through text-muted-foreground")}>{item.nombre}</div>
                </td>
                <td className="px-3 py-2">
                  <span className={cn("rounded-md border px-1.5 py-0.5 text-[10px] font-medium", PRIORIDAD_STYLE[item.prioridad])}>
                    {item.prioridad}
                  </span>
                </td>
                <td className="px-3 py-2">
                  {item.link ? (
                    <a href={item.link} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline truncate inline-block max-w-[150px]">
                      Ver link
                    </a>
                  ) : <span className="text-muted-foreground">—</span>}
                </td>
                <td className="px-3 py-2 text-right">
                  <span className={cn("font-mono font-medium", item.comprado && "line-through text-muted-foreground")}>
                    ${fmt(item.precio)}
                  </span>
                </td>
                <td className="px-3 py-2">
                  <input
                    type="checkbox"
                    checked={item.comprado}
                    onChange={() => toggleItem(item.id)}
                    className="size-4 accent-[var(--color-primary)] cursor-pointer"
                  />
                </td>
                <td className="px-3 py-2 text-right">
                  <button type="button" onClick={() => borrarItem(item.id)} className="text-muted-foreground hover:text-destructive">
                    <Trash2 className="size-3.5" />
                  </button>
                </td>
              </tr>
            ))}
            {items.length === 0 && (
              <tr>
                <td colSpan={6} className="px-3 py-6 text-center text-muted-foreground">No hay artículos. Añade uno abajo.</td>
              </tr>
            )}
          </tbody>
        </table>
        
        {/* Form to add item */}
        <div className="bg-muted/10 border-t border-border p-3 grid grid-cols-1 sm:grid-cols-12 gap-2 items-center">
          <div className="sm:col-span-3">
            <TextInput value={nuevoItem.nombre} onChange={v => setNuevoItem({ ...nuevoItem, nombre: v })} placeholder="Nombre del artículo" onEnter={agregarItem}/>
          </div>
          <div className="sm:col-span-2">
            <MoneyInput value={nuevoItem.precio} onChange={v => setNuevoItem({ ...nuevoItem, precio: v })} placeholder="0,00" onEnter={agregarItem}/>
          </div>
          <div className="sm:col-span-2">
            <select
              value={nuevoItem.prioridad}
              onChange={e => setNuevoItem({ ...nuevoItem, prioridad: e.target.value as Prioridad })}
              className="w-full rounded-md border border-input bg-background px-2 py-1.5 text-xs outline-none"
            >
              {PRIORIDADES.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          <div className="sm:col-span-3">
            <TextInput value={nuevoItem.link} onChange={v => setNuevoItem({ ...nuevoItem, link: v })} placeholder="Link de Amazon (opcional)" onEnter={agregarItem}/>
          </div>
          <div className="sm:col-span-2">
            <button onClick={agregarItem} type="button" className="w-full bg-primary text-primary-foreground text-xs font-semibold rounded-md py-1.5 px-3 hover:opacity-90 flex items-center justify-center gap-1">
              <Plus className="size-3" /> Añadir
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export function MetasTab({
  config,
  proyeccion,
  metas,
  setMetas,
  gastosPorMes,
}: Readonly<{
  config: Config
  proyeccion: Fila[]
  metas: Meta[]
  setMetas: Dispatch<SetStateAction<Meta[]>>
  gastosPorMes: GastosPorMes
}>) {
  const [nueva, setNueva] = useState<{ nombre: string; categoria: string; precio: string; prioridad: Prioridad; tipo: MetaTipo }>({
    nombre: "",
    categoria: "",
    precio: "",
    prioridad: "Media",
    tipo: "simple",
  })
  const [seleccion, setSeleccion] = useState<string[]>([])
  const [expandidos, setExpandidos] = useState<Record<string, boolean>>({})

  const toggleExpand = (id: string) => setExpandidos((p) => ({ ...p, [id]: !p[id] }))

  const agregar = () => {
    if (!nueva.nombre.trim()) return
    if (nueva.tipo === "simple" && !parseDecimal(nueva.precio)) return

    setMetas((prev) => [
      ...prev,
      {
        id: uid(),
        nombre: nueva.nombre.trim(),
        categoria: nueva.categoria.trim(),
        precio: nueva.tipo === "simple" ? parseDecimal(nueva.precio) : 0,
        prioridad: nueva.prioridad,
        comprado: false,
        mesComprado: null,
        tipo: nueva.tipo,
        items: nueva.tipo === "grupo" ? [] : undefined,
      },
    ])
    setNueva({ nombre: "", categoria: "", precio: "", prioridad: "Media", tipo: "simple" })
  }

  const borrar = (id: string) => {
    setMetas((prev) => prev.filter((m) => m.id !== id))
    setSeleccion((prev) => prev.filter((x) => x !== id))
  }

  const toggleComprado = (id: string) => {
    setMetas((prev) => prev.map((m) => (m.id === id ? markMetaComprada(m, prev, config, gastosPorMes) : m)))
  }

  const cambiarMes = (id: string, mes: string) =>
    setMetas((prev) => prev.map((m) => (m.id === id ? { ...m, mesComprado: mes } : m)))

  const setPrecio = (id: string, precio: number) =>
    setMetas((prev) => prev.map((x) => (x.id === id ? { ...x, precio } : x)))

  const toggleSim = (id: string) =>
    setSeleccion((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))

  const totalSim = metas
    .filter((m) => seleccion.includes(m.id) && !m.comprado)
    .reduce((s, m) => s + precioEfectivoMeta(m), 0)
  const mesSim = primerMesQueAlcanza(proyeccion, totalSim)

  return (
    <div className="space-y-6">
      {/* Add form */}
      <Panel>
        <div className="mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Target className="size-4 text-primary" />
            <span className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Nueva meta</span>
          </div>
          <Segmented
            options={[
              { value: "simple", label: "Meta Simple" },
              { value: "grupo", label: "Grupo (Wishlist)" }
            ]}
            value={nueva.tipo || "simple"}
            onChange={(v) => setNueva({ ...nueva, tipo: v as MetaTipo, precio: "" })}
          />
        </div>
        <div className="grid grid-cols-1 items-end gap-3 sm:grid-cols-2 lg:grid-cols-12">
          <Field label={nueva.tipo === "grupo" ? "Nombre del grupo (ej. Setup Gamer)" : "Artículo"} className="sm:col-span-2 lg:col-span-4">
            <TextInput
              value={nueva.nombre}
              onChange={(v) => setNueva({ ...nueva, nombre: v })}
              placeholder={nueva.tipo === "grupo" ? "ej. Viaje a Europa" : "ej. Moto XYZ"}
              onEnter={agregar}
            />
          </Field>
          <Field label="Categoría" className="lg:col-span-2">
            <TextInput
              value={nueva.categoria}
              onChange={(v) => setNueva({ ...nueva, categoria: v })}
              placeholder="opcional"
              onEnter={agregar}
            />
          </Field>
          {nueva.tipo === "simple" ? (
            <Field label="Precio" className="lg:col-span-2">
              <MoneyInput value={nueva.precio} onChange={(v) => setNueva({ ...nueva, precio: v })} placeholder="0,00" onEnter={agregar} />
            </Field>
          ) : (
            <div className="lg:col-span-2 flex items-center h-[38px] px-3 text-xs text-muted-foreground font-medium bg-accent/5 rounded-md border border-accent/20">
              Cálculo por ítems
            </div>
          )}
          <Field label="Prioridad" className="lg:col-span-2">
            <select
              value={nueva.prioridad}
              onChange={(e) => setNueva({ ...nueva, prioridad: e.target.value as Prioridad })}
              className="min-h-11 w-full rounded-lg border border-input bg-background/60 px-3 py-2.5 text-base text-foreground outline-none focus:border-ring focus:ring-2 focus:ring-ring/30 sm:min-h-0 sm:py-2 sm:text-sm"
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
            className="inline-flex min-h-11 w-full items-center justify-center gap-1.5 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 sm:min-h-0 sm:w-auto lg:col-span-2"
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
              const precioEfectivo = precioEfectivoMeta(m)
              const mesAlcance = !m.comprado ? primerMesQueAlcanza(proyeccion, precioEfectivo) : null
              const isGroup = m.tipo === "grupo"
              const expanded = expandidos[m.id]
              const groupItems = m.items || []
              const totalComprado = groupItems.filter(i => i.comprado).reduce((s, i) => s + i.precio, 0)
              const totalItems = groupItems.length
              const itemsComprados = groupItems.filter(i => i.comprado).length

              return (
                <Fragment key={m.id}>
                  <tr className={cn("transition-colors hover:bg-secondary/30", m.comprado && "opacity-60")}>
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
                      <div className="flex items-center gap-2">
                        <div className={cn("text-foreground font-medium", m.comprado && "line-through")}>
                          {m.nombre}
                        </div>
                        {isGroup && (
                          <span className="rounded-full bg-accent/10 px-2 py-0.5 text-[10px] uppercase font-bold tracking-wider text-accent border border-accent/20">
                            Grupo
                          </span>
                        )}
                      </div>
                      {mesAlcance && <div className="text-xs text-primary">alcanzable en {monthLabel(mesAlcance)}</div>}
                      {isGroup && totalItems > 0 && (
                        <div className="text-[10px] text-muted-foreground font-mono mt-0.5">
                          {itemsComprados}/{totalItems} completados
                        </div>
                      )}
                    </td>
                    <td className="px-3 py-2.5 text-muted-foreground">{m.categoria || "—"}</td>
                    <td className="px-3 py-2.5">
                      <span className={cn("rounded-md border px-2 py-0.5 text-xs font-medium", PRIORIDAD_STYLE[m.prioridad])}>
                        {m.prioridad}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-right font-medium text-foreground">
                      {isGroup ? (
                        <div className="flex flex-col items-end">
                          <span className="tnum font-semibold text-primary/90">${fmt(precioEfectivo)}</span>
                          {totalComprado > 0 && <span className="text-[10px] text-muted-foreground tnum line-through">${fmt(totalComprado)}</span>}
                        </div>
                      ) : (
                        <MoneyInput
                          className="w-28 ml-auto"
                          value={m.precio || ""}
                          onChange={(v) => setPrecio(m.id, parseDecimal(v) || 0)}
                          placeholder="0,00"
                        />
                      )}
                    </td>
                    <td className="px-3 py-2.5">
                      {!isGroup ? (
                        <input
                          type="checkbox"
                          checked={m.comprado}
                          onChange={() => toggleComprado(m.id)}
                          aria-label={`Marcar ${m.nombre} como comprado`}
                          className="size-4 accent-[var(--color-primary)]"
                        />
                      ) : (
                        <button
                          type="button"
                          onClick={() => toggleExpand(m.id)}
                          className="text-xs text-primary hover:underline"
                        >
                          {expanded ? "Cerrar" : "Ver artículos"}
                        </button>
                      )}
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

                  {/* Fila expandida de grupo */}
                  {isGroup && expanded && (
                    <tr className="bg-background/40">
                      <td colSpan={8} className="p-0 border-b border-border">
                        <WishlistGroupEditor
                          meta={m}
                          updateMeta={(updatedMeta: Meta) => setMetas(prev => prev.map(x => x.id === m.id ? updatedMeta : x))}
                        />
                      </td>
                    </tr>
                  )}
                </Fragment>
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

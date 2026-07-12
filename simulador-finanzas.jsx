import React, { useState, useEffect, useMemo, useCallback } from "react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

const FONT_IMPORT = `@import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,600;9..144,700&family=IBM+Plex+Sans:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500;600&display=swap');`;

const MESES_ES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
const MESES_ES_LARGO = ["enero","febrero","marzo","abril","mayo","junio","julio","agosto","septiembre","octubre","noviembre","diciembre"];

function keyToParts(key) {
  const [y, m] = key.split("-").map(Number);
  return { y, m };
}
function partsToKey(y, m) {
  const mm = String(m).padStart(2, "0");
  return `${y}-${mm}`;
}
function addMonths(key, n) {
  const { y, m } = keyToParts(key);
  const total = (m - 1) + n;
  const newY = y + Math.floor(total / 12);
  const newM = (total % 12 + 12) % 12 + 1;
  return partsToKey(newY, newM);
}
function monthLabel(key, long = false) {
  const { y, m } = keyToParts(key);
  return `${(long ? MESES_ES_LARGO : MESES_ES)[m - 1]} ${y}`;
}
function compareKeys(a, b) {
  return a.localeCompare(b);
}
function fmt(n) {
  const v = Number(n) || 0;
  return v.toLocaleString("es-EC", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function uid() {
  return Math.random().toString(36).slice(2, 10);
}

const DEFAULT_CONFIG = {
  sueldo: 769.67,
  ahorroBase: 500,
  gastoBase: 269.67,
  ahorroActual: 0,
  mesInicio: (() => {
    const d = new Date();
    return partsToKey(d.getFullYear(), d.getMonth() + 1);
  })(),
  mesesAProyectar: 18,
  descuentoActivo: true,
  descuentoMonto: 50,
  descuentoMesFin: (() => {
    const d = new Date();
    return partsToKey(d.getFullYear(), d.getMonth() + 5);
  })(),
};

function disponibleBaseDelMes(config, mesKey) {
  const enRangoDescuento =
    config.descuentoActivo &&
    compareKeys(mesKey, config.mesInicio) >= 0 &&
    compareKeys(mesKey, config.descuentoMesFin) <= 0;
  return enRangoDescuento ? config.gastoBase - config.descuentoMonto : config.gastoBase;
}

function generarProyeccion(config, gastosPorMes, metas, ajustesAhorro = {}) {
  const meses = [];
  for (let i = 0; i < config.mesesAProyectar; i++) {
    meses.push(addMonths(config.mesInicio, i));
  }
  let acumulado = Number(config.ahorroActual) || 0;
  const filas = [];
  for (const mesKey of meses) {
    const disponibleBase = disponibleBaseDelMes(config, mesKey);
    const gastosDelMes = (gastosPorMes[mesKey] || []).reduce((s, g) => s + (Number(g.monto) || 0), 0);
    const sobra = Math.max(disponibleBase - gastosDelMes, 0);
    const ajustesDelMes = (ajustesAhorro[mesKey] || []).reduce((s, a) => s + (Number(a.monto) || 0), 0);
    const deposito = (Number(config.ahorroBase) || 0) + sobra + ajustesDelMes;
    acumulado += deposito;

    const comprasDelMes = metas.filter((m) => m.comprado && m.mesComprado === mesKey);
    const totalCompras = comprasDelMes.reduce((s, m) => s + (Number(m.precio) || 0), 0);
    acumulado -= totalCompras;

    filas.push({
      mes: mesKey,
      label: monthLabel(mesKey),
      disponibleBase,
      gastado: gastosDelMes,
      sobra,
      ajustesDelMes,
      deposito,
      comprasDelMes: totalCompras,
      ahorroAcumulado: acumulado,
    });
  }
  return filas;
}

function primerMesQueAlcanza(proyeccion, objetivo) {
  if (objetivo <= 0) return null;
  const fila = proyeccion.find((f) => f.ahorroAcumulado >= objetivo);
  return fila ? fila.mes : null;
}

const PRIORIDADES = ["Alta", "Media", "Baja"];
const PRIORIDAD_COLOR = {
  Alta: "text-[#C1613F] border-[#C1613F]/40 bg-[#C1613F]/10",
  Media: "text-[#C9A24B] border-[#C9A24B]/40 bg-[#C9A24B]/10",
  Baja: "text-[#7FA893] border-[#7FA893]/40 bg-[#7FA893]/10",
};

export default function App() {
  const [config, setConfig] = useState(DEFAULT_CONFIG);
  const [gastosPorMes, setGastosPorMes] = useState({});
  const [metas, setMetas] = useState([]);
  const [ajustesAhorro, setAjustesAhorro] = useState({});
  const [loaded, setLoaded] = useState(false);
  const [saveState, setSaveState] = useState("idle"); // idle | saving | saved
  const [tab, setTab] = useState("resumen");

  // --- Carga inicial ---
  useEffect(() => {
    (async () => {
      try {
        const res = await window.storage.get("finanzas-data-v1");
        if (res && res.value) {
          const data = JSON.parse(res.value);
          if (data.config) setConfig({ ...DEFAULT_CONFIG, ...data.config });
          if (data.gastosPorMes) setGastosPorMes(data.gastosPorMes);
          if (data.metas) setMetas(data.metas);
          if (data.ajustesAhorro) setAjustesAhorro(data.ajustesAhorro);
        }
      } catch (e) {
        // no hay datos guardados todavía
      }
      setLoaded(true);
    })();
  }, []);

  // --- Guardado automático ---
  useEffect(() => {
    if (!loaded) return;
    setSaveState("saving");
    const t = setTimeout(async () => {
      try {
        await window.storage.set(
          "finanzas-data-v1",
          JSON.stringify({ config, gastosPorMes, metas, ajustesAhorro })
        );
        setSaveState("saved");
      } catch (e) {
        setSaveState("idle");
      }
    }, 500);
    return () => clearTimeout(t);
  }, [config, gastosPorMes, metas, ajustesAhorro, loaded]);

  const proyeccion = useMemo(
    () => generarProyeccion(config, gastosPorMes, metas, ajustesAhorro),
    [config, gastosPorMes, metas, ajustesAhorro]
  );

  const [selectedGastoMonth, setSelectedGastoMonth] = useState(config.mesInicio);
  useEffect(() => {
    if (!proyeccion.find((f) => f.mes === selectedGastoMonth)) {
      setSelectedGastoMonth(config.mesInicio);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config.mesInicio]);

  const filaSeleccionada = proyeccion.find((f) => f.mes === selectedGastoMonth) || proyeccion[0];
  const gastosDelMesSel = gastosPorMes[selectedGastoMonth] || [];
  const usadoDelMesSel = gastosDelMesSel.reduce((s, g) => s + (Number(g.monto) || 0), 0);
  const disponibleMesSel = filaSeleccionada ? filaSeleccionada.disponibleBase : 0;
  const restanteMesSel = disponibleMesSel - usadoDelMesSel;

  const [nuevoGasto, setNuevoGasto] = useState({ concepto: "", monto: "" });
  const [errorGasto, setErrorGasto] = useState("");

  const agregarGasto = useCallback(() => {
    const monto = Number(nuevoGasto.monto);
    if (!nuevoGasto.concepto.trim()) {
      setErrorGasto("Ponle un nombre al gasto.");
      return;
    }
    if (!monto || monto <= 0) {
      setErrorGasto("El monto debe ser mayor a 0.");
      return;
    }
    if (usadoDelMesSel + monto > disponibleMesSel + 0.001) {
      setErrorGasto(
        `Te pasas del disponible de ${monthLabel(selectedGastoMonth)}. Quedan $${fmt(restanteMesSel)}.`
      );
      return;
    }
    setGastosPorMes((prev) => ({
      ...prev,
      [selectedGastoMonth]: [...(prev[selectedGastoMonth] || []), { id: uid(), concepto: nuevoGasto.concepto.trim(), monto }],
    }));
    setNuevoGasto({ concepto: "", monto: "" });
    setErrorGasto("");
  }, [nuevoGasto, usadoDelMesSel, disponibleMesSel, selectedGastoMonth, restanteMesSel]);

  const borrarGasto = (id) => {
    setGastosPorMes((prev) => ({
      ...prev,
      [selectedGastoMonth]: (prev[selectedGastoMonth] || []).filter((g) => g.id !== id),
    }));
  };

  // --- Metas ---
  const [nuevaMeta, setNuevaMeta] = useState({ nombre: "", categoria: "", precio: "", prioridad: "Media" });
  const [selectedMetaIds, setSelectedMetaIds] = useState([]);

  const agregarMeta = () => {
    if (!nuevaMeta.nombre.trim() || !Number(nuevaMeta.precio)) return;
    setMetas((prev) => [
      ...prev,
      {
        id: uid(),
        nombre: nuevaMeta.nombre.trim(),
        categoria: nuevaMeta.categoria.trim(),
        precio: Number(nuevaMeta.precio),
        prioridad: nuevaMeta.prioridad,
        comprado: false,
        mesComprado: null,
      },
    ]);
    setNuevaMeta({ nombre: "", categoria: "", precio: "", prioridad: "Media" });
  };

  const borrarMeta = (id) => {
    setMetas((prev) => prev.filter((m) => m.id !== id));
    setSelectedMetaIds((prev) => prev.filter((x) => x !== id));
  };

  const toggleComprado = (id) => {
    setMetas((prev) =>
      prev.map((m) => {
        if (m.id !== id) return m;
        if (m.comprado) {
          return { ...m, comprado: false, mesComprado: null };
        }
        const proyeccionSinEsta = generarProyeccion(config, gastosPorMes, prev.filter((x) => x.id !== id || !x.comprado));
        const mesSugerido = primerMesQueAlcanza(proyeccionSinEsta, m.precio) || config.mesInicio;
        return { ...m, comprado: true, mesComprado: mesSugerido };
      })
    );
  };

  const cambiarMesComprado = (id, mes) => {
    setMetas((prev) => prev.map((m) => (m.id === id ? { ...m, mesComprado: mes } : m)));
  };

  const toggleSeleccionSim = (id) => {
    setSelectedMetaIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const totalSeleccionSim = metas
    .filter((m) => selectedMetaIds.includes(m.id) && !m.comprado)
    .reduce((s, m) => s + m.precio, 0);
  const mesAlcanceSim = primerMesQueAlcanza(proyeccion, totalSeleccionSim);

  const metasPendientes = metas.filter((m) => !m.comprado);
  const proximaMeta = useMemo(() => {
    let mejor = null;
    for (const m of metasPendientes) {
      const mes = primerMesQueAlcanza(proyeccion, m.precio);
      if (mes && (!mejor || compareKeys(mes, mejor.mes) < 0)) mejor = { meta: m, mes };
    }
    return mejor;
  }, [metasPendientes, proyeccion]);

  const chartData = proyeccion.map((f) => ({ label: monthLabel(f.mes), Ahorro: Math.round(f.ahorroAcumulado * 100) / 100 }));

  const tabs = [
    { id: "resumen", label: "Resumen" },
    { id: "config", label: "Configuración" },
    { id: "gastos", label: "Gastos por mes" },
    { id: "metas", label: "Metas" },
  ];

  return (
    <div
      className="min-h-full w-full bg-[#0F1B18] text-[#EDE8DE]"
      style={{ fontFamily: "'IBM Plex Sans', sans-serif" }}
    >
      <style>{FONT_IMPORT}</style>
      <div className="max-w-5xl mx-auto px-5 py-8">
        {/* Header */}
        <div className="flex items-baseline justify-between border-b border-[#EDE8DE]/15 pb-5 mb-6">
          <div>
            <div
              className="text-3xl sm:text-4xl tracking-tight"
              style={{ fontFamily: "'Fraunces', serif", fontWeight: 600 }}
            >
              Libro de ahorro
            </div>
            <div className="text-sm text-[#8FA39A] mt-1">Simulación de sueldo, ahorro y metas</div>
          </div>
          <div className="text-xs text-[#8FA39A]" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>
            {saveState === "saving" ? "guardando…" : saveState === "saved" ? "guardado ✓" : ""}
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-6 border-b border-[#EDE8DE]/10">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`px-4 py-2 text-sm transition-colors border-b-2 -mb-px ${
                tab === t.id
                  ? "border-[#C9A24B] text-[#EDE8DE]"
                  : "border-transparent text-[#8FA39A] hover:text-[#EDE8DE]"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* RESUMEN */}
        {tab === "resumen" && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <StatCard label="Sueldo mensual" value={`$${fmt(config.sueldo)}`} />
              <StatCard label="Ahorro actual" value={`$${fmt(config.ahorroActual)}`} accent />
              <StatCard
                label={`Disponible en ${monthLabel(config.mesInicio)}`}
                value={`$${fmt(disponibleBaseDelMes(config, config.mesInicio))}`}
              />
              <StatCard
                label={`Ahorro al final (${monthLabel(proyeccion[proyeccion.length - 1]?.mes || config.mesInicio)})`}
                value={`$${fmt(proyeccion[proyeccion.length - 1]?.ahorroAcumulado || 0)}`}
                accent
              />
            </div>

            {proximaMeta && (
              <div className="border border-[#C9A24B]/30 bg-[#C9A24B]/5 rounded-md px-4 py-3 text-sm">
                Tu próxima meta alcanzable es <strong>{proximaMeta.meta.nombre}</strong> (${fmt(proximaMeta.meta.precio)}) —
                la tendrías cubierta en <strong>{monthLabel(proximaMeta.mes, true)}</strong>.
              </div>
            )}

            <div className="border border-[#EDE8DE]/10 rounded-md p-4">
              <div className="text-sm text-[#8FA39A] mb-3">Ahorro acumulado proyectado</div>
              <div style={{ width: "100%", height: 240 }}>
                <ResponsiveContainer>
                  <AreaChart data={chartData} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                    <defs>
                      <linearGradient id="ahorroFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#C9A24B" stopOpacity={0.5} />
                        <stop offset="100%" stopColor="#C9A24B" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#EDE8DE22" vertical={false} />
                    <XAxis dataKey="label" tick={{ fill: "#8FA39A", fontSize: 11 }} axisLine={{ stroke: "#EDE8DE22" }} tickLine={false} interval={1} />
                    <YAxis tick={{ fill: "#8FA39A", fontSize: 11 }} axisLine={false} tickLine={false} width={55} />
                    <Tooltip
                      contentStyle={{ background: "#16241F", border: "1px solid #EDE8DE22", borderRadius: 6, fontSize: 12 }}
                      labelStyle={{ color: "#EDE8DE" }}
                      formatter={(v) => [`$${fmt(v)}`, "Ahorro"]}
                    />
                    <Area type="monotone" dataKey="Ahorro" stroke="#C9A24B" strokeWidth={2} fill="url(#ahorroFill)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="border border-[#EDE8DE]/10 rounded-md overflow-hidden">
              <table className="w-full text-sm" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>
                <thead>
                  <tr className="text-left text-[#8FA39A] border-b border-[#EDE8DE]/10 text-xs">
                    <th className="px-3 py-2 font-normal">Mes</th>
                    <th className="px-3 py-2 font-normal text-right">Disponible</th>
                    <th className="px-3 py-2 font-normal text-right">Gastado</th>
                    <th className="px-3 py-2 font-normal text-right">Depósito ahorro</th>
                    <th className="px-3 py-2 font-normal text-right">Compras metas</th>
                    <th className="px-3 py-2 font-normal text-right">Ahorro acumulado</th>
                  </tr>
                </thead>
                <tbody>
                  {proyeccion.map((f, i) => (
                    <tr key={f.mes} className={i % 2 === 0 ? "" : "bg-[#EDE8DE]/[0.02]"}>
                      <td className="px-3 py-1.5 capitalize" style={{ fontFamily: "'IBM Plex Sans', sans-serif" }}>{f.label}</td>
                      <td className="px-3 py-1.5 text-right">{fmt(f.disponibleBase)}</td>
                      <td className="px-3 py-1.5 text-right text-[#C1613F]">{fmt(f.gastado)}</td>
                      <td className="px-3 py-1.5 text-right text-[#7FA893]">{fmt(f.deposito)}</td>
                      <td className="px-3 py-1.5 text-right">{f.comprasDelMes ? `-${fmt(f.comprasDelMes)}` : "—"}</td>
                      <td className="px-3 py-1.5 text-right text-[#C9A24B] font-medium">{fmt(f.ahorroAcumulado)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* CONFIGURACIÓN */}
        {tab === "config" && (
          <div className="space-y-5 max-w-xl">
            <Field label="Sueldo mensual ($)">
              <Input type="number" value={config.sueldo} onChange={(v) => setConfig({ ...config, sueldo: Number(v) })} />
            </Field>
            <Field label="Ahorro fijo mensual ($)">
              <Input type="number" value={config.ahorroBase} onChange={(v) => setConfig({ ...config, ahorroBase: Number(v) })} />
            </Field>
            <Field label="Gasto mensual base — antes de descuentos ($)">
              <Input type="number" value={config.gastoBase} onChange={(v) => setConfig({ ...config, gastoBase: Number(v) })} />
            </Field>
            <Field label="Ahorro actual — lo que ya tienes ahorrado hoy ($)">
              <Input type="number" value={config.ahorroActual} onChange={(v) => setConfig({ ...config, ahorroActual: Number(v) })} />
            </Field>
            <Field label="Mes de inicio de la simulación">
              <Input type="month" value={config.mesInicio} onChange={(v) => setConfig({ ...config, mesInicio: v })} />
            </Field>
            <Field label="Meses a proyectar">
              <Input type="number" value={config.mesesAProyectar} onChange={(v) => setConfig({ ...config, mesesAProyectar: Math.max(1, Number(v)) })} />
            </Field>

            <div className="border-t border-[#EDE8DE]/10 pt-5">
              <label className="flex items-center gap-2 text-sm mb-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.descuentoActivo}
                  onChange={(e) => setConfig({ ...config, descuentoActivo: e.target.checked })}
                  className="accent-[#C9A24B]"
                />
                Descuento temporal del gasto mensual (ej. ayuda a un familiar)
              </label>
              {config.descuentoActivo && (
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Monto del descuento ($)">
                    <Input type="number" value={config.descuentoMonto} onChange={(v) => setConfig({ ...config, descuentoMonto: Number(v) })} />
                  </Field>
                  <Field label="Último mes del descuento">
                    <Input type="month" value={config.descuentoMesFin} onChange={(v) => setConfig({ ...config, descuentoMesFin: v })} />
                  </Field>
                </div>
              )}
            </div>
          </div>
        )}

        {/* GASTOS POR MES */}
        {tab === "gastos" && (
          <div className="space-y-5">
            <div className="flex items-center gap-3">
              <span className="text-sm text-[#8FA39A]">Mes:</span>
              <select
                value={selectedGastoMonth}
                onChange={(e) => setSelectedGastoMonth(e.target.value)}
                className="bg-[#16241F] border border-[#EDE8DE]/15 rounded px-3 py-1.5 text-sm capitalize"
              >
                {proyeccion.map((f) => (
                  <option key={f.mes} value={f.mes}>{f.label}</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <StatCard label="Disponible del mes" value={`$${fmt(disponibleMesSel)}`} />
              <StatCard label="Usado" value={`$${fmt(usadoDelMesSel)}`} />
              <StatCard label="Restante" value={`$${fmt(restanteMesSel)}`} accent={restanteMesSel >= 0} warn={restanteMesSel < 0} />
            </div>

            <div className="border border-[#EDE8DE]/10 rounded-md divide-y divide-[#EDE8DE]/10">
              {gastosDelMesSel.length === 0 && (
                <div className="px-4 py-6 text-sm text-[#8FA39A] text-center">Todavía no hay gastos registrados este mes.</div>
              )}
              {gastosDelMesSel.map((g) => (
                <div key={g.id} className="flex items-center justify-between px-4 py-2.5 text-sm">
                  <span>{g.concepto}</span>
                  <div className="flex items-center gap-3">
                    <span style={{ fontFamily: "'IBM Plex Mono', monospace" }}>${fmt(g.monto)}</span>
                    <button onClick={() => borrarGasto(g.id)} className="text-[#8FA39A] hover:text-[#C1613F] text-xs">
                      quitar
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex flex-wrap items-end gap-3 border border-[#EDE8DE]/10 rounded-md p-4">
              <Field label="Concepto" className="flex-1 min-w-[160px]">
                <Input
                  value={nuevoGasto.concepto}
                  onChange={(v) => setNuevoGasto({ ...nuevoGasto, concepto: v })}
                  placeholder="ej. mercado, uber, etc."
                />
              </Field>
              <Field label="Monto ($)" className="w-32">
                <Input type="number" value={nuevoGasto.monto} onChange={(v) => setNuevoGasto({ ...nuevoGasto, monto: v })} />
              </Field>
              <button
                onClick={agregarGasto}
                className="px-4 py-2 rounded bg-[#C9A24B] text-[#0F1B18] text-sm font-medium hover:bg-[#dab35c] transition-colors"
              >
                Añadir gasto
              </button>
            </div>
            {errorGasto && <div className="text-sm text-[#C1613F]">{errorGasto}</div>}
          </div>
        )}

        {/* METAS */}
        {tab === "metas" && (
          <div className="space-y-6">
            <div className="flex flex-wrap items-end gap-3 border border-[#EDE8DE]/10 rounded-md p-4">
              <Field label="Artículo" className="flex-1 min-w-[160px]">
                <Input value={nuevaMeta.nombre} onChange={(v) => setNuevaMeta({ ...nuevaMeta, nombre: v })} placeholder="ej. Moto XYZ" />
              </Field>
              <Field label="Categoría" className="w-36">
                <Input value={nuevaMeta.categoria} onChange={(v) => setNuevaMeta({ ...nuevaMeta, categoria: v })} placeholder="opcional" />
              </Field>
              <Field label="Precio ($)" className="w-28">
                <Input type="number" value={nuevaMeta.precio} onChange={(v) => setNuevaMeta({ ...nuevaMeta, precio: v })} />
              </Field>
              <Field label="Prioridad" className="w-28">
                <select
                  value={nuevaMeta.prioridad}
                  onChange={(e) => setNuevaMeta({ ...nuevaMeta, prioridad: e.target.value })}
                  className="w-full bg-[#16241F] border border-[#EDE8DE]/15 rounded px-2 py-2 text-sm"
                >
                  {PRIORIDADES.map((p) => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              </Field>
              <button
                onClick={agregarMeta}
                className="px-4 py-2 rounded bg-[#C9A24B] text-[#0F1B18] text-sm font-medium hover:bg-[#dab35c] transition-colors"
              >
                Añadir
              </button>
            </div>

            <div className="border border-[#EDE8DE]/10 rounded-md overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-[#8FA39A] border-b border-[#EDE8DE]/10 text-xs">
                    <th className="px-3 py-2 font-normal">Sim.</th>
                    <th className="px-3 py-2 font-normal">Artículo</th>
                    <th className="px-3 py-2 font-normal">Categoría</th>
                    <th className="px-3 py-2 font-normal">Prioridad</th>
                    <th className="px-3 py-2 font-normal text-right">Precio</th>
                    <th className="px-3 py-2 font-normal">Comprado</th>
                    <th className="px-3 py-2 font-normal">Mes</th>
                    <th className="px-3 py-2 font-normal"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#EDE8DE]/5">
                  {metas.map((m) => {
                    const mesAlcance = !m.comprado ? primerMesQueAlcanza(proyeccion, m.precio) : null;
                    return (
                      <tr key={m.id}>
                        <td className="px-3 py-2">
                          {!m.comprado && (
                            <input
                              type="checkbox"
                              checked={selectedMetaIds.includes(m.id)}
                              onChange={() => toggleSeleccionSim(m.id)}
                              className="accent-[#7FA893]"
                            />
                          )}
                        </td>
                        <td className="px-3 py-2">
                          <div>{m.nombre}</div>
                          {mesAlcance && (
                            <div className="text-xs text-[#7FA893]">alcanzable en {monthLabel(mesAlcance)}</div>
                          )}
                        </td>
                        <td className="px-3 py-2 text-[#8FA39A]">{m.categoria || "—"}</td>
                        <td className="px-3 py-2">
                          <span className={`text-xs px-2 py-0.5 rounded border ${PRIORIDAD_COLOR[m.prioridad]}`}>{m.prioridad}</span>
                        </td>
                        <td className="px-3 py-2 text-right" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>
                          ${fmt(m.precio)}
                        </td>
                        <td className="px-3 py-2">
                          <input type="checkbox" checked={m.comprado} onChange={() => toggleComprado(m.id)} className="accent-[#C9A24B]" />
                        </td>
                        <td className="px-3 py-2">
                          {m.comprado ? (
                            <select
                              value={m.mesComprado || ""}
                              onChange={(e) => cambiarMesComprado(m.id, e.target.value)}
                              className="bg-[#16241F] border border-[#EDE8DE]/15 rounded px-2 py-1 text-xs capitalize"
                            >
                              {proyeccion.map((f) => (
                                <option key={f.mes} value={f.mes}>{f.label}</option>
                              ))}
                            </select>
                          ) : (
                            <span className="text-[#8FA39A] text-xs">—</span>
                          )}
                        </td>
                        <td className="px-3 py-2">
                          <button onClick={() => borrarMeta(m.id)} className="text-[#8FA39A] hover:text-[#C1613F] text-xs">
                            quitar
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                  {metas.length === 0 && (
                    <tr>
                      <td colSpan={8} className="px-3 py-6 text-center text-[#8FA39A] text-sm">
                        Todavía no has añadido artículos a tu lista de metas.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {selectedMetaIds.length > 0 && (
              <div className="border border-[#C9A24B]/30 bg-[#C9A24B]/5 rounded-md px-4 py-3 text-sm">
                Combo seleccionado: <strong>${fmt(totalSeleccionSim)}</strong> —{" "}
                {mesAlcanceSim ? (
                  <>lo tendrías cubierto en <strong>{monthLabel(mesAlcanceSim, true)}</strong>.</>
                ) : (
                  <>fuera del rango proyectado ({config.mesesAProyectar} meses) — amplía la proyección en Configuración.</>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ label, value, accent, warn }) {
  return (
    <div className="border border-[#EDE8DE]/10 rounded-md px-4 py-3">
      <div className="text-xs text-[#8FA39A] mb-1">{label}</div>
      <div
        className={`text-lg ${warn ? "text-[#C1613F]" : accent ? "text-[#C9A24B]" : "text-[#EDE8DE]"}`}
        style={{ fontFamily: "'IBM Plex Mono', monospace" }}
      >
        {value}
      </div>
    </div>
  );
}

function Field({ label, children, className = "" }) {
  return (
    <div className={className}>
      <div className="text-xs text-[#8FA39A] mb-1">{label}</div>
      {children}
    </div>
  );
}

function Input({ type = "text", value, onChange, placeholder }) {
  return (
    <input
      type={type}
      value={value}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      className="w-full bg-[#16241F] border border-[#EDE8DE]/15 rounded px-3 py-2 text-sm focus:outline-none focus:border-[#C9A24B]/60"
    />
  );
}

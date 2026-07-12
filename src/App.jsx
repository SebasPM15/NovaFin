import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
    ResponsiveContainer, Legend
} from "recharts";

// ─── Fonts ────────────────────────────────────────────────────────────────────
const FONT_IMPORT = `@import url('https://fonts.googleapis.com/css2?family=Outfit:wght@500;700;800&family=IBM+Plex+Sans:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500;600&display=swap');`;

// ─── Date helpers ─────────────────────────────────────────────────────────────
const MESES_ES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
const MESES_ES_LARGO = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];

function keyToParts(key) { const [y, m] = key.split("-").map(Number); return { y, m }; }
function partsToKey(y, m) { return `${y}-${String(m).padStart(2, "0")}`; }
function addMonths(key, n) { const { y, m } = keyToParts(key); const t = (m - 1) + n; return partsToKey(y + Math.floor(t / 12), (t % 12 + 12) % 12 + 1); }
function monthLabel(key, long = false) { const { y, m } = keyToParts(key); return `${(long ? MESES_ES_LARGO : MESES_ES)[m - 1]} ${y}`; }
function compareKeys(a, b) { return a.localeCompare(b); }
function fmt(n) { return (Number(n) || 0).toLocaleString("es-EC", { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
function uid() { return Math.random().toString(36).slice(2, 10); }
function nowKey() { const d = new Date(); return partsToKey(d.getFullYear(), d.getMonth() + 1); }

// ─── Config defaults ──────────────────────────────────────────────────────────
const DEFAULT_CONFIG = {
    sueldo: 0,
    ahorroBase: 0,       // depósito fijo a cuenta Ahorro
    gastoBase: 0,        // disponible en cuenta Gastos
    ahorroActual: 0,         // saldo inicial cuenta Ahorro
    gastosActual: 0,         // saldo inicial cuenta Gastos (sobrante acumulado)
    mesInicio: nowKey(),
    mesesAProyectar: 12,
    descuentoActivo: false,
    descuentoMonto: 50,
    descuentoMesFin: addMonths(nowKey(), 5),
    fechaNacimiento: "",
};

// ─── Lógica de proyección ─────────────────────────────────────────────────────
/**
 * Genera la proyección mes a mes separando:
 *   - Cuenta Ahorro  → depósito fijo (config.ahorroBase) + ajustes manuales
 *   - Cuenta Gastos  → (gastoBase - descuento) - gastos registrados = sobrante
 *
 * saldosRealesAhorro: { "2025-08": 800, ... }  → override del saldo de Ahorro al cierre de ese mes
 * saldosRealesGastos: { "2025-08": 50, ... }   → override del sobrante de Gastos al cierre de ese mes
 */
function generarProyeccion(config, gastosPorMes, metas, ajustesAhorro = {}, saldosRealesAhorro = {}, saldosRealesGastos = {}) {
    const meses = [];
    for (let i = 0; i < config.mesesAProyectar; i++) meses.push(addMonths(config.mesInicio, i));

    let acumAhorro = Number(config.ahorroActual) || 0;
    let acumGastos = Number(config.gastosActual) || 0;
    const filas = [];

    for (const mesKey of meses) {
        // ── Cuenta Gastos ──
        const descuento = config.descuentoActivo
            && compareKeys(mesKey, config.mesInicio) >= 0
            && compareKeys(mesKey, config.descuentoMesFin) <= 0
            ? config.descuentoMonto : 0;
        const disponibleBase = config.gastoBase - descuento;
        const gastosDelMes = (gastosPorMes[mesKey] || []).reduce((s, g) => s + (Number(g.monto) || 0), 0);
        const sobrante = Math.max(disponibleBase - gastosDelMes, 0);

        // Si hay saldo real para Gastos → lo usamos como base del siguiente mes
        if (saldosRealesGastos[mesKey] !== undefined && saldosRealesGastos[mesKey] !== "") {
            acumGastos = Number(saldosRealesGastos[mesKey]) || 0;
        } else {
            acumGastos += sobrante;
        }

        // ── Cuenta Ahorro ──
        const ajustesDelMes = (ajustesAhorro[mesKey] || []).reduce((s, a) => s + (Number(a.monto) || 0), 0);
        const deposito = (Number(config.ahorroBase) || 0) + ajustesDelMes;

        // Compras de metas que se cargan a Ahorro
        const comprasDelMes = metas.filter(m => m.comprado && m.mesComprado === mesKey);
        const totalCompras = comprasDelMes.reduce((s, m) => s + (Number(m.precio) || 0), 0);

        const ahorroAntes = acumAhorro + deposito - totalCompras;

        // Si hay saldo real para Ahorro → lo usa como cierre del mes (override)
        if (saldosRealesAhorro[mesKey] !== undefined && saldosRealesAhorro[mesKey] !== "") {
            acumAhorro = Number(saldosRealesAhorro[mesKey]) || 0;
        } else {
            acumAhorro = ahorroAntes;
        }

        filas.push({
            mes: mesKey,
            label: monthLabel(mesKey),
            disponibleBase,
            gastado: gastosDelMes,
            sobrante,
            ajustesDelMes,
            depositoBase: Number(config.ahorroBase) || 0,
            depositoTotal: deposito,
            deposito,
            comprasDelMes: totalCompras,
            ahorroAcumulado: acumAhorro,
            gastosAcumulado: acumGastos,
            total: acumAhorro + acumGastos,
            tieneRealAhorro: saldosRealesAhorro[mesKey] !== undefined && saldosRealesAhorro[mesKey] !== "",
            tieneRealGastos: saldosRealesGastos[mesKey] !== undefined && saldosRealesGastos[mesKey] !== "",
        });
    }
    return filas;
}

function primerMesQueAlcanza(proyeccion, objetivo) {
    if (objetivo <= 0) return null;
    return proyeccion.find(f => f.ahorroAcumulado >= objetivo)?.mes || null;
}

// ─── Constantes UI ────────────────────────────────────────────────────────────
const PRIORIDADES = ["Alta", "Media", "Baja"];
const PRIORIDAD_COLOR = {
    Alta: "text-[#EF4444] border-[#EF4444]/40 bg-[#EF4444]/10",
    Media: "text-[#10B981] border-[#10B981]/40 bg-[#10B981]/10",
    Baja: "text-[#3B82F6] border-[#3B82F6]/40 bg-[#3B82F6]/10",
};

// ─── Persistence (localStorage) ───────────────────────────────────────────────
const STORAGE_KEY = "libro-ahorro-v2";
function loadData() {
    try { const raw = localStorage.getItem(STORAGE_KEY); return raw ? JSON.parse(raw) : null; }
    catch { return null; }
}
function saveData(data) {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); }
    catch { }
}

// ─── App ──────────────────────────────────────────────────────────────────────
export default function App() {
    const [config, setConfig] = useState(DEFAULT_CONFIG);
    const [gastosPorMes, setGastosPorMes] = useState({});
    const [metas, setMetas] = useState([]);
    const [ajustesAhorro, setAjustesAhorro] = useState({});
    const [saldosRealesAhorro, setSaldosRealesAhorro] = useState({});
    const [saldosRealesGastos, setSaldosRealesGastos] = useState({});
    const [loaded, setLoaded] = useState(false);
    const [saveState, setSaveState] = useState("idle");
    const [tab, setTab] = useState("resumen");

    // Carga inicial
    useEffect(() => {
        const data = loadData();
        if (data) {
            if (data.config) setConfig({ ...DEFAULT_CONFIG, ...data.config });
            if (data.gastosPorMes) setGastosPorMes(data.gastosPorMes);
            if (data.metas) setMetas(data.metas);
            if (data.ajustesAhorro) setAjustesAhorro(data.ajustesAhorro);
            if (data.saldosRealesAhorro) setSaldosRealesAhorro(data.saldosRealesAhorro);
            if (data.saldosRealesGastos) setSaldosRealesGastos(data.saldosRealesGastos);
        }
        setLoaded(true);
    }, []);

    // Auto-guardado
    useEffect(() => {
        if (!loaded) return;
        setSaveState("saving");
        const t = setTimeout(() => {
            saveData({ config, gastosPorMes, metas, ajustesAhorro, saldosRealesAhorro, saldosRealesGastos });
            setSaveState("saved");
        }, 500);
        return () => clearTimeout(t);
    }, [config, gastosPorMes, metas, ajustesAhorro, saldosRealesAhorro, saldosRealesGastos, loaded]);

    // Proyección
    const proyeccion = useMemo(
        () => generarProyeccion(config, gastosPorMes, metas, ajustesAhorro, saldosRealesAhorro, saldosRealesGastos),
        [config, gastosPorMes, metas, ajustesAhorro, saldosRealesAhorro, saldosRealesGastos]
    );

    // ─── Tab: Gastos ────────────────────────────────────────────────────────────
    const [selectedGastoMonth, setSelectedGastoMonth] = useState(config.mesInicio);
    useEffect(() => {
        if (!proyeccion.find(f => f.mes === selectedGastoMonth)) setSelectedGastoMonth(config.mesInicio);
    }, [config.mesInicio]);

    const filaSeleccionada = proyeccion.find(f => f.mes === selectedGastoMonth) || proyeccion[0];
    const gastosDelMesSel = gastosPorMes[selectedGastoMonth] || [];
    const usadoDelMesSel = gastosDelMesSel.reduce((s, g) => s + (Number(g.monto) || 0), 0);
    const disponibleMesSel = filaSeleccionada?.disponibleBase || 0;
    const restanteMesSel = disponibleMesSel - usadoDelMesSel;

    const [nuevoGasto, setNuevoGasto] = useState({ concepto: "", monto: "" });
    const [errorGasto, setErrorGasto] = useState("");

    const agregarGasto = useCallback(() => {
        const monto = Number(nuevoGasto.monto);
        if (!nuevoGasto.concepto.trim()) { setErrorGasto("Ponle un nombre al gasto."); return; }
        if (!monto || monto <= 0) { setErrorGasto("El monto debe ser mayor a 0."); return; }
        if (usadoDelMesSel + monto > disponibleMesSel + 0.001) {
            setErrorGasto(`Te pasas del disponible de ${monthLabel(selectedGastoMonth)}. Quedan $${fmt(restanteMesSel)}.`);
            return;
        }
        setGastosPorMes(prev => ({
            ...prev,
            [selectedGastoMonth]: [...(prev[selectedGastoMonth] || []), { id: uid(), concepto: nuevoGasto.concepto.trim(), monto }],
        }));
        setNuevoGasto({ concepto: "", monto: "" });
        setErrorGasto("");
    }, [nuevoGasto, usadoDelMesSel, disponibleMesSel, selectedGastoMonth, restanteMesSel]);

    const borrarGasto = (id) =>
        setGastosPorMes(prev => ({ ...prev, [selectedGastoMonth]: (prev[selectedGastoMonth] || []).filter(g => g.id !== id) }));

    const ajustesDelMesSel = ajustesAhorro[selectedGastoMonth] || [];
    const [nuevoAjuste, setNuevoAjuste] = useState({ concepto: "", monto: "", tipo: "retiro" });
    const [errorAjuste, setErrorAjuste] = useState("");

    const agregarAjuste = useCallback(() => {
        const montoAbs = Number(nuevoAjuste.monto);
        if (!nuevoAjuste.concepto.trim()) { setErrorAjuste("Ponle un nombre al retiro/aporte."); return; }
        if (!montoAbs || montoAbs <= 0) { setErrorAjuste("El monto debe ser mayor a 0."); return; }
        const monto = nuevoAjuste.tipo === "retiro" ? -montoAbs : montoAbs;

        setAjustesAhorro(prev => ({
            ...prev,
            [selectedGastoMonth]: [...(prev[selectedGastoMonth] || []), { id: uid(), concepto: nuevoAjuste.concepto.trim(), monto }],
        }));
        setNuevoAjuste({ concepto: "", monto: "", tipo: "retiro" });
        setErrorAjuste("");
    }, [nuevoAjuste, selectedGastoMonth]);

    const borrarAjuste = (id) =>
        setAjustesAhorro(prev => ({ ...prev, [selectedGastoMonth]: (prev[selectedGastoMonth] || []).filter(g => g.id !== id) }));

    // ─── Tab: Metas ─────────────────────────────────────────────────────────────
    const [nuevaMeta, setNuevaMeta] = useState({ nombre: "", categoria: "", precio: "", prioridad: "Media" });
    const [selectedMetaIds, setSelectedMetaIds] = useState([]);

    const agregarMeta = () => {
        if (!nuevaMeta.nombre.trim() || !Number(nuevaMeta.precio)) return;
        setMetas(prev => [...prev, {
            id: uid(), nombre: nuevaMeta.nombre.trim(), categoria: nuevaMeta.categoria.trim(),
            precio: Number(nuevaMeta.precio), prioridad: nuevaMeta.prioridad, comprado: false, mesComprado: null
        }]);
        setNuevaMeta({ nombre: "", categoria: "", precio: "", prioridad: "Media" });
    };
    const borrarMeta = (id) => { setMetas(prev => prev.filter(m => m.id !== id)); setSelectedMetaIds(prev => prev.filter(x => x !== id)); };
    const toggleComprado = (id) => {
        setMetas(prev => prev.map(m => {
            if (m.id !== id) return m;
            if (m.comprado) return { ...m, comprado: false, mesComprado: null };
            const proy = generarProyeccion(config, gastosPorMes, prev.filter(x => x.id !== id || !x.comprado));
            return { ...m, comprado: true, mesComprado: primerMesQueAlcanza(proy, m.precio) || config.mesInicio };
        }));
    };
    const cambiarMesComprado = (id, mes) => setMetas(prev => prev.map(m => m.id === id ? { ...m, mesComprado: mes } : m));
    const toggleSeleccionSim = (id) => setSelectedMetaIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

    const totalSeleccionSim = metas.filter(m => selectedMetaIds.includes(m.id) && !m.comprado).reduce((s, m) => s + m.precio, 0);
    const mesAlcanceSim = primerMesQueAlcanza(proyeccion, totalSeleccionSim);
    const metasPendientes = metas.filter(m => !m.comprado);
    const proximaMeta = useMemo(() => {
        let mejor = null;
        for (const m of metasPendientes) {
            const mes = primerMesQueAlcanza(proyeccion, m.precio);
            if (mes && (!mejor || compareKeys(mes, mejor.mes) < 0)) mejor = { meta: m, mes };
        }
        return mejor;
    }, [metasPendientes, proyeccion]);

    // ─── Chart data ─────────────────────────────────────────────────────────────
    const chartData = proyeccion.map(f => ({
        label: monthLabel(f.mes),
        Ahorro: Math.round(f.ahorroAcumulado * 100) / 100,
        Gastos: Math.round(f.gastosAcumulado * 100) / 100,
    }));

    const tabs = [
        { id: "resumen", label: "Resumen" },
        { id: "config", label: "Configuración" },
        { id: "movimientos", label: "Control mensual" },
        { id: "metas", label: "Metas" },
    ];

    const ultimaFila = proyeccion[proyeccion.length - 1];

    const metasAlcanzablesPorMes = {};
    metasPendientes.forEach(m => {
        const mes = primerMesQueAlcanza(proyeccion, m.precio);
        if (mes) {
            if (!metasAlcanzablesPorMes[mes]) metasAlcanzablesPorMes[mes] = [];
            metasAlcanzablesPorMes[mes].push(m);
        }
    });

    const metasCompradasPorMes = {};
    metas.filter(m => m.comprado).forEach(m => {
        if (!metasCompradasPorMes[m.mesComprado]) metasCompradasPorMes[m.mesComprado] = [];
        metasCompradasPorMes[m.mesComprado].push(m);
    });

    const currentMonthKey = nowKey();
    let filaActual = proyeccion.find(f => f.mes === currentMonthKey);
    if (!filaActual) {
        if (compareKeys(currentMonthKey, config.mesInicio) < 0) {
            filaActual = { mes: config.mesInicio, ahorroAcumulado: config.ahorroActual, gastosAcumulado: config.gastosActual, label: "Inicio" };
        } else {
            filaActual = ultimaFila || { mes: currentMonthKey, ahorroAcumulado: 0, gastosAcumulado: 0, label: monthLabel(currentMonthKey) };
        }
    }

    // ─── Render ─────────────────────────────────────────────────────────────────
    return (
        <div className="min-h-full w-full bg-[#111827] text-[#F9FAFB]" style={{ fontFamily: "'IBM Plex Sans', sans-serif" }}>
            <style>{FONT_IMPORT}</style>
            <div className="max-w-5xl mx-auto px-5 py-8">

                {/* Header */}
                <div className="flex items-baseline justify-between border-b border-[#F9FAFB]/15 pb-5 mb-6">
                    <div>
                        <div className="text-3xl sm:text-4xl tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-[#10B981] to-[#3B82F6]" style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 800 }}>
                            NovaFin
                        </div>
                        <div className="text-sm text-[#9CA3AF] mt-1 tracking-wide">Simulador de finanzas y metas</div>
                    </div>
                    <div className="text-xs text-[#9CA3AF]" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>
                        {saveState === "saving" ? "guardando…" : saveState === "saved" ? "guardado ✓" : ""}
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex flex-wrap gap-1 mb-6 border-b border-[#F9FAFB]/10">
                    {tabs.map(t => (
                        <button key={t.id} onClick={() => setTab(t.id)}
                            className={`px-4 py-2 text-sm transition-colors border-b-2 -mb-px ${tab === t.id ? "border-[#10B981] text-[#F9FAFB]" : "border-transparent text-[#9CA3AF] hover:text-[#F9FAFB]"}`}>
                            {t.label}
                        </button>
                    ))}
                </div>

                {/* ── RESUMEN ─────────────────────────────────────────────────────────── */}
                {tab === "resumen" && (
                    <div className="space-y-6">
                        {/* Dos cuentas separadas */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {/* Cuenta Ahorro */}
                            <div className="border border-[#10B981]/30 bg-[#10B981]/5 rounded-lg p-4 space-y-3">
                                <div className="flex items-center gap-2">
                                    <span className="w-2 h-2 rounded-full bg-[#10B981]"></span>
                                    <span className="text-xs uppercase tracking-widest text-[#10B981] font-medium">Cuenta Ahorro</span>
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <MiniStat label={`Saldo (hacia fin de mes)`} value={`$${fmt(filaActual.ahorroAcumulado)}`} />
                                    <MiniStat label={`Depósito fijo/mes`} value={`$${fmt(config.ahorroBase)}`} />
                                    <MiniStat label={`Al final (${monthLabel(ultimaFila?.mes || config.mesInicio)})`}
                                        value={`$${fmt(ultimaFila?.ahorroAcumulado || 0)}`} highlight />
                                    <MiniStat label="Proyección" value={`${config.mesesAProyectar} meses`} />
                                </div>
                            </div>

                            {/* Cuenta Gastos */}
                            <div className="border border-[#3B82F6]/30 bg-[#3B82F6]/5 rounded-lg p-4 space-y-3">
                                <div className="flex items-center gap-2">
                                    <span className="w-2 h-2 rounded-full bg-[#3B82F6]"></span>
                                    <span className="text-xs uppercase tracking-widest text-[#3B82F6] font-medium">Cuenta Gastos (disponible)</span>
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <MiniStat label={`Sobrante actual`} value={`$${fmt(filaActual.gastosAcumulado)}`} />
                                    <MiniStat label="Disponible/mes" value={`$${fmt(config.gastoBase - (config.descuentoActivo ? config.descuentoMonto : 0))}`} />
                                    <MiniStat label={`Al final (${monthLabel(ultimaFila?.mes || config.mesInicio)})`} value={`$${fmt(ultimaFila?.gastosAcumulado || 0)}`} highlight color="green" />
                                    <MiniStat label="Descuento activo" value={config.descuentoActivo ? `$${fmt(config.descuentoMonto)}/mes` : "No"} />
                                </div>
                            </div>
                        </div>

                        {/* Banner próxima meta */}
                        {proximaMeta && (
                            <div className="border border-[#10B981]/30 bg-[#10B981]/5 rounded-md px-4 py-3 text-sm">
                                Tu próxima meta alcanzable es <strong>{proximaMeta.meta.nombre}</strong> (${fmt(proximaMeta.meta.precio)}) —
                                la tendrías cubierta en <strong>{monthLabel(proximaMeta.mes, true)}</strong>.
                            </div>
                        )}

                        {/* Gráfica */}
                        <div className="border border-[#F9FAFB]/10 rounded-md p-4">
                            <div className="text-sm text-[#9CA3AF] mb-3">Saldo proyectado por cuenta</div>
                            <div style={{ width: "100%", height: 240 }}>
                                <ResponsiveContainer>
                                    <AreaChart data={chartData} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                                        <defs>
                                            <linearGradient id="gAhorro" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="0%" stopColor="#10B981" stopOpacity={0.4} />
                                                <stop offset="100%" stopColor="#10B981" stopOpacity={0} />
                                            </linearGradient>
                                            <linearGradient id="gGastos" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="0%" stopColor="#3B82F6" stopOpacity={0.4} />
                                                <stop offset="100%" stopColor="#3B82F6" stopOpacity={0} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#F9FAFB22" vertical={false} />
                                        <XAxis dataKey="label" tick={{ fill: "#9CA3AF", fontSize: 11 }} axisLine={{ stroke: "#F9FAFB22" }} tickLine={false} interval={1} />
                                        <YAxis tick={{ fill: "#9CA3AF", fontSize: 11 }} axisLine={false} tickLine={false} width={55} />
                                        <Tooltip
                                            contentStyle={{ background: "#1F2937", border: "1px solid #F9FAFB22", borderRadius: 6, fontSize: 12 }}
                                            labelStyle={{ color: "#F9FAFB" }}
                                            formatter={(v, name) => [`$${fmt(v)}`, name]}
                                        />
                                        <Legend wrapperStyle={{ fontSize: 12, color: "#9CA3AF", paddingTop: 8 }} />
                                        <Area type="monotone" dataKey="Ahorro" stroke="#10B981" strokeWidth={2} fill="url(#gAhorro)" />
                                        <Area type="monotone" dataKey="Gastos" stroke="#3B82F6" strokeWidth={2} fill="url(#gGastos)" />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        {/* Tabla mensual con dos cuentas separadas */}
                        <div className="border border-[#F9FAFB]/10 rounded-md overflow-x-auto">
                            <table className="w-full text-sm" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>
                                <thead>
                                    <tr className="text-left text-[#9CA3AF] border-b border-[#F9FAFB]/10 text-xs">
                                        <th className="px-3 py-2 font-normal">Mes</th>
                                        <th className="px-3 py-2 font-normal text-right text-[#10B981]/70">+ Base</th>
                                        <th className="px-3 py-2 font-normal text-right text-[#10B981]">Retiros / Extras</th>
                                        <th className="px-3 py-2 font-normal text-right text-[#10B981]">- Compras</th>
                                        <th className="px-3 py-2 font-normal text-right text-[#10B981]">Saldo Ahorro</th>
                                        <th className="px-3 py-2 font-normal text-right text-[#3B82F6]/70">+ Disp.</th>
                                        <th className="px-3 py-2 font-normal text-right text-[#EF4444]">- Gastado</th>
                                        <th className="px-3 py-2 font-normal text-right text-[#3B82F6]">Sobrante acum.</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {proyeccion.map((f, i) => {
                                        const alcances = metasAlcanzablesPorMes[f.mes] || [];
                                        const compras = metasCompradasPorMes[f.mes] || [];
                                        return (
                                            <tr key={f.mes} className={i % 2 === 0 ? "hover:bg-[#F9FAFB]/[0.04]" : "bg-[#F9FAFB]/[0.02] hover:bg-[#F9FAFB]/[0.04]"}>
                                                <td className="px-3 py-2 capitalize whitespace-nowrap" style={{ fontFamily: "'IBM Plex Sans', sans-serif" }}>
                                                    <div>
                                                        {f.label}
                                                        {f.tieneRealAhorro && <span title="Saldo real registrado" className="ml-1 text-[#10B981] text-[10px]">★</span>}
                                                        {f.tieneRealGastos && <span title="Sobrante real registrado" className="ml-1 text-[#3B82F6] text-[10px]">★</span>}
                                                    </div>
                                                    {config.fechaNacimiento && config.fechaNacimiento.length >= 7 && f.mes.substring(5, 7) === config.fechaNacimiento.substring(5, 7) && (
                                                        <div className="mt-1.5 mb-0.5 text-[10px] bg-[#F59E0B]/15 text-[#FEF3C7] border border-[#F59E0B]/30 py-0.5 px-1.5 rounded inline-block w-fit shadow-sm">
                                                            🎂 Cumples {Number(f.mes.substring(0, 4)) - Number(config.fechaNacimiento.substring(0, 4))} años
                                                        </div>
                                                    )}
                                                    {(alcances.length > 0 || compras.length > 0) && (
                                                        <div className="flex flex-col gap-1 mt-1.5 mb-0.5">
                                                            {compras.map(m => (
                                                                <div key={m.id} className="text-[10px] bg-[#F9FAFB]/5 text-[#F9FAFB] border border-[#F9FAFB]/10 py-0.5 px-1.5 rounded inline-block w-fit shadow-sm">
                                                                    🛍️ Compra: {m.nombre}
                                                                </div>
                                                            ))}
                                                            {alcances.map(m => (
                                                                <div key={m.id} className="text-[10px] bg-[#10B981]/10 text-[#10B981] border border-[#10B981]/20 py-0.5 px-1.5 rounded inline-block w-fit shadow-sm">
                                                                    🎯 Alcanzable: {m.nombre}
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}
                                                </td>
                                                <td className="px-3 py-2 text-right text-[#10B981]/50 text-xs">{fmt(f.depositoBase)}</td>
                                                <td className={`px-3 py-2 text-right ${f.ajustesDelMes < 0 ? 'text-[#EF4444]' : f.ajustesDelMes > 0 ? 'text-[#3B82F6]' : 'text-[#9CA3AF]'}`}>
                                                    {f.ajustesDelMes !== 0 ? fmt(f.ajustesDelMes) : "—"}
                                                </td>
                                                <td className="px-3 py-2 text-right text-[#9CA3AF]">{f.comprasDelMes ? `-${fmt(f.comprasDelMes)}` : "—"}</td>
                                                <td className="px-3 py-2 text-right font-medium text-[#10B981] bg-[#10B981]/5 shadow-[inset_0_-1px_0_0_rgba(237,232,222,0.05)] border-x border-[#F9FAFB]/[0.02]">{fmt(f.ahorroAcumulado)}</td>
                                                <td className="px-3 py-2 text-right text-[#3B82F6]/50 text-xs">{fmt(f.disponibleBase)}</td>
                                                <td className="px-3 py-2 text-right text-[#EF4444]/90">{f.gastado ? `-${fmt(f.gastado)}` : "—"}</td>
                                                <td className="px-3 py-2 text-right font-medium text-[#3B82F6] bg-[#3B82F6]/5 shadow-[inset_0_-1px_0_0_rgba(237,232,222,0.05)] border-l border-[#F9FAFB]/[0.02]">{fmt(f.gastosAcumulado)}</td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* ── SALDOS REALES ───────────────────────────────────────────────────── */}


                {/* ── CONFIGURACIÓN ───────────────────────────────────────────────────── */}
                {tab === "config" && (
                    <div className="space-y-5 max-w-xl">
                        <Field label="Sueldo mensual ($)">
                            <Input type="number" value={config.sueldo} onChange={v => setConfig({ ...config, sueldo: Number(v) })} />
                        </Field>
                        <div className="border border-[#10B981]/20 rounded-md p-4 space-y-4">
                            <div className="text-xs uppercase tracking-widest text-[#10B981]">Cuenta Ahorro</div>
                            <Field label="Depósito fijo mensual ($)">
                                <Input type="number" value={config.ahorroBase} onChange={v => setConfig({ ...config, ahorroBase: Number(v) })} />
                            </Field>

                        </div>
                        <div className="border border-[#3B82F6]/20 rounded-md p-4 space-y-4">
                            <div className="text-xs uppercase tracking-widest text-[#3B82F6]">Cuenta Gastos</div>
                            <Field label="Disponible mensual base ($)">
                                <Input type="number" value={config.gastoBase} onChange={v => setConfig({ ...config, gastoBase: Number(v) })} />
                            </Field>

                        </div>

                        <div className="border-t border-[#F9FAFB]/10 py-5 my-2 space-y-4">
                            <h3 className="text-[13px] uppercase tracking-widest text-[#9CA3AF] font-semibold">Datos Personales & Milestones</h3>
                            <Field label="Fecha de Nacimiento (Opcional)">
                                <Input type="date" value={config.fechaNacimiento || ""} onChange={v => setConfig({ ...config, fechaNacimiento: v })} />
                            </Field>
                            <p className="text-[10px] text-[#9CA3AF] leading-relaxed">
                                Si ingresas tu fecha de nacimiento, verás un recordatorio en tu tabla de resumen cuando sea tu mes de cumpleaños,
                                para que puedas motivarte comparando la edad que tendrás frente a las metas que vayas alcanzando.
                            </p>
                        </div>

                        <Field label="Mes de inicio de la simulación">
                            <Input type="month" value={config.mesInicio} onChange={v => setConfig({ ...config, mesInicio: v })} />
                        </Field>
                        <Field label="Meses a proyectar">
                            <Input type="number" value={config.mesesAProyectar} onChange={v => setConfig({ ...config, mesesAProyectar: Math.max(1, Number(v)) })} />
                        </Field>
                        <div className="border-t border-[#F9FAFB]/10 pt-5">
                            <label className="flex items-center gap-2 text-sm mb-3 cursor-pointer">
                                <input type="checkbox" checked={config.descuentoActivo}
                                    onChange={e => setConfig({ ...config, descuentoActivo: e.target.checked })} className="accent-[#10B981]" />
                                Descuento temporal del disponible mensual (ej. ayuda a un familiar)
                            </label>
                            {config.descuentoActivo && (
                                <div className="grid grid-cols-2 gap-3">
                                    <Field label="Monto del descuento ($)">
                                        <Input type="number" value={config.descuentoMonto} onChange={v => setConfig({ ...config, descuentoMonto: Number(v) })} />
                                    </Field>
                                    <Field label="Último mes del descuento">
                                        <Input type="month" value={config.descuentoMesFin} onChange={v => setConfig({ ...config, descuentoMesFin: v })} />
                                    </Field>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* ── MOVIMIENTOS POR MES ─────────────────────────────────────────────── */}
                {tab === "movimientos" && (
                    <div className="space-y-6">
                        <div className="flex items-center justify-between bg-[#10B981]/5 border border-[#10B981]/20 p-4 rounded-md">
                            <div>
                                <div className="text-sm text-[#9CA3AF] mb-1">Registrando movimientos para el mes de:</div>
                                <select value={selectedGastoMonth} onChange={e => setSelectedGastoMonth(e.target.value)}
                                    className="bg-[#1F2937] border border-[#10B981]/40 focus:border-[#10B981] rounded px-3 py-1.5 text-base capitalize text-[#10B981] font-medium outline-none">
                                    {proyeccion.map(f => <option key={f.mes} value={f.mes}>{f.label}</option>)}
                                </select>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Panel Gastos */}
                            <div className="space-y-4">
                                <h3 className="text-[#3B82F6] uppercase tracking-widest text-xs font-semibold border-b border-[#3B82F6]/20 pb-2">Gastos (Cuenta Disponible)</h3>
                                <div className="grid grid-cols-2 gap-2">
                                    <StatCard label="Disponible" value={`$${fmt(disponibleMesSel)}`} />
                                    <StatCard label="Restante" value={`$${fmt(restanteMesSel)}`} warn={restanteMesSel < 0} />
                                </div>
                                <div className="border border-[#F9FAFB]/10 rounded-md divide-y divide-[#F9FAFB]/10 min-h-[120px]">
                                    {gastosDelMesSel.length === 0 && <div className="px-4 py-8 text-sm text-[#9CA3AF]/60 text-center">Sin gastos registrados</div>}
                                    {gastosDelMesSel.map(g => (
                                        <div key={g.id} className="flex items-center justify-between px-3 py-2 text-sm text-[#F9FAFB]/90 hover:bg-[#F9FAFB]/[0.02]">
                                            <span className="truncate pr-2">{g.concepto}</span>
                                            <div className="flex items-center gap-3 shrink-0">
                                                <span style={{ fontFamily: "'IBM Plex Mono', monospace" }} className="text-[#EF4444]">-${fmt(g.monto)}</span>
                                                <button onClick={() => borrarGasto(g.id)} className="text-[#9CA3AF] hover:text-[#EF4444] text-xs">✕</button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                <div className="flex flex-col gap-2 rounded-md bg-[#1F2937] p-3 border border-[#F9FAFB]/10">
                                    <Input value={nuevoGasto.concepto} onChange={v => setNuevoGasto({ ...nuevoGasto, concepto: v })} placeholder="Concepto (ej. mercado)" />
                                    <div className="flex gap-2">
                                        <div className="flex-1">
                                            <Input type="number" value={nuevoGasto.monto} onChange={v => setNuevoGasto({ ...nuevoGasto, monto: v })} placeholder="Monto ($)" />
                                        </div>
                                        <button onClick={agregarGasto} className="px-3 py-2 rounded bg-[#3B82F6]/20 text-[#3B82F6] hover:bg-[#3B82F6]/30 text-sm font-medium transition-colors">Añadir</button>
                                    </div>
                                    {errorGasto && <div className="text-xs text-[#EF4444]">{errorGasto}</div>}
                                </div>
                                <div className="mt-4 pt-4 border-t border-[#3B82F6]/20">
                                    <label className="block text-xs uppercase tracking-widest text-[#3B82F6] mb-2 font-medium">Cierre Real del Mes</label>
                                    <div className="flex gap-2">
                                        <div className="relative flex-1">
                                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#3B82F6]/50 text-sm">$</span>
                                            <input
                                                type="number"
                                                value={saldosRealesGastos[selectedGastoMonth] || ""}
                                                onChange={e => setSaldosRealesGastos({ ...saldosRealesGastos, [selectedGastoMonth]: e.target.value })}
                                                className="w-full bg-[#1F2937] border border-[#3B82F6]/30 focus:border-[#3B82F6] rounded pl-7 pr-3 py-1.5 text-sm outline-none placeholder-[#9CA3AF]/40"
                                                placeholder={`Proyectado: $${fmt(filaSeleccionada?.gastosAcumulado)}`}
                                            />
                                        </div>
                                        {saldosRealesGastos[selectedGastoMonth] && (
                                            <button onClick={() => { const ns = { ...saldosRealesGastos }; delete ns[selectedGastoMonth]; setSaldosRealesGastos(ns); }}
                                                className="px-3 rounded border border-[#EF4444]/30 text-[#EF4444] hover:bg-[#EF4444]/10 text-xs transition-colors">Borrar (usar proy.)</button>
                                        )}
                                    </div>
                                    <p className="text-[10px] text-[#9CA3AF] mt-1.5 leading-relaxed">Si ingresas un valor real con el que terminaste el mes, este modificará toda la proyección de Gastos del próximo mes en adelante.</p>
                                </div>
                            </div>

                            {/* Panel Retiros/Aportes Ahorro */}
                            <div className="space-y-4">
                                <h3 className="text-[#10B981] uppercase tracking-widest text-xs font-semibold border-b border-[#10B981]/20 pb-2">Retiros / Extras (Cuenta Ahorro)</h3>
                                <div className="grid grid-cols-2 gap-2">
                                    <StatCard label="Aporte Base" value={`$${fmt(filaSeleccionada?.depositoBase)}`} />
                                    <StatCard label="Total del mes" value={`$${fmt(filaSeleccionada?.depositoTotal)}`} accent />
                                </div>
                                <div className="border border-[#F9FAFB]/10 rounded-md divide-y divide-[#F9FAFB]/10 min-h-[120px]">
                                    {ajustesDelMesSel.length === 0 && <div className="px-4 py-8 text-sm text-[#9CA3AF]/60 text-center">Sin retiros ni aportes extra</div>}
                                    {ajustesDelMesSel.map(g => (
                                        <div key={g.id} className="flex items-center justify-between px-3 py-2 text-sm text-[#F9FAFB]/90 hover:bg-[#F9FAFB]/[0.02]">
                                            <span className="truncate pr-2">{g.concepto}</span>
                                            <div className="flex items-center gap-3 shrink-0">
                                                <span style={{ fontFamily: "'IBM Plex Mono', monospace" }} className={g.monto < 0 ? 'text-[#EF4444]' : 'text-[#3B82F6]'}>
                                                    {g.monto > 0 ? '+' : ''}{fmt(g.monto)}
                                                </span>
                                                <button onClick={() => borrarAjuste(g.id)} className="text-[#9CA3AF] hover:text-[#EF4444] text-xs">✕</button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                <div className="flex flex-col gap-2 rounded-md bg-[#1F2937] p-3 border border-[#F9FAFB]/10">
                                    <Input value={nuevoAjuste.concepto} onChange={v => setNuevoAjuste({ ...nuevoAjuste, concepto: v })} placeholder="Motivo (ej. Navidad)" />
                                    <div className="flex gap-2">
                                        <select value={nuevoAjuste.tipo} onChange={e => setNuevoAjuste({ ...nuevoAjuste, tipo: e.target.value })}
                                            className="w-1/3 bg-[#111827] border border-[#F9FAFB]/15 rounded px-2 text-sm focus:outline-none focus:border-[#10B981]/60">
                                            <option value="retiro">Retiro (-)</option>
                                            <option value="aporte">Aporte (+)</option>
                                        </select>
                                        <div className="flex-1">
                                            <Input type="number" value={nuevoAjuste.monto} onChange={v => setNuevoAjuste({ ...nuevoAjuste, monto: v })} placeholder="Monto ($)" />
                                        </div>
                                        <button onClick={agregarAjuste} className="px-3 py-2 rounded bg-[#10B981]/20 text-[#10B981] hover:bg-[#10B981]/30 text-sm font-medium transition-colors">Añadir</button>
                                    </div>
                                    {errorAjuste && <div className="text-xs text-[#EF4444]">{errorAjuste}</div>}
                                </div>
                                <div className="mt-4 pt-4 border-t border-[#10B981]/20">
                                    <label className="block text-xs uppercase tracking-widest text-[#10B981] mb-2 font-medium">Cierre Real del Mes</label>
                                    <div className="flex gap-2">
                                        <div className="relative flex-1">
                                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#10B981]/50 text-sm">$</span>
                                            <input
                                                type="number"
                                                value={saldosRealesAhorro[selectedGastoMonth] || ""}
                                                onChange={e => setSaldosRealesAhorro({ ...saldosRealesAhorro, [selectedGastoMonth]: e.target.value })}
                                                className="w-full bg-[#1F2937] border border-[#10B981]/30 focus:border-[#10B981] rounded pl-7 pr-3 py-1.5 text-sm outline-none placeholder-[#9CA3AF]/40"
                                                placeholder={`Proyectado: $${fmt(filaSeleccionada?.ahorroAcumulado)}`}
                                            />
                                        </div>
                                        {saldosRealesAhorro[selectedGastoMonth] && (
                                            <button onClick={() => { const ns = { ...saldosRealesAhorro }; delete ns[selectedGastoMonth]; setSaldosRealesAhorro(ns); }}
                                                className="px-3 rounded border border-[#EF4444]/30 text-[#EF4444] hover:bg-[#EF4444]/10 text-xs transition-colors">Borrar (usar proy.)</button>
                                        )}
                                    </div>
                                    <p className="text-[10px] text-[#9CA3AF] mt-1.5 leading-relaxed">Si determinas un cierre real final del mes, será el punto de partida en la Cuenta de Ahorro para el siguiente mes.</p>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* ── METAS ───────────────────────────────────────────────────────────── */}
                {tab === "metas" && (
                    <div className="space-y-6">
                        <div className="flex flex-wrap items-end gap-3 border border-[#F9FAFB]/10 rounded-md p-4">
                            <Field label="Artículo" className="flex-1 min-w-[160px]">
                                <Input value={nuevaMeta.nombre} onChange={v => setNuevaMeta({ ...nuevaMeta, nombre: v })} placeholder="ej. Moto XYZ" />
                            </Field>
                            <Field label="Categoría" className="w-36">
                                <Input value={nuevaMeta.categoria} onChange={v => setNuevaMeta({ ...nuevaMeta, categoria: v })} placeholder="opcional" />
                            </Field>
                            <Field label="Precio ($)" className="w-28">
                                <Input type="number" value={nuevaMeta.precio} onChange={v => setNuevaMeta({ ...nuevaMeta, precio: v })} />
                            </Field>
                            <Field label="Prioridad" className="w-28">
                                <select value={nuevaMeta.prioridad} onChange={e => setNuevaMeta({ ...nuevaMeta, prioridad: e.target.value })}
                                    className="w-full bg-[#1F2937] border border-[#F9FAFB]/15 rounded px-2 py-2 text-sm">
                                    {PRIORIDADES.map(p => <option key={p} value={p}>{p}</option>)}
                                </select>
                            </Field>
                            <button onClick={agregarMeta}
                                className="px-4 py-2 rounded bg-[#10B981] text-[#111827] text-sm font-medium hover:bg-[#dab35c] transition-colors">
                                Añadir
                            </button>
                        </div>
                        <div className="border border-[#F9FAFB]/10 rounded-md overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="text-left text-[#9CA3AF] border-b border-[#F9FAFB]/10 text-xs">
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
                                <tbody className="divide-y divide-[#F9FAFB]/5">
                                    {metas.map(m => {
                                        const mesAlcance = !m.comprado ? primerMesQueAlcanza(proyeccion, m.precio) : null;
                                        return (
                                            <tr key={m.id}>
                                                <td className="px-3 py-2">
                                                    {!m.comprado && (
                                                        <input type="checkbox" checked={selectedMetaIds.includes(m.id)}
                                                            onChange={() => toggleSeleccionSim(m.id)} className="accent-[#3B82F6]" />
                                                    )}
                                                </td>
                                                <td className="px-3 py-2">
                                                    <div>{m.nombre}</div>
                                                    {mesAlcance && <div className="text-xs text-[#3B82F6]">alcanzable en {monthLabel(mesAlcance)}</div>}
                                                </td>
                                                <td className="px-3 py-2 text-[#9CA3AF]">{m.categoria || "—"}</td>
                                                <td className="px-3 py-2">
                                                    <span className={`text-xs px-2 py-0.5 rounded border ${PRIORIDAD_COLOR[m.prioridad]}`}>{m.prioridad}</span>
                                                </td>
                                                <td className="px-3 py-2 text-right" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>${fmt(m.precio)}</td>
                                                <td className="px-3 py-2">
                                                    <input type="checkbox" checked={m.comprado} onChange={() => toggleComprado(m.id)} className="accent-[#10B981]" />
                                                </td>
                                                <td className="px-3 py-2">
                                                    {m.comprado ? (
                                                        <select value={m.mesComprado || ""} onChange={e => cambiarMesComprado(m.id, e.target.value)}
                                                            className="bg-[#1F2937] border border-[#F9FAFB]/15 rounded px-2 py-1 text-xs capitalize">
                                                            {proyeccion.map(f => <option key={f.mes} value={f.mes}>{f.label}</option>)}
                                                        </select>
                                                    ) : (
                                                        <span className="text-[#9CA3AF] text-xs">—</span>
                                                    )}
                                                </td>
                                                <td className="px-3 py-2">
                                                    <button onClick={() => borrarMeta(m.id)} className="text-[#9CA3AF] hover:text-[#EF4444] text-xs">quitar</button>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                    {metas.length === 0 && (
                                        <tr><td colSpan={8} className="px-3 py-6 text-center text-[#9CA3AF] text-sm">
                                            Todavía no has añadido artículos a tu lista de metas.
                                        </td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                        {selectedMetaIds.length > 0 && (
                            <div className="border border-[#10B981]/30 bg-[#10B981]/5 rounded-md px-4 py-3 text-sm">
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

                {/* ── FOOTER ──────────────────────────────────────────────────────────── */}
                <footer className="mt-16 pt-8 pb-4 border-t border-[#F9FAFB]/10 text-center">
                    <p className="text-[11px] uppercase tracking-widest text-[#9CA3AF]">
                        Diseñado y desarrollado por <strong className="text-[#F9FAFB]">Ing. Mateo Pilco</strong>
                    </p>
                </footer>
            </div>
        </div>
    );
}



// ─── Small components ─────────────────────────────────────────────────────────
function MiniStat({ label, value, highlight, color = "gold" }) {
    const textColor = highlight ? (color === "green" ? "text-[#3B82F6]" : "text-[#10B981]") : "text-[#F9FAFB]";
    return (
        <div>
            <div className="text-xs text-[#9CA3AF] mb-0.5">{label}</div>
            <div className={`text-base font-medium ${textColor}`} style={{ fontFamily: "'IBM Plex Mono',monospace" }}>{value}</div>
        </div>
    );
}

function StatCard({ label, value, accent, warn }) {
    return (
        <div className="border border-[#F9FAFB]/10 rounded-md px-4 py-3">
            <div className="text-xs text-[#9CA3AF] mb-1">{label}</div>
            <div className={`text-lg ${warn ? "text-[#EF4444]" : accent ? "text-[#10B981]" : "text-[#F9FAFB]"}`}
                style={{ fontFamily: "'IBM Plex Mono',monospace" }}>{value}</div>
        </div>
    );
}

function Field({ label, children, className = "" }) {
    return (
        <div className={className}>
            <div className="text-xs text-[#9CA3AF] mb-1">{label}</div>
            {children}
        </div>
    );
}

function Input({ type = "text", value, onChange, placeholder }) {
    return (
        <input type={type} value={value} placeholder={placeholder} onChange={e => onChange(e.target.value)}
            className="w-full bg-[#1F2937] border border-[#F9FAFB]/15 rounded px-3 py-2 text-sm focus:outline-none focus:border-[#10B981]/60" />
    );
}

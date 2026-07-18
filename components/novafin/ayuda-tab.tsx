"use client"

import { useState } from "react"
import { ChevronDown, PiggyBank, Settings2, Sparkles, Target, Wallet, Lightbulb, Activity, RefreshCw, AlertCircle, Coins, ArrowRightLeft, Send, MessageSquare } from "lucide-react"
import { Panel } from "./ui-kit"
import { cn } from "@/lib/utils"

export function AyudaTab() {
  return (
    <div className="mx-auto max-w-4xl space-y-6 pb-20">
      <Panel className="p-6 sm:p-8 bg-gradient-to-br from-background to-secondary/30">
        <div className="mb-4 flex items-center gap-3">
          <span className="grid size-10 place-items-center rounded-xl bg-primary shadow-lg shadow-primary/20 text-primary-foreground">
            <Sparkles className="size-5" />
          </span>
          <div>
            <h2 className="font-display text-2xl font-bold text-foreground">Centro de Ayuda NovaFin</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Aprende a dominar tu simulador financiero y proyectar escenarios exactos.
            </p>
          </div>
        </div>
      </Panel>

      {/* FAQs */}
      <h3 className="font-display text-lg font-bold text-foreground px-1 mt-8 mb-2 flex items-center gap-2">
        <Settings2 className="size-5 text-muted-foreground" />
        Configuración Inicial y Cuentas
      </h3>
      <div className="space-y-3">
        <FaqItem title="¿Cómo configuro mi perfil de cuentas?">
          En la pestaña <strong>Configuración</strong>, puedes cambiar tu modelo (Single, Dual o Custom).
          <ul className="mt-3 space-y-2 text-sm text-muted-foreground ml-4 list-disc marker:text-primary/50">
            <li><strong>Single (Una sola cuenta):</strong> Ideal si toda tu plata entra y sale del mismo lugar.</li>
            <li><strong>Dual (Ahorro y Gastos):</strong> El modelo clásico. Separas intencionalmente un presupuesto para quemar de tu fondo intocable de seguridad.</li>
            <li><strong>Custom (Personalizado):</strong> Crea tantas cuentas ("Sobres") como quieras. Podrás repartir tu sueldo exacto entre ellas.</li>
          </ul>
        </FaqItem>
        <FaqItem title="Múltiples Descuentos y Préstamos Temporales">
          <p className="text-sm text-muted-foreground leading-relaxed">
            Si te comprometes a pagar una deuda, un préstamo o a dar una cuota fija a un familiar, puedes registrarlo en la sección <strong>Descuentos o Préstamos Activos</strong> de la Configuración.
          </p>
          <ul className="mt-3 space-y-2 text-sm text-muted-foreground ml-4 list-disc marker:text-primary/50">
            <li>Puedes añadir <strong>múltiples descuentos</strong> en simultáneo. Todos se apilarán y restarán del mes respectivo de forma automática.</li>
            <li>Puedes elegir exactamente de qué cuenta afectará el descuento (Gastos, Ahorro, etc).</li>
            <li>Un descuento que no tenga mes límite (Hasta) se aplicará indefinidamente.</li>
          </ul>
        </FaqItem>
      </div>

      <h3 className="font-display text-lg font-bold text-foreground px-1 mt-10 mb-2 flex items-center gap-2">
        <Activity className="size-5 text-muted-foreground" />
        Dominando el Control Mensual
      </h3>
      <div className="space-y-3">
        <FaqItem title="Diferencia: Gastos vs Retiros vs Ingresos Extra" defaultOpen>
          <p className="mb-4 text-sm text-muted-foreground">La pestaña Control Mensual es el corazón táctico de NovaFin. Aquí está cuándo usar cada uno:</p>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl bg-accent/[0.04] border border-accent/20 p-4">
              <div className="flex items-center gap-2 text-accent font-semibold text-sm mb-2">
                <Wallet className="size-4" /> Gastos
              </div>
              <p className="text-xs text-muted-foreground">
                El supermercado, la luz, el plan de celular. Descuenta el dinero de tu saldo "Disponible". 
                <strong>Úsalo para tu estilo de vida.</strong>
              </p>
            </div>
            <div className="rounded-xl bg-primary/[0.04] border border-primary/20 p-4">
              <div className="flex items-center gap-2 text-primary font-semibold text-sm mb-2">
                <PiggyBank className="size-4" /> Retiros / Ajustes
              </div>
              <p className="text-xs text-muted-foreground">
                Para emergencias mecánicas o médicas. Saca dinero directamente de tu CAPITAL/Ahorros sin que afecte el presupuesto del súper. 
              </p>
            </div>
            <div className="rounded-xl bg-milestone/[0.04] border border-milestone/20 p-4">
              <div className="flex items-center gap-2 text-milestone font-semibold text-sm mb-2">
                <Coins className="size-4" /> Ingresos Extra
              </div>
              <p className="text-xs text-muted-foreground">
                Bonos, regalos o un décimo tercer sueldo. Registra el total y el sistema te obligará a <strong>distribuirlo matemáticamente</strong> entre las cuentas.
              </p>
            </div>
          </div>
        </FaqItem>

        <FaqItem title="¿Cuándo hacer un Aporte Extra en vez de un Ingreso Extra?">
          <p className="text-sm text-muted-foreground mb-3">Aunque matemáticamente se parecen (dinero sube), conceptualmente son distintos:</p>
          <ul className="space-y-3 text-sm text-muted-foreground ml-1">
            <li className="flex gap-2 items-start">
              <ArrowRightLeft className="size-4 text-primary shrink-0 mt-0.5" />
              <span><strong>El Aporte (Ajuste):</strong> Es dinero movido internamente (ej. sobró algo de los gastos y lo moviste al Ahorro) o es un pequeño arreglo (ej. tenías $5 sin contar). Va directo al capital.</span>
            </li>
            <li className="flex gap-2 items-start">
              <Coins className="size-4 text-milestone shrink-0 mt-0.5" />
              <span><strong>El Ingreso Extra:</strong> Es dinero <em>nuevo</em> del exterior. Un bono o la venta de algo. Se requiere distribuirlo para que quede registrado visualmente en tu tabla resumen como una ganancia del mes.</span>
            </li>
          </ul>
        </FaqItem>

        <FaqItem title="El Cierre Real del Mes: Cómo sincronizar valores inexactos">
          <p className="text-sm text-muted-foreground leading-relaxed">
            Las matemáticas del simulador asumen que guardas $100 y gastas $50 exactos. En el mundo real, los centavos varían o a veces te olvidas de registrar un gasto pequeño en la app.
          </p>
          <div className="mt-4 rounded-xl border border-destructive/20 bg-destructive/[0.04] p-4 text-sm">
            <strong className="text-destructive flex items-center gap-1.5 mb-2">
              <RefreshCw className="size-4" /> La Magia del Cierre Real
            </strong>
            <p className="text-muted-foreground">
              Al final del mes de Marzo (por ejemplo), ignora registrar 50 gastos minúsculos si no quieres. Solo abre tu app del banco, mira cuánto dinero tienes de verdad, y anota ese número en el campo <strong>Cierre real del mes (Capital)</strong>.
              <br /><br />
              Al instante, la tabla tomará ese número como verdad absoluta, descartando la proyección matemática inflada, y lanzará Abril empezando desde tu plata real.
            </p>
          </div>
        </FaqItem>
        
        <FaqItem title="¿Cuándo utilizar Transferencias entre Cuentas?">
          <p className="text-sm text-muted-foreground leading-relaxed">
            La funcionalidad de Transferencias te permite reubicar saldo de una cuenta (Ej. Ahorro) a otra cuenta (Ej. Gastos) sin alterar tus ingresos o egresos totales percibidos, resolviendo imprecisiones internas del flujo de dinero. 
          </p>
          <ul className="mt-3 space-y-2 text-sm text-muted-foreground ml-4 list-disc marker:text-primary/50">
            <li>Puedes lanzar múltiples transferencias dinámicas por cuenta. Sus "Chips" visuales aparecerán en tu panel para recordarte qué movimientos internos se hicieron ese mes.</li>
            <li><strong>Importante:</strong> Si el mes ya tiene <em>Cierre Real</em> sellado, la transferencia generará una advertencia visual para evitar descuadrar el saldo que tú mismo ajustaste.</li>
          </ul>
        </FaqItem>
      </div>

      <h3 className="font-display text-lg font-bold text-foreground px-1 mt-10 mb-2 flex items-center gap-2">
        <Lightbulb className="size-5 text-muted-foreground" />
        Beneficios de Ley (Ecuador)
      </h3>
      <div className="space-y-3">
        <FaqItem title="¿Cómo funciona el descuento del IESS?">
          <p className="text-sm text-muted-foreground leading-relaxed">
            Al activar el switch de <strong>Aporte al IESS (9.45%)</strong> en Configuración, debes ingresar tu <strong>Sueldo Bruto</strong> (lo que dice tu contrato). El simulador restará automáticamente el porcentaje de ley y utilizará tu <strong>Neto Efectivo</strong> para todas las proyecciones de ahorro y gastos, simulando exactamente la liquidez que llegará a tu banco.
          </p>
        </FaqItem>
        <FaqItem title="Décimos y Fondos de Reserva: Proyección automática">
          <p className="text-sm text-muted-foreground leading-relaxed mb-3">
            NovaFin inyecta automáticamente ingresos en tu tabla según la ley laboral:
          </p>
          <ul className="space-y-2 text-sm text-muted-foreground ml-4 list-disc marker:text-primary/50">
            <li><strong>Décimo Tercero (D13):</strong> Se calcula en diciembre (o acumulado mensual).</li>
            <li><strong>Décimo Cuarto (D14):</strong> Equivale a 1 SBU en Agosto (Sierra) o Abril. Si llevas menos de 1 año trabajando, NovaFin calculará matemáticamente la contribución <em>proporcional exacta</em>.</li>
            <li><strong>Fondos de Reserva:</strong> Empiezan a calcularse mes a mes (8.33% del bruto) <strong>estrictamente a partir de tu mes 13ero de empleo</strong>.</li>
          </ul>
        </FaqItem>
        <FaqItem title="Distribución independiente en cada meta">
          <p className="text-sm text-muted-foreground leading-relaxed">
            Podrías ahorrar el 100% de tus décimos de agosto para matrículas (Ahorro), pero gastar la mitad de los décimos de diciembre en regalos (Gastos).
            <br /><br />
            NovaFin cuenta con distribuciones <strong>totalmente independientes</strong> calculadas en porcentajes (%). Así, los montos de la tabla se adaptarán a la perfección. 
          </p>
        </FaqItem>
      </div>

      <h3 className="font-display text-lg font-bold text-foreground px-1 mt-10 mb-2 flex items-center gap-2">
        <Target className="size-5 text-muted-foreground" />
        Metas y Proyección (Tabla Resumen)
      </h3>
      <div className="space-y-3">
        <FaqItem title="¿Cómo sé cuándo puedo comprarme algo?">
          <p className="text-sm text-muted-foreground leading-relaxed">
            Cuando guardas una Meta, la tabla de Resumen la buscará mes a mes hacia el futuro contrastando su precio con tu <strong>Saldo Ahorro</strong>.
            Cuando por fin el saldo proyectado supere el precio de la meta en un mes específico, ese mes se iluminará en la tabla diciéndote: <em>"Alcanzable: Tu Meta"</em>.
          </p>
          <p className="text-sm text-muted-foreground leading-relaxed mt-2">
            Si decides fingir la compra para ver cómo quedas pobre de nuevo, ve a Metas y márcala como <strong>"Comprada en X mes"</strong>.
          </p>
        </FaqItem>
        <FaqItem title="¿Qué significan las estrellas amarillas en la tabla?">
           <p className="text-sm text-muted-foreground leading-relaxed">
            Una pequeña estrella <span className="text-primary text-xs">★</span> (o azul celeste) junto al nombre del mes en la tabla 
            te alerta que ese mes fue <strong>manipulado manualmente por un Cierre Real</strong>. Esto es útil para auditar en el futuro por qué un mes no coincide matemáticamente con los gastos que ingresaste (pues el Cierre Real sobrescribió la matemática pura).
          </p>
        </FaqItem>
        <FaqItem title="¿Cómo simulo un aumento o bajón de mi sueldo en el futuro?">
          <p className="text-sm text-muted-foreground leading-relaxed">
            Ve a <strong>Configuración</strong> y activa <strong>"Periodos con ingresos / saldos variables"</strong>. 
            Allí podrás declarar que, por ejemplo de Octubre a Diciembre, tu sueldo bajará a la mitad. Configuras cuánto aportarás al ahorro, y la matemática del simulador redistribuirá automáticamente los residuales. Durante esos 3 meses tu proyección crecerá más lento, y luego en enero retomará automáticamente tu sueldo base normal, ¡sin que tengas que hacer nada!
          </p>
        </FaqItem>
      </div>

      <FeedbackPanel />
    </div>
  )
}

function FeedbackPanel() {
  const [email, setEmail] = useState("")
  const [msg, setMsg] = useState("")

  function handleSend(e: React.FormEvent) {
    e.preventDefault()
    if (!msg.trim()) return
    const body = `Hola NoviFin team,\n\nSoy ${email || "un usuario anónimo"},\n\nMi feedback:\n${msg}`
    const encodedBody = encodeURIComponent(body)
    window.location.href = `mailto:sebasdelpm@gmail.com?subject=NoviFin%20-%20Feedback&body=${encodedBody}`
  }

  return (
    <div className="mt-12">
      <h3 className="font-display text-lg font-bold text-foreground px-1 mb-2 flex items-center gap-2">
        <MessageSquare className="size-5 text-muted-foreground" />
        Danos tu Opinión
      </h3>
      <form onSubmit={handleSend}>
        <Panel className="border-primary/20 bg-primary/[0.02]">
          <p className="text-sm text-foreground mb-4">¿Encontraste un bug o tienes una idea brutal para mejorar el simulador? Escríbenos directamente.</p>
          <div className="space-y-4">
            <div>
              <label className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground mb-1.5 block">
                Tu correo (opcional)
              </label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="ejemplo@correo.com"
                className="w-full rounded-md border border-input bg-background/60 px-3 py-2 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground/40 focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
            </div>
            <div>
              <label className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground mb-1.5 block">
                Tu mensaje
              </label>
              <textarea
                required
                value={msg}
                onChange={e => setMsg(e.target.value)}
                placeholder="Hola, me encantaría que la app pudiera..."
                rows={4}
                className="w-full resize-none rounded-md border border-input bg-background/60 px-3 py-2 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground/40 focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
            </div>
            <button
              type="submit"
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-md shadow-primary/20 transition-all hover:bg-primary/90 hover:shadow-lg active:scale-95"
            >
              <Send className="size-4" />
              Enviar Feedback Directo
            </button>
          </div>
        </Panel>
      </form>
    </div>
  )
}

function FaqItem({ title, children, defaultOpen = false }: { title: string; children: React.ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen)
  
  return (
    <Panel className={cn("overflow-hidden transition-all duration-300", open ? "border-primary/40 shadow-sm" : "")}>
      <button 
        type="button" 
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between p-4 sm:px-6 text-left"
      >
        <span className={cn("font-medium transition-colors", open ? "text-primary" : "text-foreground")}>{title}</span>
        <span className={cn("shrink-0 text-muted-foreground transition-transform duration-300", open ? "rotate-180" : "rotate-0")}>
          <ChevronDown className="size-4" />
        </span>
      </button>
      <div className={cn("grid transition-all duration-300", open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0")}>
        <div className="overflow-hidden">
          <div className="px-4 pb-5 sm:px-6 pt-1">
            {children}
          </div>
        </div>
      </div>
    </Panel>
  )
}

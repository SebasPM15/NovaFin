# NovaFin - Sistema Integral de Gestión de Ahorro

NovaFin es un simulador de finanzas personales diseñado para ofrecer una experiencia intuitiva, elegante y directa. Su objetivo es proyectar tu sueldo, controlar el ahorro para metas a largo plazo, y gestionar tus gastos disponibles mes a mes.

## ✨ Características Principales
- 📊 **Proyección Financiera:** Simula tu estado financiero a futuro (ej. 12 o 18 meses) calculando ahorros acumulados y saldo residual para gastos.
- 🎯 **Gestión de Metas:** Agrega metas, dales un precio y el sistema deducirá automáticamente en qué mes futuro tendrás el dinero suficiente para cumplirlas.
- 📆 **Control Mensual y Multi-Cuenta:** Registra entradas y salidas de emergencia. Aplica "Cierres Reales" mes a mes para sincronizar con la realidad bancaria. Adicionalmente, cuenta con arquitectura **Single, Dual y Custom** para dividir tu sueldo en tantos "sobres" como desees.
- 📉 **Periodos Financieros Temporales:** Programa subidas o bajadas de sueldo en ventanas específicas (ej. meses sin sueldo, bono especial, etc.) y la app redistribuirá inteligentemente el impacto en tus cuentas durante ese lapso.
- 🎂 **Milestones Personales:** Incluye tu fecha de nacimiento para mostrar avisos motivacionales de la edad que tendrás al cumplir ciertos hitos financieros.
- 🔒 **Privacidad Total (0-Backend):** Todos tus datos viven cifrados dentro de tu propio dispositivo. Adicionalmente, puedes descargar archivos de Respaldo (`.json`) para migrar tu data entre celular y computadora.

---

## 📖 Manual de Uso y Lógica del Simulador

NovaFin está diseñado bajo el principio fundamental de estructurar tu dinero apenas lo recibes. Puedes usar el modelo Clásico (Ahorro / Gastos) o crear la cantidad de cuentas ("sobres virtuales") que tú necesites.

### Guía de Pestañas de la Aplicación

#### 1. Configuración (Tu punto de partida)
Esta pestaña dicta toda la proyección a base.
- **Sueldo Base y Modelo:** Decide cuántas cuentas usarás y qué tajada de tu sueldo se lleva cada una. El sistema se encarga de que la última cuenta siempre absorba "lo que sobra" para que nunca excedas tu ingreso matemático real.
- **Cambios Programados / Descuentos Temporales:** Aquí ordenas bajones de ingreso y castigos directos por deudas a alguna de tus cuentas.
- **Respaldo:** Al final podrás descargar y cargar los reportes JSON para nunca perder info.

#### 2. Resumen (Tu panorama general)
El panel visual principal que se genera en base a las reglas matemáticas establecidas.
- Gráfico visual progresivo con tus cuentas clave.
- **Tabla Prospectiva:** Analiza mes a mes tus abonos proyectados, saldos, y verifica en qué mes rebasas el candado económico de tus metas.
- Estrellas manuales brillantes indican que en ese mes dejaste de proyectar a ciegas y aplicaste un balance bancario real de cierre.

#### 3. Control Mensual (Correcciones al Vuelo)
La vida no es un sueldo fijo; ocurren cosas:
- **Ingresos Extras / Movimientos:** Si en Septiembre hiciste un negocio o tuviste un gasto fuerte de emergencia, aquí lo registras y el simulador descuenta o aumenta *solo* para el mes de Septiembre e impacta de ahí hacia el futuro.
- **Cierre Real:** Si el sistema te predice $10,000 acumulado para un mes y al ver tu banco tienes $8,000, simplemente sobreescribes la realidad y la simulación renace para los cálculos futuros.

#### 4. Metas (Tus objetivos tangibles)
- Registra ítems que deseas. La app te predecirá la fecha exacta de alcance basándose en tus acumulados y en tus periodos transitorios de sueldos. 

---

## 🚀 Tecnologías
- **Next.js 16 (App Router)** - Framework para un rendering brutal y veloz.
- **React.js 19** - Librería UI core.
- **Tailwind v4** - Estilos, animaciones modernas y diseño de sistema oscuro profesional (Dark/Navy/Green).
- **Zustand** - Motor de estado Reactivo minimalista.
- **Recharts** - Construcción de la visualización de área.

## 🛠️ Instalación y Uso Local

Para correr el proyecto en tu máquina local:

1. Clona el repositorio:
   ```bash
   git clone <URL_DEL_REPOSITORIO>
   ```
2. Entra a la carpeta del proyecto (nueva arquitectura):
   ```bash
   cd nova-fin-architecture
   ```
3. Instala las dependencias:
   ```bash
   npm install
   ```
4. Inicia el servidor de desarrollo en Turbopack:
   ```bash
   npm run dev
   ```
5. Abre [http://localhost:3000](http://localhost:3000) en tu navegador para ver la app de alta fidelidad.

## 💾 Persistencia de Datos y Privacidad Absoluta
NovaFin guarda toda tu información (saldos, movimientos en el tiempo, configuración y compras) **100% de manera local y descentralizada**. Todo reside en el motor de almacenamiento de tu navegador web (`localStorage`), garantizando que tus datos financieros **NUNCA circularán por ninguna base de datos ni servidor externo**. Disfruta del planear tu riqueza en completa privacidad.

---
**Diseñado y desarrollado por Ing. Mateo Pilco**

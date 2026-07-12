# NovaFin - Sistema Integral de Gestión de Ahorro

NovaFin es un simulador de finanzas personales diseñado para ofrecer una experiencia intuitiva, elegante y directa. Su objetivo es proyectar tu sueldo, controlar el ahorro para metas a largo plazo, y gestionar tus gastos disponibles mes a mes.

## ✨ Características Principales
- 📊 **Proyección Financiera:** Simula tu estado financiero a futuro (ej. 12 o 18 meses) calculando ahorros acumulados y saldo para gastos.
- 🎯 **Gestión de Metas:** Agrega metas, dales un precio y el sistema deducirá automáticamente en qué mes futuro tendrás el dinero suficiente para cumplirlas.
- 📆 **Control Mensual:** Ajusta tus saldos reales o registra movimientos/retiros específicos para cualquier mes sin alterar la coherencia de la cuenta global.
- 🎂 **Milestones Personales:** Incluye tu fecha de nacimiento para mostrar avisos motivacionales de la edad que tendrás al cumplir ciertos hitos financieros.
- 🎨 **Interfaz Premium:** Una experiencia de usuario con un diseño minimalista, moderno y adaptado a una paleta oscura y profesional (Dark/Navy Theme).

---

## 📖 Manual de Uso y Lógica del Simulador

NovaFin está diseñado bajo el principio fundamental de **Dos Cuentas Separadas**. Esto ayuda a separar el dinero intocable del dinero circulante para que tu mente visualice tus fronteras de gasto inmediatamente.

### Las Dos Cuentas Principales
1. **Cuenta de Ahorros:** Tu dinero intocable para construir capital futuro. Se alimenta mes a mes por un "Depósito fijo base" que tú mismo defines. *De esta cuenta es de dónde se deducen o pagan tus "Metas" exclusivamente.*
2. **Cuenta de Gastos:** Tu flujo de efectivo mensual. Se calcula restando tus ahorros fijos a tu sueldo. De aquí se debita cada comida extra, antojo o compra menor que registres en un mes específico.

### Guía de Pestañas de la Aplicación

#### 1. Configuración (Tu punto de partida)
Esta pestaña dicta toda la proyección a futuro.
- **Sueldo Base y Ahorro Fijo:** Define cuánto ganas y cuánto quieres mover obligatoriamente a la bolsa de ahorros.
- **Meses a proyectar:** Define qué tan lejos en el tiempo quieres calcular tu dinero (generalmente 12, 18, o 24 meses).
- **Descuentos Temporales:** (Opcional) Aplica cuando sabes que te descontarán dinero base durante los próximos X meses por un préstamo o deudas de tarjeta.

#### 2. Resumen (Tu panorama general)
El panel visual principal que se genera en base a las reglas que le pusiste a la aplicación.
- Cuenta con un gráfico de área para visualizar el volumen de tu ahorro y gastos sobrantes conforme avanzan los meses.
- En la **Tabla Prospectiva** podrás ver el resultado exacto. Verás tus abonos base, los descuentos por retiros y el saldo final de cada cuenta. ¡Aquí saltarán a la vista en qué mes exacto estás en capacidad de financiar una meta o cuándo llega tu cumpleaños!

#### 3. Control Mensual (Tu herramienta correctiva)
Aún si tu sueldo es estático, la vida real es dinámica. Aquí controlas qué pasa si te excedes o ganas algo extra:
- **Movimientos:** Registra entradas y salidas de emergencia ya sea en Ahorros o en Gastos a lo largo de un mes específico.
- **Cierre Real del Mes:** Si llegaste a este mes y cuentas tu dinero real, y dices "*Tengo $4,500 en el Ahorro en vez de los $4,200 proyectados*", entonces escribes 4500 en el "Cierre Real". **A partir de ese mes**, el sistema descartará las predicciones pasadas y empezará la suma y predicción desde esta nueva base exacta (marcada visualmente en el resumen con una estrella dorada `★`).

#### 4. Metas (Tus objetivos tangibles)
- Agrega un artículo, ponle un nombre (ej. "PlayStation 5" o "Viaje a la playa") y su valor.
- Selecciona sus cajones interactivos. La tabla principal de la aplicación empezará a analizar en qué mes pasas **la línea de "Saldo Ahorro > Precio Meta"** e inyectará visualmente una chapa verde indicando que ya la puedes comprar al cash en base a tu proyección.
- Una vez finalizas la compra, la marcas como "Comprado" y eliges en qué mes ejecutaste el gasto, para que descuente ese monto de tus ahorros en ese punto el tiempo de manera perpetua.

---

## 🚀 Tecnologías
- **React.js** (Librería principal)
- **Vite** (Compilador y entorno de desarrollo rápido)
- **Tailwind CSS** (Estilos y diseño de utilidades)
- **Recharts** (Gráficos financieros integrados)

## 🛠️ Instalación y Uso Local

Para correr el proyecto en tu máquina local:

1. Clona el repositorio:
   ```bash
   git clone <URL_DEL_REPOSITORIO>
   ```
2. Entra a la carpeta del proyecto:
   ```bash
   cd Sistema_Ahorros
   ```
3. Instala las dependencias:
   ```bash
   npm install
   ```
4. Inicia el servidor de desarrollo:
   ```bash
   npm run dev
   ```
5. Abre [http://localhost:5173](http://localhost:5173) en tu navegador para ver la app.

## 💾 Persistencia de Datos y Privacidad Absoluta
NovaFin guarda toda tu información (saldos, movimientos en el tiempo, configuración y compras) **100% de manera local y descentralizada**. Todo reside en el motor de almacenamiento de tu navegador web (`localStorage`), garantizando que tus datos financieros **NUNCA circularán por ninguna base de datos ni servidor externo**. Disfruta del planear tu riqueza en completa privacidad.

---
**Diseñado y desarrollado por Ing. Mateo Pilco**

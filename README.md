# NovaFin - Sistema Integral de Gestión de Ahorro

NovaFin es un simulador de finanzas personales diseñado para ofrecer una experiencia intuitiva, elegante y directa. Su objetivo es proyectar tu sueldo, controlar el ahorro para metas a largo plazo, y gestionar tus gastos disponibles mes a mes.

## ✨ Características Principales
- 📊 **Proyección Financiera:** Simula tu estado financiero a futuro (ej. 12 o 18 meses) calculando ahorros acumulados y saldo para gastos.
- 🎯 **Gestión de Metas:** Agrega metas, dales un precio y el sistema deducirá automáticamente en qué mes futuro tendrás el dinero suficiente para cumplirlas.
- 📆 **Control Mensual:** Ajusta tus saldos reales o registra movimientos/retiros específicos para cualquier mes sin alterar la coherencia de la cuenta global.
- 🎂 **Milestones Personales:** Incluye tu fecha de nacimiento para mostrar avisos motivacionales de la edad que tendrás al cumplir ciertos hitos financieros.
- 🎨 **Interfaz Premium:** Una experiencia de usuario con un diseño minimalista, moderno y adaptado a una paleta oscura sofisticada.

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

## 💾 Persistencia de Datos
NovaFin guarda toda tu información (saldos, meses, compras) directamente en el almacenamiento local de tu navegador (`localStorage`), garantizando que tus datos personales nunca se filtren ni vayan a servidores externos.

---
**Diseñado y desarrollado por Ing. Mateo Pilco**

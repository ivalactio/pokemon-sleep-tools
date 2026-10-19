# 💤 PokéSleep Optimizer & Tools

Suite integral para **Pokémon Sleep** orientada a la optimización de producción de ingredientes, cobertura de recetas semanales, simulación determinista de equipos y cálculo de energía.

---

## ✨ Características Clave

- 🍲 **Optimizador de Recetas y Menú Semanal**: Planificación estratégica y cálculo de cobertura semanal según la disponibilidad de ingredientes, tamaño de olla y tipo de plato (Curris, Ensaladas, Postres/Bebidas).
- ⚡ **Cálculo de Producción SleepAPI**: Estimación precisa de rendimiento, bayas, ingredientes y activación de habilidades principales (*Main Skills*) por Pokémon y equipo completo.
- 👁️ **Integración Gemini Vision / OCR**: Escaneo inteligente de capturas de pantalla mediante IA para importar Pokémon automáticamente a tu colección (consulta [`VISION_SETUP.md`](./VISION_SETUP.md) para su configuración).
- 🎨 **UI Moderna con Sprites Locales de PokéAPI**: Interfaz rápida, responsiva y con soporte de modo oscuro, equipada con recursos gráficos locales y almacenamiento persistente en navegador (IndexedDB / Dexie).
- 📊 **Planificador y Comparador**: Simulación de equipos, asesor de mejoras (*Candy & Upgrade Advisor*) e importación/exportación de copias de seguridad en formato JSON.

---

## 📁 Estructura del Proyecto

```text
pokemon-sleep-tools/
├── backend/                  # Servidor backend ligero (Node.js / TypeScript)
│   ├── server.ts             # Endpoints HTTP para extracción con IA y proxy de servicios
│   ├── geminiExtractor.ts    # Integración con Google Gemini Vision API (@google/genai)
│   └── extractionSchema.ts   # Esquemas de validación estructurada para el OCR
├── public/                   # Activos estáticos y sprites locales de Pokémon
├── scripts/                  # Scripts de utilidad y pruebas E2E (Puppeteer)
├── src/                      # Aplicación Frontend (React 19 + TypeScript + Tailwind CSS v4)
│   ├── components/           # Componentes de interfaz reutilizables y layout
│   ├── data/                 # Catálogo estático del juego (especies, recetas, bayas, subskills)
│   ├── domain/               # Modelos de dominio, tipos y esquemas de validación (Zod)
│   ├── features/             # Módulos principales (collection, optimizer, planner, recipes, etc.)
│   ├── hooks/                # Custom hooks de React
│   ├── i18n/                 # Configuración de internacionalización
│   ├── services/             # Persistencia local (Dexie/IndexedDB), clientes API y motores de cálculo
│   └── utils/                # Funciones auxiliares y formateadores
├── .env.example              # Plantilla de variables de entorno
├── VISION_SETUP.md           # Guía detallada para configurar el escaneo con Gemini Vision
└── vite.config.ts            # Configuración de empaquetado y servidor de desarrollo (Vite)
```

---

## 🚀 Guía de Inicio Rápido

### Requisitos Previos

- **Node.js** `>= 20.x`
- **npm** `>= 10.x`
- *(Opcional)* Una clave de API de **Google Gemini** si deseas utilizar la importación por captura de pantalla.

### 1. Clonar el repositorio

```bash
git clone https://github.com/ivalactio/pokemon-sleep-tools.git
cd pokemon-sleep-tools
```

### 2. Instalar dependencias

```bash
npm install
```

### 3. Configurar variables de entorno (Opcional para OCR/Vision)

Copia el archivo de ejemplo `.env.example` a `.env` y añade tu clave de Gemini si vas a usar el backend de visión:

```bash
cp .env.example .env
```

> Consulta [`VISION_SETUP.md`](./VISION_SETUP.md) para más detalles sobre la configuración del módulo OCR.

### 4. Ejecutar en desarrollo

Para iniciar el frontend en modo desarrollo (`http://localhost:5173`):

```bash
npm run dev
```

Si deseas levantar simultáneamente el **frontend** y el **backend** de Gemini Vision:

```bash
npm run dev:full
```

---

## 🛠️ Scripts Disponibles

| Comando | Descripción |
| :--- | :--- |
| `npm run dev` | Inicia el servidor de desarrollo frontend con Vite. |
| `npm run backend:dev` | Inicia el servidor backend en modo *watch* (`tsx`). |
| `npm run dev:full` | Ejecuta el frontend y el backend simultáneamente. |
| `npm run build` | Compila TypeScript y genera el bundle de producción en `dist/`. |
| `npm run test` | Ejecuta la suite de tests unitarios y de integración con Vitest. |
| `npm run lint` | Analiza el código con ESLint. |

---

## 📄 Licencia

Este proyecto es de código abierto. Pokémon y Pokémon Sleep son marcas registradas de Nintendo, Creatures Inc., GAME FREAK inc. y The Pokémon Company. Este proyecto es una herramienta creada por fans y no está afiliada oficialmente con dichas entidades.

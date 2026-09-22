# Guía de Integración de Visión con Gemini

## Arquitectura

```
 ┌─────────────────────────────────────────────────────────────────┐
 │  Navegador (React / Vite)                                       │
 │                                                                 │
 │  Collection.tsx                                                 │
 │     ↓ selecciona proveedor                                      │
 │  VisionCapture.tsx                                              │
 │     ↓ File/Blob                                                 │
 │  GeminiVisionProvider  ──POST /api/vision/pokemon──►           │
 │  (src/services/vision)                              │           │
 └─────────────────────────────────────────────────────┼───────────┘
                                                       │
 ┌─────────────────────────────────────────────────────┼───────────┐
 │  Backend Node.js (backend/server.ts, puerto 3001)   │           │
 │                                                     ▼           │
 │  handleVisionRequest()                                          │
 │     ↓ valida MIME y tamaño                                      │
 │  geminiExtractor.ts                                             │
 │     ↓ @google/genai SDK                                         │
 │  Gemini API (cloud)                                             │
 │     ↓ PokemonExtractionDTO (JSON estructurado)                  │
 │  ──────── respuesta ──────────────────────────────►            │
 └─────────────────────────────────────────────────────────────────┘
                    ↓
 ┌──────────────────────────────────────────────────┐
 │  Frontend (continúa)                             │
 │                                                  │
 │  PokemonExtractionResult                         │
 │     ↓                                            │
 │  VisionValidationService                         │
 │     ↓                                            │
 │  PokemonDraft                                    │
 │     ↓                                            │
 │  VisionReview (usuario revisa y corrige)         │
 │     ↓ "Guardar"                                  │
 │  IndexedDB (OwnedPokemon)                        │
 └──────────────────────────────────────────────────┘
```

---

## 1. Obtener y configurar GEMINI_API_KEY

1. Accede a [Google AI Studio](https://aistudio.google.com/app/apikey).
2. Crea o copia tu clave de API.
3. En la raíz del proyecto, copia `.env.example` como `.env`:
   ```
   cp .env.example .env
   ```
4. Edita `.env` y reemplaza el placeholder:
   ```
   GEMINI_API_KEY=tu_clave_real_aqui
   ```

> ⚠️ **NUNCA** subas `.env` a Git. Está en `.gitignore`.  
> El fichero `.env.example` sí debe estar en Git (sin clave real).

---

## 2. Arrancar frontend + backend para desarrollo

Necesitas **dos terminales** (o usar el script combinado):

### Opción A: Script combinado
```bash
npm run dev:full
```
Esto inicia el backend (puerto 3001) y el frontend (puerto 5173) simultáneamente.

### Opción B: Terminales separadas
```bash
# Terminal 1 — backend
npm run backend:dev

# Terminal 2 — frontend
npm run dev
```

El proxy de Vite reenvía automáticamente `/api/*` → `http://localhost:3001` en desarrollo.

---

## 3. Seleccionar el proveedor Mock o Gemini en la UI

En la pantalla de Colección, pulsa **"Importar captura"** para expandir el panel de visión.

Verás dos botones:
- 🧪 **Mock (test)** — Usa el `MockVisionProvider`. No requiere backend ni clave. Devuelve datos de ejemplo.
- ✨ **Gemini** — Usa el `GeminiVisionProvider` real. Requiere el backend iniciado con `GEMINI_API_KEY`.

> 🛠️ El proveedor por defecto es **Mock** para no requerir configuración en desarrollo.

Para cambiar el valor por defecto, edita esta constante en [`Collection.tsx`](src/features/collection/Collection.tsx):
```typescript
const DEFAULT_PROVIDER: ProviderKey = 'mock'; // o 'gemini'
```

---

## 4. Probar la importación

### Con Mock (sin clave):
1. Abre Colección → **Importar captura** → selecciona **Mock (test)**.
2. Sube cualquier imagen PNG/JPEG/WebP (el mock ignora el contenido).
3. El flujo procesará instantáneamente y mostrará VisionReview con datos de ejemplo.
4. Revisa, corrige y pulsa **Guardar**.

### Con Gemini (con clave real):
1. Inicia el backend: `npm run backend:dev`
2. Abre Colección → **Importar captura** → selecciona **Gemini**.
3. Sube una captura real de Pokémon Sleep (perfil de un Pokémon, PNG/JPEG/WebP, máx 5MB).
4. El sistema analizará la imagen y mostrará VisionReview con datos extraídos + confidence.
5. Campos con confidence baja (<70%) aparecen en amarillo. Campos con error en rojo.
6. Corrige lo necesario y pulsa **Guardar**.

---

## 5. Archivos que deben permanecer secretos

| Archivo | Estado | Motivo |
|---------|--------|--------|
| `.env` | 🔴 SECRETO — nunca en Git | Contiene `GEMINI_API_KEY` |
| `.env.*` (excepto `.env.example`) | 🔴 SECRETO | Variables de entorno reales |
| `GEMINI_API_KEY` / `GOOGLE_API_KEY` | 🔴 SECRETO | Claves de API de Google |

| Archivo | Estado | Motivo |
|---------|--------|--------|
| `.env.example` | ✅ En Git | Solo tiene placeholders |
| `backend/*.ts` | ✅ En Git | Solo lógica, sin claves |
| `src/**` | ✅ En Git | Frontend no contiene claves |

---

## 6. Estructura de archivos relevantes

```
vision_review_ui/
├── backend/
│   ├── extractionSchema.ts     # Tipos DTO compartidos (sin runtime frontend)
│   ├── geminiExtractor.ts      # Lógica pura de extracción Gemini (usa @google/genai)
│   └── server.ts               # Servidor HTTP mínimo (sin Express)
├── src/
│   ├── domain/vision/
│   │   ├── models.ts           # PokemonExtractionResult, PokemonDraft
│   │   └── visionErrors.ts     # Tipos de error compartidos (importables en frontend)
│   └── services/vision/
│       ├── GeminiVisionProvider.ts  # Cliente HTTP hacia el backend (NO importa @google/genai)
│       ├── MockVisionProvider.ts    # Proveedor de test
│       ├── VisionValidationService.ts  # Normalización y validación estricta
│       ├── GeminiVisionProvider.test.ts  # Tests con fetch mockeado
│       └── geminiExtractor.test.ts      # Tests con SDK mockeado
├── .env.example                # Plantilla de variables de entorno (sin claves)
├── .gitignore                  # Excluye .env y .env.*
└── vite.config.ts              # Proxy /api → localhost:3001 en desarrollo
```

---

## 7. Despliegue y Escenarios (BYOK vs Server Key)

La aplicación soporta tres escenarios de uso para Gemini:

### Escenario A: Uso en Local (BYOK)
Tú ejecutas el proyecto en tu máquina (`npm run dev:full`) sin haber configurado un fichero `.env`.
1. Vas a **Configuración → Gemini**.
2. Introduces tu `GEMINI_API_KEY`.
3. Seleccionas el modo **Gemini**.
4. La clave se envía por cabecera HTTP (`Authorization: Bearer ...`).
5. El servidor local usa tu clave temporalmente y la descarta. Al recargar el navegador, la clave desaparece de memoria por seguridad.

### Escenario B: Publicado Privado / Self-Hosted (Server Key)
Tú publicas la aplicación (ej. en un VPS o plataforma serverless).
1. Configuras la variable de entorno `GEMINI_API_KEY` en tu servidor de producción.
2. Los usuarios no necesitan introducir su clave en la UI.
3. El frontend manda la imagen sin header de `Authorization`.
4. El servidor detecta la falta de clave BYOK y utiliza `process.env.GEMINI_API_KEY`.

### Escenario C: Publicado Público (BYOK)
Tú publicas la aplicación para que la use el público, pero NO configuras `GEMINI_API_KEY` en el servidor porque no quieres pagar el coste o arriesgar tu cuota.
1. La variable de entorno `GEMINI_API_KEY` no existe en el servidor.
2. Cada usuario va a **Configuración → Gemini** e introduce su propia clave de API.
3. Cada petición al servidor enviará la clave del usuario.
4. **IMPORTANTE**: La API key proporcionada al navegador es un secreto gestionado por el propio usuario. El usuario debe confiar en que la aplicación/servidor no la va a almacenar ni robar. Nuestro código asegura que la clave se mantiene únicamente en memoria del cliente y no es logueada ni persistida en el servidor.

---

## 8. Modelo y configuración de Gemini

- **Modelo**: `gemini-3.6-flash`  
- **SDK**: `@google/genai` >= 2.24.0
- **Almacenamiento**: `store: false` — las interacciones NO se persisten en Google
- **Modo**: Structured output con JSON schema estricto
- **Una sola llamada** por captura — sin reintentos automáticos agresivos

---

## 9. Sobre confidence

La `confidence` por campo **no es una probabilidad calibrada matemáticamente**.

Es una estimación del modelo para indicar si el campo necesita revisión humana:

| Rango | Significado | Color en UI |
|-------|-------------|-------------|
| 0.9–1.0 | Texto claramente visible | Verde ✅ |
| 0.7–0.89 | Legible con posibles variaciones | Verde ✅ |
| 0.5–0.69 | Dudoso, el usuario debe revisar | Amarillo ⚠️ |
| < 0.5 | Muy difícil de leer | Rojo ❌ |
| 0 (null) | No detectado | Rojo ❌ |

El sistema muestra la confidence para ayudar al usuario, pero **no bloquea el guardado** ni acepta automáticamente valores con baja confidence.

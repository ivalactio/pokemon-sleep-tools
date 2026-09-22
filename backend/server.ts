/**
 * Backend HTTP mínimo para el endpoint de visión: POST /api/vision/pokemon
 *
 * Usa únicamente el módulo http de Node.js. Sin Express ni dependencias de servidor web.
 * Diseño orientado a ser migrable a serverless (la lógica de negocio vive en geminiExtractor.ts).
 *
 * Manejo de errores:
 *  - API key ausente → 500 MISSING_API_KEY
 *  - MIME no soportado → 415 UNSUPPORTED_MIME
 *  - Imagen > 5MB → 413 IMAGE_TOO_LARGE
 *  - Error Gemini 400 → 400 GEMINI_ERROR
 *  - Error Gemini 401/403 → 403 UNAUTHORIZED
 *  - Rate limit → 429 RATE_LIMIT
 *  - Error 5xx Gemini → 502 GEMINI_ERROR
 *  - Respuesta inválida → 502 INVALID_RESPONSE
 *  - Timeout → 504 TIMEOUT
 */

import http from 'node:http';
import { extractPokemonFromImageBuffer } from './geminiExtractor.js';
import {
  ALLOWED_MIME_TYPES,
  MAX_IMAGE_BYTES,
  type VisionErrorDTO,
} from './extractionSchema.js';

const PORT = parseInt(process.env.VISION_SERVER_PORT || '3001', 10);

function sendJSON(res: http.ServerResponse, status: number, body: unknown): void {
  const json = JSON.stringify(body);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': 'http://localhost:5173',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Length': Buffer.byteLength(json),
  });
  res.end(json);
}

function errorResponse(
  res: http.ServerResponse,
  status: number,
  code: VisionErrorDTO['code'],
  message: string
): void {
  sendJSON(res, status, { error: message, code } satisfies VisionErrorDTO);
}

const server = http.createServer((req, res) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': 'http://localhost:5173',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    });
    res.end();
    return;
  }

  if (req.method === 'POST' && req.url === '/api/vision/pokemon') {
    handleVisionRequest(req, res);
    return;
  }

  if (req.method === 'POST' && req.url === '/api/vision/test') {
    handleTestRequest(req, res);
    return;
  }

  res.writeHead(404, { 'Content-Type': 'text/plain' });
  res.end('Not Found');
});

function extractKeyFromHeader(req: http.IncomingMessage): string | undefined {
  const authHeader = req.headers['authorization'];
  if (authHeader && authHeader.toLowerCase().startsWith('bearer ')) {
    return authHeader.substring(7).trim();
  }
  return undefined;
}

async function handleVisionRequest(
  req: http.IncomingMessage,
  res: http.ServerResponse
): Promise<void> {
  // 1. Validar Content-Type / MIME
  const contentType = req.headers['content-type'] || '';
  const mimeType = contentType.split(';')[0].trim();

  if (!ALLOWED_MIME_TYPES.includes(mimeType)) {
    errorResponse(res, 415, 'UNSUPPORTED_MIME',
      `Tipo de imagen no soportado: ${mimeType}. Usa PNG, JPEG o WebP.`);
    return;
  }

  // 2. Leer el body completo con límite de tamaño
  const chunks: Buffer[] = [];
  let totalBytes = 0;
  let timedOut = false;

  const timer = setTimeout(() => {
    timedOut = true;
    req.destroy();
  }, 30_000); // 30s timeout

  try {
    await new Promise<void>((resolve, reject) => {
      req.on('data', (chunk: Buffer) => {
        totalBytes += chunk.length;
        if (totalBytes > MAX_IMAGE_BYTES) {
          req.destroy(new Error('IMAGE_TOO_LARGE'));
          return;
        }
        chunks.push(chunk);
      });
      req.on('end', resolve);
      req.on('error', reject);
    });
  } catch (err) {
    clearTimeout(timer);
    if (timedOut) {
      errorResponse(res, 504, 'TIMEOUT', 'La solicitud tardó demasiado. Inténtalo de nuevo.');
    } else if ((err as Error).message === 'IMAGE_TOO_LARGE' || totalBytes > MAX_IMAGE_BYTES) {
      errorResponse(res, 413, 'IMAGE_TOO_LARGE', 'La imagen supera el límite de 5 MB.');
    } else {
      errorResponse(res, 400, 'INVALID_IMAGE', 'Error al recibir la imagen.');
    }
    return;
  }

  clearTimeout(timer);

  if (totalBytes === 0) {
    errorResponse(res, 400, 'INVALID_IMAGE', 'No se recibió ninguna imagen.');
    return;
  }

  const imageBuffer = Buffer.concat(chunks);

  // 3. Llamar a Gemini
  try {
    const userKey = extractKeyFromHeader(req);
    const result = await extractPokemonFromImageBuffer(imageBuffer, mimeType, userKey);
    sendJSON(res, 200, result);
  } catch (err) {
    handleGeminiError(err, res);
  }
}

async function handleTestRequest(req: http.IncomingMessage, res: http.ServerResponse): Promise<void> {
  console.log('[vision-server] test request received');
  
  // IMPORTANTE: consumir el cuerpo de la petición aunque esté vacío,
  // para que el proxy HTTP (Vite) no se quede colgado esperando.
  req.resume();

  try {
    const userKey = extractKeyFromHeader(req);
    console.log(`[vision-server] API key source: ${userKey ? 'user' : 'server'}`);
    
    const { testGeminiConnection } = await import('./geminiExtractor.js');
    await testGeminiConnection(userKey);
    
    console.log('[vision-server] sending HTTP 200');
    sendJSON(res, 200, { success: true });
  } catch (err) {
    handleGeminiError(err, res);
  }
}

function handleGeminiError(err: unknown, res: http.ServerResponse) {
  const error = err as NodeJS.ErrnoException;
  const code = (error.code as string) || '';
  const message = error.message || '';
  
  // Loguear sin la clave (importante)
  console.error('[vision-server] Error:', code, message);

  if (code === 'MISSING_API_KEY') {
    errorResponse(res, 500, 'MISSING_API_KEY',
      'El servidor no tiene configurada la clave de API de Gemini.');
    return;
  }
  if (code === 'INVALID_RESPONSE') {
    errorResponse(res, 502, 'INVALID_RESPONSE',
      'La respuesta de Gemini no es válida. Inténtalo de nuevo.');
    return;
  }

  // Handle SDK timeouts (can be AbortError, RequestTimeoutError, or fetch timeout)
  if (error.name === 'AbortError' || message.toLowerCase().includes('timeout') || code === 'ETIMEDOUT' || code === 'ECONNRESET') {
    errorResponse(res, 504, 'TIMEOUT', 'Gemini tardó demasiado en responder (timeout).');
    return;
  }

  const statusCode = (error as unknown as { status?: number }).status;
  if (statusCode === 401 || statusCode === 403) {
    errorResponse(res, 403, 'UNAUTHORIZED',
      'La clave de API de Gemini no es válida o no tiene permisos.');
    return;
  }
  if (statusCode === 429) {
    errorResponse(res, 429, 'RATE_LIMIT',
      'Se ha superado el límite de solicitudes a Gemini. Espera un momento.');
    return;
  }
  if (statusCode === 400) {
    errorResponse(res, 400, 'GEMINI_ERROR',
      'Gemini rechazó la petición. Revisa los parámetros.');
    return;
  }
  if (statusCode && statusCode >= 500) {
    errorResponse(res, 502, 'GEMINI_ERROR',
      'Error en el servicio de Gemini. Inténtalo de nuevo más tarde.');
    return;
  }

  errorResponse(res, 500, 'UNKNOWN', 'Error inesperado al procesar la petición a Gemini.');
}

server.listen(PORT, () => {
  console.log(`[vision-server] Escuchando en http://localhost:${PORT}`);
  console.log(`[vision-server] Endpoint: POST http://localhost:${PORT}/api/vision/pokemon`);
  const hasKey = !!(process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY);
  console.log(`[vision-server] API key configurada: ${hasKey ? 'SÍ' : 'NO ⚠️'}`);
});

export { server };

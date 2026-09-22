/**
 * Tipos de error compartidos entre el cliente GeminiVisionProvider y el backend.
 * Este archivo solo contiene tipos (no runtime), por lo que es seguro importarlo
 * desde el frontend sin incluir código de servidor.
 */
export type VisionErrorCode =
  | 'MISSING_API_KEY'
  | 'INVALID_IMAGE'
  | 'IMAGE_TOO_LARGE'
  | 'UNSUPPORTED_MIME'
  | 'GEMINI_ERROR'
  | 'INVALID_RESPONSE'
  | 'RATE_LIMIT'
  | 'UNAUTHORIZED'
  | 'TIMEOUT'
  | 'BACKEND_DOWN'
  | 'UNKNOWN';

export interface VisionErrorDTO {
  error: string;
  code: VisionErrorCode;
}


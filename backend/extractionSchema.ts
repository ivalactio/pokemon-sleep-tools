/**
 * Tipos compartidos del esquema de extracción de visión.
 *
 * Este módulo define el contrato entre el backend (GeminiExtractor)
 * y el frontend (GeminiVisionProvider).
 *
 * Importante: el frontend NO importa @google/genai. Solo este módulo
 * es el contrato de la API REST entre ambas capas.
 */

/**
 * Représenta un campo extraído de una captura con su valor y nivel de confianza.
 *
 * Notas sobre confidence:
 * - NO es una probabilidad calibrada matemáticamente.
 * - Es una estimación del modelo para indicar si el campo requiere revisión humana.
 * - 1.0 = el texto o dato era claramente visible en la imagen.
 * - < 0.7 = lectura dudosa, el usuario DEBE revisar este campo.
 * - null = el modelo no pudo determinarlo con suficiente certeza.
 */
export interface ExtractedFieldDTO<T> {
  value: T | null;
  confidence: number;
}

/**
 * Resultado estructurado que devuelve el endpoint POST /api/vision/pokemon.
 * Mapea directamente a PokemonExtractionResult del dominio frontend.
 */
export interface PokemonExtractionDTO {
  species: ExtractedFieldDTO<string>;
  nickname: ExtractedFieldDTO<string>;
  level: ExtractedFieldDTO<number>;
  nature: ExtractedFieldDTO<string>;
  mainSkill: ExtractedFieldDTO<string>;
  skillLevel: ExtractedFieldDTO<number>;
  subskills: {
    10: ExtractedFieldDTO<string>;
    25: ExtractedFieldDTO<string>;
    50: ExtractedFieldDTO<string>;
    75: ExtractedFieldDTO<string>;
    100: ExtractedFieldDTO<string>;
  };
  ingredients: {
    1: ExtractedFieldDTO<string>;
    30: ExtractedFieldDTO<string>;
    60: ExtractedFieldDTO<string>;
  };
  shiny: ExtractedFieldDTO<boolean>;
  ribbon: ExtractedFieldDTO<number>;
  sneakySnacking: ExtractedFieldDTO<boolean>;
}

/**
 * Error estructurado que puede devolver el endpoint.
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

export const ALLOWED_MIME_TYPES = ['image/png', 'image/jpeg', 'image/webp'];
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024; // 5 MB


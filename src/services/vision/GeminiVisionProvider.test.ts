/**
 * Tests del GeminiVisionProvider (frontend).
 *
 * - NO llama a Gemini real.
 * - Mockea fetch() para simular respuestas del backend seguro.
 * - Verifica manejo de errores HTTP y conversión a PokemonExtractionResult.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { GeminiVisionProvider } from './GeminiVisionProvider';
import type { PokemonExtractionResult } from '../../domain/vision/models';

// Ejemplo de respuesta válida que devolvería el backend
const VALID_EXTRACTION: PokemonExtractionResult = {
  species: { value: 'Pikachu', confidence: 0.99 },
  nickname: { value: 'Sparky', confidence: 0.95 },
  level: { value: 25, confidence: 0.98 },
  nature: { value: 'Quiet', confidence: 0.90 },
  mainSkill: { value: 'Charge Energy S', confidence: 0.99 },
  skillLevel: { value: 2, confidence: 0.85 },
  subskills: {
    10: { value: 'Berry Finding S', confidence: 0.98 },
    25: { value: 'Helping Speed M', confidence: 0.95 },
    50: { value: null, confidence: 0 },
    75: { value: null, confidence: 0 },
    100: { value: null, confidence: 0 },
  },
  ingredients: {
    1: { value: 'Apple', confidence: 0.99 },
    30: { value: null, confidence: 0 },
    60: { value: null, confidence: 0 },
  },
  shiny: { value: false, confidence: 0.99 },
  ribbon: { value: 1, confidence: 0.99 },
  sneakySnacking: { value: true, confidence: 0.99 },
};

// Imagen de prueba mínima
const dummyImage = new File(['dummy'], 'test.png', { type: 'image/png' });

function mockFetch(status: number, body: unknown) {
  const response = new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
  vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(response);
}

describe('GeminiVisionProvider', () => {
  beforeEach(() => { vi.restoreAllMocks(); });
  afterEach(() => { vi.restoreAllMocks(); });

  it('devuelve PokemonExtractionResult con respuesta válida del backend', async () => {
    mockFetch(200, VALID_EXTRACTION);
    const provider = new GeminiVisionProvider();
    const result = await provider.extractPokemonFromImage(dummyImage);

    expect(result.species.value).toBe('Pikachu');
    expect(result.species.confidence).toBe(0.99);
    expect(result.level.value).toBe(25);
    expect(result.subskills[10].value).toBe('Berry Finding S');
    expect(result.ingredients[1].value).toBe('Apple');
    expect(result.shiny.value).toBe(false);
  });

  it('devuelve campos null cuando el backend los devuelve null', async () => {
    const nullExtraction: PokemonExtractionResult = {
      ...VALID_EXTRACTION,
      nickname: { value: null, confidence: 0 },
      nature: { value: null, confidence: 0 },
      subskills: {
        10: { value: null, confidence: 0 },
        25: { value: null, confidence: 0 },
        50: { value: null, confidence: 0 },
        75: { value: null, confidence: 0 },
        100: { value: null, confidence: 0 },
      },
    };
    mockFetch(200, nullExtraction);
    const provider = new GeminiVisionProvider();
    const result = await provider.extractPokemonFromImage(dummyImage);
    expect(result.nickname.value).toBeNull();
    expect(result.nature.value).toBeNull();
    expect(result.subskills[10].value).toBeNull();
  });

  it('propaga campos con confidence baja sin modificarlos', async () => {
    const lowConfidence: PokemonExtractionResult = {
      ...VALID_EXTRACTION,
      level: { value: 50, confidence: 0.35 },
      nature: { value: 'Mansa', confidence: 0.42 },
    };
    mockFetch(200, lowConfidence);
    const provider = new GeminiVisionProvider();
    const result = await provider.extractPokemonFromImage(dummyImage);
    // El provider NO filtra por confidence — eso es responsabilidad del VisionValidationService
    expect(result.level.confidence).toBe(0.35);
    expect(result.nature.confidence).toBe(0.42);
  });

  it('lanza error amigable con 401/403 UNAUTHORIZED', async () => {
    mockFetch(403, { error: 'API key inválida', code: 'UNAUTHORIZED' });
    const provider = new GeminiVisionProvider();
    await expect(provider.extractPokemonFromImage(dummyImage))
      .rejects.toThrow('La API key de Gemini proporcionada no es válida');
  });

  it('lanza error amigable con 429 RATE_LIMIT', async () => {
    mockFetch(429, { error: 'rate limit', code: 'RATE_LIMIT' });
    const provider = new GeminiVisionProvider();
    await expect(provider.extractPokemonFromImage(dummyImage))
      .rejects.toThrow('límite de peticiones de Gemini');
  });

  it('lanza error amigable con 500 MISSING_API_KEY', async () => {
    mockFetch(500, { error: 'no key', code: 'MISSING_API_KEY' });
    const provider = new GeminiVisionProvider();
    await expect(provider.extractPokemonFromImage(dummyImage))
      .rejects.toThrow('No hay ninguna API key disponible');
  });

  it('lanza error amigable con 413 IMAGE_TOO_LARGE', async () => {
    mockFetch(413, { error: 'too large', code: 'IMAGE_TOO_LARGE' });
    const provider = new GeminiVisionProvider();
    await expect(provider.extractPokemonFromImage(dummyImage))
      .rejects.toThrow('límite de 5 MB');
  });

  it('lanza error amigable con 415 UNSUPPORTED_MIME', async () => {
    mockFetch(415, { error: 'mime', code: 'UNSUPPORTED_MIME' });
    const provider = new GeminiVisionProvider();
    await expect(provider.extractPokemonFromImage(dummyImage))
      .rejects.toThrow('Formato de imagen no soportado');
  });

  it('lanza error amigable con 400 GEMINI_ERROR', async () => {
    mockFetch(400, { error: 'bad request', code: 'GEMINI_ERROR' });
    const provider = new GeminiVisionProvider();
    await expect(provider.extractPokemonFromImage(dummyImage))
      .rejects.toThrow('Error temporal de Gemini o imagen rechazada');
  });

  it('lanza error con mensaje del backend si el código no tiene traducción (ej. 502)', async () => {
    mockFetch(502, { error: 'invalid json', code: 'INVALID_RESPONSE' });
    const provider = new GeminiVisionProvider();
    await expect(provider.extractPokemonFromImage(dummyImage))
      .rejects.toThrow('Error 502: invalid json');
  });

  it('lanza error de conexión si fetch rechaza (backend no iniciado)', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValueOnce(new TypeError('Failed to fetch'));
    const provider = new GeminiVisionProvider();
    await expect(provider.extractPokemonFromImage(dummyImage))
      .rejects.toThrow('No se pudo conectar');
  });

  it('lanza error de timeout si la solicitud se cancela', async () => {
    const abortError = new DOMException('The operation was aborted.', 'AbortError');
    vi.spyOn(globalThis, 'fetch').mockRejectedValueOnce(abortError);
    const provider = new GeminiVisionProvider();
    await expect(provider.extractPokemonFromImage(dummyImage))
      .rejects.toThrow('tardó demasiado');
  });

  it('la respuesta del frontend NO tiene import runtime de @google/genai', async () => {
    // Verificamos que el módulo no importa @google/genai mediante import real.
    // Los comentarios pueden mencionarlo, pero no los import statements.
    const fs = await import('fs');
    const path = await import('path');
    const content = fs.readFileSync(
      path.resolve('src/services/vision/GeminiVisionProvider.ts'),
      'utf-8'
    );
    // Extraer solo líneas de import (no comentarios)
    const importLines = content.split('\n').filter(line => {
      const trimmed = line.trim();
      return (trimmed.startsWith('import ') || trimmed.startsWith('import{')) && !trimmed.startsWith('//');
    });
    const importContent = importLines.join('\n');
    expect(importContent).not.toContain('@google/genai');
  });

  it('es intercambiable con MockVisionProvider a través de la misma interfaz', async () => {
    // Ambos implementan VisionProvider — el tipo garantiza intercambiabilidad.
    const { MockVisionProvider } = await import('./MockVisionProvider');
    mockFetch(200, VALID_EXTRACTION);

    const providers = [
      new GeminiVisionProvider(),
      new MockVisionProvider(),
    ];

    // Ambos exponen el mismo método
    for (const p of providers) {
      expect(typeof p.extractPokemonFromImage).toBe('function');
    }
  });

  describe('BYOK (Bring Your Own Key)', () => {
    it('envía la API key en la cabecera Authorization si se proporciona', async () => {
      const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
        new Response(JSON.stringify(VALID_EXTRACTION), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      );
      const provider = new GeminiVisionProvider('mi_clave_secreta');
      await provider.extractPokemonFromImage(dummyImage);

      expect(fetchSpy).toHaveBeenCalledTimes(1);
      const requestOptions = fetchSpy.mock.calls[0][1];
      expect(requestOptions?.headers).toMatchObject({
        'Content-Type': 'image/png',
        'Authorization': 'Bearer mi_clave_secreta'
      });
    });

    it('testConnection hace POST a /api/vision/test con la clave', async () => {
      const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
        new Response(JSON.stringify({ success: true }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      );
      await GeminiVisionProvider.testConnection('mi_clave_test');

      expect(fetchSpy).toHaveBeenCalledTimes(1);
      const [url, options] = fetchSpy.mock.calls[0];
      expect(url).toBe('/api/vision/test');
      expect(options?.method).toBe('POST');
      expect(options?.headers).toMatchObject({
        'Authorization': 'Bearer mi_clave_test'
      });
    });
  });
});

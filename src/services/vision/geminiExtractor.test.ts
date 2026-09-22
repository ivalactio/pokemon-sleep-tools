/**
 * Tests del GeminiExtractor (backend — lógica pura, sin transporte HTTP).
 *
 * - NO llama a Gemini real.
 * - Mockea el SDK @google/genai.
 * - Prueba todos los escenarios de error y respuesta válida.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ──────────────────────────────────────────────────────────────────────────────
// Mock del SDK @google/genai ANTES de importar el módulo bajo test
// ──────────────────────────────────────────────────────────────────────────────
const mockCreate = vi.fn();
vi.mock('@google/genai', () => ({
  GoogleGenAI: function() {
    return { interactions: { create: mockCreate } };
  },
}));

import { extractPokemonFromImageBuffer } from '../../../backend/geminiExtractor';

const dummyBuffer = Buffer.from('fake-image-data');
const MIME = 'image/png';

/**
 * Resultado válido aplanado que devuelve Gemini (antes de reshape)
 */
const VALID_FLAT_JSON = JSON.stringify({
  species: { value: 'Gengar', confidence: 0.98 },
  nickname: { value: null, confidence: 0 },
  level: { value: 50, confidence: 0.95 },
  nature: { value: 'Grosera', confidence: 0.90 },
  mainSkill: { value: 'Dream Shard Magnet S', confidence: 0.99 },
  skillLevel: { value: 3, confidence: 0.80 },
  subskill_10: { value: 'Berry Finding S', confidence: 0.92 },
  subskill_25: { value: null, confidence: 0 },
  subskill_50: { value: null, confidence: 0 },
  subskill_75: { value: null, confidence: 0 },
  subskill_100: { value: null, confidence: 0 },
  ingredient_1: { name: 'Cacao', quantity: null, confidence: 0.88 },
  ingredient_30: { name: null, quantity: null, confidence: 0 },
  ingredient_60: { name: null, quantity: null, confidence: 0 },
  shiny: { value: false, confidence: 0.99 },
  ribbon: { value: 0, confidence: 0.99 },
  sneakySnacking: { value: true, confidence: 0.90 },
});

describe('geminiExtractor', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.restoreAllMocks();
    process.env = { ...originalEnv, GEMINI_API_KEY: 'test-key' };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('garantiza que los caracteres especiales UTF-8 (•, ñ, áéíóú, ¿, ¡) sobreviven de extremo a extremo', async () => {
    const parsedValid = JSON.parse(VALID_FLAT_JSON);
    const specialMockResponse = {
      ...parsedValid,
      nickname: { value: 'Niño ¡¿ñ?!', confidence: 0.99 },
      nature: { value: 'Huraña •', confidence: 0.99 }
    };
    mockCreate.mockResolvedValueOnce({ output_text: JSON.stringify(specialMockResponse) });

    const result = await extractPokemonFromImageBuffer(Buffer.from('test'), 'image/png');
    
    expect(result.nickname?.value).toBe('Niño ¡¿ñ?!');
    expect(result.nature?.value).toBe('Huraña •');
  });

  it('convierte correctamente una respuesta válida a PokemonExtractionDTO', async () => {
    mockCreate.mockResolvedValueOnce({ output_text: VALID_FLAT_JSON });

    const result = await extractPokemonFromImageBuffer(dummyBuffer, MIME);

    expect(result.species.value).toBe('Gengar');
    expect(result.level.value).toBe(50);
    expect(result.nature.value).toBe('Grosera');
    expect(result.subskills[10].value).toBe('Berry Finding S');
    expect(result.subskills[25].value).toBeNull();
    expect(result.ingredients[1].value).toBe('Cacao');
    expect(result.ingredients[30].value).toBeNull();
    expect(result.shiny.value).toBe(false);
    expect(result.ribbon.value).toBe(0);
  });

  it('lanza MISSING_API_KEY si no hay clave de entorno', async () => {
    delete process.env.GEMINI_API_KEY;
    delete process.env.GOOGLE_API_KEY;

    await expect(extractPokemonFromImageBuffer(dummyBuffer, MIME))
      .rejects.toMatchObject({ code: 'MISSING_API_KEY' });
  });

  it('lanza INVALID_RESPONSE si Gemini devuelve texto vacío', async () => {
    mockCreate.mockResolvedValueOnce({ output_text: null });

    await expect(extractPokemonFromImageBuffer(dummyBuffer, MIME))
      .rejects.toMatchObject({ code: 'INVALID_RESPONSE' });
  });

  it('lanza INVALID_RESPONSE si Gemini devuelve JSON no parseable', async () => {
    mockCreate.mockResolvedValueOnce({ output_text: 'esto no es json {{{' });

    await expect(extractPokemonFromImageBuffer(dummyBuffer, MIME))
      .rejects.toMatchObject({ code: 'INVALID_RESPONSE' });
  });

  it('lanza INVALID_RESPONSE si falta un campo obligatorio en el JSON', async () => {
    const incompleteJson = JSON.stringify({
      species: { value: 'Pikachu', confidence: 0.99 },
      // faltan los demás campos
    });
    mockCreate.mockResolvedValueOnce({ output_text: incompleteJson });

    await expect(extractPokemonFromImageBuffer(dummyBuffer, MIME))
      .rejects.toMatchObject({ code: 'INVALID_RESPONSE' });
  });

  it('lanza errores con confidence baja sin modificar los valores', async () => {
    const lowConfidenceJson = JSON.stringify({
      ...JSON.parse(VALID_FLAT_JSON),
      level: { value: 10, confidence: 0.22 },
      nature: { value: 'Mansa', confidence: 0.41 },
    });
    mockCreate.mockResolvedValueOnce({ output_text: lowConfidenceJson });

    const result = await extractPokemonFromImageBuffer(dummyBuffer, MIME);
    // El extractor NO filtra por confidence — la UI lo hace
    expect(result.level.value).toBe(10);
    expect(result.level.confidence).toBe(0.22);
    expect(result.nature.confidence).toBe(0.41);
  });

  it('propaga errores del SDK con status 401 tal cual', async () => {
    const sdkError = Object.assign(new Error('Unauthorized'), { status: 401 });
    mockCreate.mockRejectedValueOnce(sdkError);

    await expect(extractPokemonFromImageBuffer(dummyBuffer, MIME))
      .rejects.toMatchObject({ status: 401 });
  });

  it('propaga errores del SDK con status 429 tal cual', async () => {
    const sdkError = Object.assign(new Error('Rate limit'), { status: 429 });
    mockCreate.mockRejectedValueOnce(sdkError);

    await expect(extractPokemonFromImageBuffer(dummyBuffer, MIME))
      .rejects.toMatchObject({ status: 429 });
  });

  it('maneja campos null correctamente en el reshape', async () => {
    const allNullJson = JSON.stringify({
      species: { value: null, confidence: 0 },
      nickname: { value: null, confidence: 0 },
      level: { value: null, confidence: 0 },
      nature: { value: null, confidence: 0 },
      mainSkill: { value: null, confidence: 0 },
      skillLevel: { value: null, confidence: 0 },
      subskill_10: { value: null, confidence: 0 },
      subskill_25: { value: null, confidence: 0 },
      subskill_50: { value: null, confidence: 0 },
      subskill_75: { value: null, confidence: 0 },
      subskill_100: { value: null, confidence: 0 },
      ingredient_1: { name: null, quantity: null, confidence: 0 },
      ingredient_30: { name: null, quantity: null, confidence: 0 },
      ingredient_60: { name: null, quantity: null, confidence: 0 },
      shiny: { value: null, confidence: 0 },
      ribbon: { value: null, confidence: 0 },
      sneakySnacking: { value: null, confidence: 0 },
    });
    mockCreate.mockResolvedValueOnce({ output_text: allNullJson });

    const result = await extractPokemonFromImageBuffer(dummyBuffer, MIME);
    expect(result.species.value).toBeNull();
    expect(result.level.value).toBeNull();
    expect(result.subskills[10].value).toBeNull();
    expect(result.ingredients[60].value).toBeNull();
  });

  describe('BYOK y testGeminiConnection', () => {
    it('utiliza userKey prioritariamente sobre process.env', async () => {
      mockCreate.mockResolvedValueOnce({ output_text: VALID_FLAT_JSON });
      await extractPokemonFromImageBuffer(dummyBuffer, MIME, 'my-byok-key');
      
      // Since GoogleGenAI checks key internally, we can't easily assert the constructor arg here
      // but we know it doesn't throw MISSING_API_KEY even if env is empty
      delete process.env.GEMINI_API_KEY;
      delete process.env.GOOGLE_API_KEY;
      mockCreate.mockResolvedValueOnce({ output_text: VALID_FLAT_JSON });
      const result = await extractPokemonFromImageBuffer(dummyBuffer, MIME, 'my-byok-key');
      expect(result.species.value).toBe('Gengar');
    });

    it('testGeminiConnection hace una llamada mínima', async () => {
      const { testGeminiConnection } = await import('../../../backend/geminiExtractor');
      mockCreate.mockResolvedValueOnce({});
      await testGeminiConnection('my-byok-key');
      expect(mockCreate).toHaveBeenCalled();
      const createArgs = mockCreate.mock.calls[0][0];
      expect(createArgs.input).toBe('ping');
    });
  });
});

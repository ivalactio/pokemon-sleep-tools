/**
 * GeminiExtractor — lógica pura de extracción vía Gemini.
 *
 * Esta capa NO tiene dependencias HTTP. Solo sabe llamar al SDK de Gemini.
 * Diseñada para ser reutilizable en Cloud Functions, serverless, etc.
 *
 * IMPORTANTE:
 * - La API key se lee del entorno del servidor: GEMINI_API_KEY o GOOGLE_API_KEY.
 * - Nunca se expone al cliente.
 * - No se guarda la imagen ni la respuesta bruta en disco o base de datos.
 * - Una captura = una sola llamada a Gemini.
 */

import { GoogleGenAI } from '@google/genai';
import type { PokemonExtractionDTO } from './extractionSchema.js';

const MODEL = 'gemini-3.6-flash';

/**
 * Prompt especializado para Pokémon Sleep.
 *
 * Principios de diseño:
 * 1. Extrae SOLO lo que aparece visible en la imagen. No inventes datos.
 * 2. Si un campo no está visible o es ilegible → null.
 * 3. Devuelve el texto exactamente como aparece en pantalla (puede ser ES o EN).
 *    El sistema validará y normalizará después.
 * 4. La confidence es una estimación de legibilidad, no una probabilidad calibrada:
 *    - 1.0 = texto claramente legible
 *    - 0.5-0.7 = texto parcialmente visible o dudoso
 *    - < 0.5 = muy difícil de leer; considera usar null
 * 5. NO completes datos por conocimiento externo (ingredientes típicos de una especie,
 *    habilidad principal, etc.). Solo lo que ves.
 */
const POKEMON_SLEEP_PROMPT = `You are a Pokémon Sleep data extractor. Analyze this screenshot from the Pokémon Sleep mobile game.

CRITICAL RULES:
1. Extract ONLY data that is CLEARLY VISIBLE in the image. Do NOT invent or infer data.
2. If a field is not visible, partially covered, or illegible → set value to null.
3. Do NOT use your knowledge of the game to fill in missing data (e.g., do NOT infer ingredients from species, do NOT infer the main skill from species).
4. Return text EXACTLY as it appears on screen (Spanish or English is fine — our system normalizes it).
5. Distinguish the Pokémon's NICKNAME (custom name given by trainer) from the SPECIES NAME.
6. Distinguish INGREDIENTS (food items like Apple, Honey, Egg) from SUBSKILLS (stat bonuses like Berry Finding S).
7. SUBSKILLS unlock at levels 10, 25, 50, 75, 100 — do NOT confuse with ingredients.
8. INGREDIENTS appear at unlock levels 1, 30, 60.
9. The MAIN SKILL is a single special ability (e.g., "Charge Energy S", "Ingredient Magnet S") — do NOT confuse with subskills.
10. RIBBON LEVEL is a small icon/badge (0-4). If no ribbon is visible → 0.
11. SHINY: a golden/sparkly visual indicator. If not clearly visible → false.
12. SNEAKY SNACKING: shown as a toggle/icon. Extract only if clearly visible.

CONFIDENCE SCALE (not a mathematical probability, just a legibility estimate):
- 1.0: text/data is crystal clear and fully legible
- 0.8-0.9: clearly visible but minor font/quality issues
- 0.5-0.7: partially visible, small text, or slightly obscured — user should review
- < 0.5: very hard to read; prefer returning null

Extract all visible Pokémon Sleep data from this screenshot and return it as structured JSON.`;

/**
 * JSON Schema compatible con la API de Gemini structured output.
 * Mapea exactamente a PokemonExtractionDTO.
 */
const EXTRACTION_RESPONSE_SCHEMA = {
  type: 'object',
  properties: {
    species: {
      type: 'object',
      properties: {
        value: { type: 'string', nullable: true, description: 'The Pokémon species name as shown on screen, or null if not visible' },
        confidence: { type: 'number', description: 'Legibility confidence 0.0-1.0' }
      },
      required: ['value', 'confidence']
    },
    nickname: {
      type: 'object',
      properties: {
        value: { type: 'string', nullable: true, description: 'Custom trainer nickname, or null if same as species or not visible' },
        confidence: { type: 'number' }
      },
      required: ['value', 'confidence']
    },
    level: {
      type: 'object',
      properties: {
        value: { type: 'number', nullable: true, description: 'Pokémon level 1-100, or null if not visible' },
        confidence: { type: 'number' }
      },
      required: ['value', 'confidence']
    },
    nature: {
      type: 'object',
      properties: {
        value: { type: 'string', nullable: true, description: 'Nature name as shown on screen (ES or EN), or null' },
        confidence: { type: 'number' }
      },
      required: ['value', 'confidence']
    },
    mainSkill: {
      type: 'object',
      properties: {
        value: { type: 'string', nullable: true, description: 'Main Skill name exactly as shown, or null' },
        confidence: { type: 'number' }
      },
      required: ['value', 'confidence']
    },
    skillLevel: {
      type: 'object',
      properties: {
        value: { type: 'number', nullable: true, description: 'Main Skill level 1-7, or null' },
        confidence: { type: 'number' }
      },
      required: ['value', 'confidence']
    },
    subskill_10: {
      type: 'object',
      properties: {
        value: { type: 'string', nullable: true, description: 'Subskill at level 10, or null' },
        confidence: { type: 'number' }
      },
      required: ['value', 'confidence']
    },
    subskill_25: {
      type: 'object',
      properties: {
        value: { type: 'string', nullable: true },
        confidence: { type: 'number' }
      },
      required: ['value', 'confidence']
    },
    subskill_50: {
      type: 'object',
      properties: {
        value: { type: 'string', nullable: true },
        confidence: { type: 'number' }
      },
      required: ['value', 'confidence']
    },
    subskill_75: {
      type: 'object',
      properties: {
        value: { type: 'string', nullable: true },
        confidence: { type: 'number' }
      },
      required: ['value', 'confidence']
    },
    subskill_100: {
      type: 'object',
      properties: {
        value: { type: 'string', nullable: true },
        confidence: { type: 'number' }
      },
      required: ['value', 'confidence']
    },
    ingredient_1: {
      type: 'object',
      properties: {
        name: { type: 'string', nullable: true, description: 'Ingredient name exactly as shown without quantity (e.g. "Apple" from "Apple x2")' },
        quantity: { type: 'number', nullable: true, description: 'Quantity shown next to the ingredient (e.g. 2 for "Apple x2")' },
        confidence: { type: 'number' }
      },
      required: ['name', 'quantity', 'confidence']
    },
    ingredient_30: {
      type: 'object',
      properties: {
        name: { type: 'string', nullable: true },
        quantity: { type: 'number', nullable: true },
        confidence: { type: 'number' }
      },
      required: ['name', 'quantity', 'confidence']
    },
    ingredient_60: {
      type: 'object',
      properties: {
        name: { type: 'string', nullable: true },
        quantity: { type: 'number', nullable: true },
        confidence: { type: 'number' }
      },
      required: ['name', 'quantity', 'confidence']
    },
    shiny: {
      type: 'object',
      properties: {
        value: { type: 'boolean', nullable: true, description: 'True if golden/sparkle shiny indicator visible' },
        confidence: { type: 'number' }
      },
      required: ['value', 'confidence']
    },
    ribbon: {
      type: 'object',
      properties: {
        value: { type: 'number', nullable: true, description: 'Ribbon level 0-4, null if not determinable' },
        confidence: { type: 'number' }
      },
      required: ['value', 'confidence']
    },
    sneakySnacking: {
      type: 'object',
      properties: {
        value: { type: 'boolean', nullable: true },
        confidence: { type: 'number' }
      },
      required: ['value', 'confidence']
    }
  },
  required: [
    'species', 'nickname', 'level', 'nature', 'mainSkill', 'skillLevel',
    'subskill_10', 'subskill_25', 'subskill_50', 'subskill_75', 'subskill_100',
    'ingredient_1', 'ingredient_30', 'ingredient_60',
    'shiny', 'ribbon', 'sneakySnacking'
  ]
};

/**
 * Flat response from Gemini → reshape to nested DTO structure
 */
type GeminiFlat = {
  species: { value: string | null; confidence: number };
  nickname: { value: string | null; confidence: number };
  level: { value: number | null; confidence: number };
  nature: { value: string | null; confidence: number };
  mainSkill: { value: string | null; confidence: number };
  skillLevel: { value: number | null; confidence: number };
  subskill_10: { value: string | null; confidence: number };
  subskill_25: { value: string | null; confidence: number };
  subskill_50: { value: string | null; confidence: number };
  subskill_75: { value: string | null; confidence: number };
  subskill_100: { value: string | null; confidence: number };
  ingredient_1: { name: string | null; quantity: number | null; confidence: number };
  ingredient_30: { name: string | null; quantity: number | null; confidence: number };
  ingredient_60: { name: string | null; quantity: number | null; confidence: number };
  shiny: { value: boolean | null; confidence: number };
  ribbon: { value: number | null; confidence: number };
  sneakySnacking: { value: boolean | null; confidence: number };
};

function reshapeResponse(flat: GeminiFlat): PokemonExtractionDTO {
  return {
    species: flat.species,
    nickname: flat.nickname,
    level: flat.level,
    nature: flat.nature,
    mainSkill: flat.mainSkill,
    skillLevel: flat.skillLevel,
    subskills: {
      10: flat.subskill_10,
      25: flat.subskill_25,
      50: flat.subskill_50,
      75: flat.subskill_75,
      100: flat.subskill_100,
    },
    ingredients: {
      1: { value: flat.ingredient_1.name, confidence: flat.ingredient_1.confidence },
      30: { value: flat.ingredient_30.name, confidence: flat.ingredient_30.confidence },
      60: { value: flat.ingredient_60.name, confidence: flat.ingredient_60.confidence },
    },
    shiny: flat.shiny,
    ribbon: flat.ribbon,
    sneakySnacking: flat.sneakySnacking,
  };
}

export async function extractPokemonFromImageBuffer(
  imageBuffer: Buffer,
  mimeType: string,
  userKey?: string
): Promise<PokemonExtractionDTO> {
  console.log(`[vision-server] API key source: ${userKey ? 'user' : 'server'}`);
  
  const apiKey = userKey || process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  if (!apiKey) {
    const err = new Error('No API key provided');
    (err as NodeJS.ErrnoException).code = 'MISSING_API_KEY';
    throw err;
  }

  const ai = new GoogleGenAI({ apiKey });

  const base64Image = imageBuffer.toString('base64');

  console.log('[vision-server] calling Gemini');
  const response = await ai.interactions.create({
    model: MODEL,
    store: false, // No persistir la interacción — privacidad
    input: [
      { type: 'text', text: POKEMON_SLEEP_PROMPT },
      { type: 'image', data: base64Image, mime_type: mimeType as 'image/png' | 'image/jpeg' | 'image/webp' }
    ],
    response_format: EXTRACTION_RESPONSE_SCHEMA,
  }, { timeout: 30_000 });
  console.log('[vision-server] Gemini response received');

  const outputText = response.output_text;
  if (!outputText) {
    throw Object.assign(new Error('Gemini returned an empty response'), { code: 'INVALID_RESPONSE' });
  }

  let parsed: GeminiFlat;
  try {
    parsed = JSON.parse(outputText) as GeminiFlat;
  } catch {
    throw Object.assign(new Error('Gemini response was not valid JSON'), { code: 'INVALID_RESPONSE' });
  }

  // Validate required top-level fields exist
  const requiredFields: (keyof GeminiFlat)[] = [
    'species', 'nickname', 'level', 'nature', 'mainSkill', 'skillLevel',
    'subskill_10', 'subskill_25', 'subskill_50', 'subskill_75', 'subskill_100',
    'ingredient_1', 'ingredient_30', 'ingredient_60',
    'shiny', 'ribbon', 'sneakySnacking'
  ];
  for (const field of requiredFields) {
    if (!(field in parsed)) {
      throw Object.assign(
        new Error(`Gemini response missing required field: ${field}`),
        { code: 'INVALID_RESPONSE' }
      );
    }
  }

  return reshapeResponse(parsed);
}

export async function testGeminiConnection(userKey?: string): Promise<void> {
  const apiKey = userKey || process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  if (!apiKey) {
    const err = new Error('No API key provided');
    (err as NodeJS.ErrnoException).code = 'MISSING_API_KEY';
    throw err;
  }

  const ai = new GoogleGenAI({ apiKey });

  console.log('[vision-server] calling Gemini');
  // Minimal interaction to test connection
  await ai.interactions.create({
    model: MODEL,
    store: false,
    input: 'ping',
  }, { timeout: 10_000 });
  console.log('[vision-server] Gemini response received');
}

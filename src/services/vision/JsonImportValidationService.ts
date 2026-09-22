import type { PokemonDraft, PokemonExtractionResult, ExtractedField } from '../../domain/vision/models';
import { VisionValidationService } from './VisionValidationService';
import type { StaticDataSchema } from '../../domain/models';
import _gamedata from '../../data/static/gamedata.json';

const gamedata = _gamedata as unknown as StaticDataSchema;

export interface ExternalIngredient {
  ingrediente: string | null;
  cantidad: number | null;
}

export interface ExternalPokemonJson {
  archivo_origen?: string | null;
  especie?: string | null;
  nivel?: number | null;
  naturaleza?: string | null;
  nivel_habilidad_principal?: number | null;
  subhabilidad_10?: string | null;
  subhabilidad_25?: string | null;
  subhabilidad_50?: string | null;
  subhabilidad_75?: string | null;
  subhabilidad_100?: string | null;
  ingredientes_1?: ExternalIngredient | null;
  ingredientes_30?: ExternalIngredient | null;
  ingredientes_60?: ExternalIngredient | null;
  [key: string]: any;
}

export class JsonImportValidationService {
  private static toField<T>(value: T | null | undefined): ExtractedField<T> {
    return {
      value: value === undefined ? null : value,
      confidence: 1.0
    };
  }

  static parseJson(jsonString: string): ExternalPokemonJson[] {
    const data = JSON.parse(jsonString);
    if (Array.isArray(data)) {
      return data;
    } else if (data && typeof data === 'object' && data.version && Array.isArray(data.pokemon)) {
      // Future-proofing
      return data.pokemon;
    }
    throw new Error('Formato JSON no reconocido. Se esperaba un array o un objeto con version y array de pokemon.');
  }

  static processExternalPokemon(external: ExternalPokemonJson): PokemonDraft {
    const extraction: PokemonExtractionResult = {
      species: this.toField(external.especie),
      nickname: this.toField<string>(null),
      level: this.toField(external.nivel),
      nature: this.toField(external.naturaleza),
      mainSkill: this.toField<string>(null),
      skillLevel: this.toField(external.nivel_habilidad_principal),
      shiny: this.toField<boolean>(null),
      ribbon: this.toField<number>(null),
      sneakySnacking: this.toField<boolean>(null),
      subskills: {
        10: this.toField(external.subhabilidad_10),
        25: this.toField(external.subhabilidad_25),
        50: this.toField(external.subhabilidad_50),
        75: this.toField(external.subhabilidad_75),
        100: this.toField(external.subhabilidad_100),
      },
      ingredients: {
        1: this.toField(external.ingredientes_1?.ingrediente),
        30: this.toField(external.ingredientes_30?.ingrediente),
        60: this.toField(external.ingredientes_60?.ingrediente),
      }
    };

    // 1. Validate Extraction to generate the Draft (uses existing VisionValidationService)
    const draft = VisionValidationService.validateExtraction(extraction);

    // Add UI metadata
    draft.sourceFile = external.archivo_origen || undefined;
    draft.importId = crypto.randomUUID();

    // 2. Additional validation: Ingredient amounts
    if (draft.pokemon.speciesId) {
      const species = gamedata.species.find(s => s.name === draft.pokemon.speciesId);
      if (species) {
        this.validateIngredientAmount(draft, species, 1, external.ingredientes_1);
        this.validateIngredientAmount(draft, species, 30, external.ingredientes_30);
        this.validateIngredientAmount(draft, species, 60, external.ingredientes_60);
      }
    }

    // Capture unknown fields as warnings
    const knownKeys = new Set([
      'archivo_origen', 'especie', 'nivel', 'naturaleza', 'nivel_habilidad_principal',
      'subhabilidad_10', 'subhabilidad_25', 'subhabilidad_50', 'subhabilidad_75', 'subhabilidad_100',
      'ingredientes_1', 'ingredientes_30', 'ingredientes_60'
    ]);
    for (const key of Object.keys(external)) {
      if (!knownKeys.has(key)) {
         draft.warnings.push(`Campo desconocido ignorado: ${key}`);
      }
    }

    return draft;
  }

  private static validateIngredientAmount(
    draft: PokemonDraft, 
    species: any, 
    level: 1 | 30 | 60, 
    externalIng?: ExternalIngredient | null
  ) {
    if (!externalIng || externalIng.cantidad === null || externalIng.cantidad === undefined || !externalIng.ingrediente) {
      return;
    }
    
    // Si ya hubo un error con el nombre, no comprobamos la cantidad
    if (draft.errors[`ingredient_${level}`]) {
      return;
    }

    const internalIngName = draft.pokemon.ingredientChoices?.[level];
    if (!internalIngName) return;

    const targetSetArray = level === 1 ? species.ingredient0 : species[`ingredient${level}`];
    
    const matchedSet = targetSetArray?.find((s: any) => s.ingredient.name === internalIngName);
    if (matchedSet) {
      if (!Number.isInteger(externalIng.cantidad)) {
         draft.errors[`ingredient_${level}`] = `Cantidad de ingrediente nv ${level} debe ser entera (${externalIng.cantidad})`;
      } else if (matchedSet.amount !== externalIng.cantidad) {
         draft.errors[`ingredient_${level}`] = `Cantidad incorrecta para ${internalIngName} en nv ${level}. Se esperaba ${matchedSet.amount} pero se recibió ${externalIng.cantidad}`;
      }
    }
  }
}

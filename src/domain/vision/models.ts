import type { OwnedPokemon } from '../models';

export interface ExtractedField<T> {
  value: T | null;
  confidence: number;
}

export interface ExtractedSubskills {
  10: ExtractedField<string>;
  25: ExtractedField<string>;
  50: ExtractedField<string>;
  75: ExtractedField<string>;
  100: ExtractedField<string>;
}

export interface ExtractedIngredients {
  1: ExtractedField<string>;
  30: ExtractedField<string>;
  60: ExtractedField<string>;
}

export interface PokemonExtractionResult {
  species: ExtractedField<string>;
  nickname: ExtractedField<string>;
  level: ExtractedField<number>;
  nature: ExtractedField<string>;
  mainSkill: ExtractedField<string>;
  skillLevel: ExtractedField<number>;
  subskills: ExtractedSubskills;
  ingredients: ExtractedIngredients;
  shiny: ExtractedField<boolean>;
  ribbon: ExtractedField<number>;
  sneakySnacking: ExtractedField<boolean>;
}

export interface PokemonDraft {
  pokemon: Partial<OwnedPokemon>;
  errors: Record<string, string>;
  warnings: string[];
  rawExtraction: PokemonExtractionResult;
}

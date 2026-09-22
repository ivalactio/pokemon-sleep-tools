export interface StaticIngredient {
  name: string;
  value: number;
  taxedValue: number;
  longName?: string;
}

export interface StaticBerry {
  name: string;
  value: number;
  type: string;
}

export interface StaticSkill {
  name: string;
  description: string;
  RP?: number[];
  image?: string;
  // effects/activations omitted for brevity but allowed as any record if needed, though we avoid any
  activations?: Record<string, unknown>;
}

export interface StaticSubSkill {
  name: string;
  rarity: 'gold' | 'silver' | 'blue';
  bonus?: Record<string, number>;
}

export interface StaticNature {
  name: string;
  up?: string | null;
  down?: string | null;
}

export interface IngredientSet {
  amount: number;
  ingredient: StaticIngredient;
}

export interface PokemonSpecies {
  name: string; // "BULBASAUR"
  pokedexNumber: number;
  displayName: string;
  specialty: 'berry' | 'ingredient' | 'skill';
  berry: StaticBerry;
  genders?: { male: number; female: number };
  carrySize: number;
  frequency: number;
  ingredientPercentage: number;
  skillPercentage: number;
  previousEvolutions: number;
  remainingEvolutions: number;
  skill: StaticSkill;
  evolvesInto?: string[];
  ingredient0: IngredientSet[];
  ingredient30: IngredientSet[];
  ingredient60: IngredientSet[];
  pityProcThreshold?: number;
}

export interface Recipe {
  name: string;
  displayName: string;
  type: 'curry' | 'salad' | 'dessert';
  ingredients: IngredientSet[];
  value: number;
  valueMax: number;
  bonus: number;
  nrOfIngredients: number;
}

export interface StaticDataSchema {
  gameDataVersion: string;
  species: PokemonSpecies[];
  ingredients: StaticIngredient[];
  berries: StaticBerry[];
  recipes: Recipe[];
  mainSkills: StaticSkill[];
  subSkills: StaticSubSkill[];
  natures: StaticNature[];
}

export interface OwnedPokemon {
  id: string;
  speciesId: string;
  nickname: string;
  level: number;
  ribbonLevel: 0 | 1 | 2 | 3 | 4;
  natureId: string;
  subskills: {
    10: string | null;
    25: string | null;
    50: string | null;
    75: string | null;
    100: string | null;
  };
  ingredientChoices: {
    1?: string | null;
    30: string | null;
    60: string | null;
  };
  skillLevel: number;
  shiny: boolean;
  notes: string;
  sneakySnacking: boolean;
  helpingFrequencySeen: number | null;
  carryLimitSeen: number | null;
  source: string;
  createdAt: number;
  updatedAt: number;
  gameDataVersion: string;
}

export interface ExportSchema {
  schemaVersion: 1;
  gameDataVersion: string;
  pokemon: OwnedPokemon[];
}

export interface SimulationConfig {
  camp: boolean;
  bedtime: string; // "HH:MM"
  wakeup: string; // "HH:MM"
}

export interface ProductionEstimate {
  period: string; // e.g., "24 horas"
  berries: { name: string; amount: number }[];
  ingredients: { name: string; amount: number }[];
  skillProcs: number;
  configUsed: SimulationConfig;
  calculatedAt: number;
}

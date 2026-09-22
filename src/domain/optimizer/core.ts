import type { OwnedPokemon, SimulationConfig } from '../models';

export interface TeamConstraints {
  minLevel?: number;
  uniqueSpecies: boolean;
  requiredPokemonIds: string[];
  excludedPokemonIds: string[];
}

export type OptimizerObjective = 'berries' | 'ingredients' | 'skill' | 'recipe';

export interface OptimizerConfig {
  simulation: SimulationConfig;
  constraints: TeamConstraints;
  targetRecipeId?: string;       
  objectives: OptimizerObjective[]; 
  maxResults: number;               // Default 10, configurable 5-20
}

export interface RecipeScore {
  recipeName: string;
  coveragePercent: number;       // % de cada ingrediente requerido cubierto/día
  ingredientsMissing: string[];  // ingredientes de la receta que el equipo NO produce
  // NOTA: En v1, estimatedServings debe mostrarse en la UI como:
  // "Estimación aproximada de cobertura de la receta; no representa todavía el número real de comidas cocinables por día."
  estimatedServings: number;     
  totalIngredientValue: number;  
}

export interface TeamScore {
  objective: OptimizerObjective;
  score: number;
  // Desglose según el objetivo:
  berryDetails?: { totalValue: number; favoredValue: number };
  ingredientDetails?: { totalValue: number };
  recipeDetails?: RecipeScore;
}

export interface TeamResult {
  evaluation: TeamEvaluationContext;
  score: TeamScore;
}

export interface Team {
  members: OwnedPokemon[];
}

import type { ProductionEstimate } from '../models';

export interface TeamMemberEvaluation {
  pokemon: OwnedPokemon;
  estimate: ProductionEstimate;
}

export interface TeamMetadata {
  uniqueSpecies: number;
  uniqueSkills: number;
  uniqueBerries: number;
  specialtyBreakdown: { berry: number; ingredient: number; skill: number };
}

export interface TeamEvaluationContext {
  team: Team;
  memberEstimates: TeamMemberEvaluation[];
  teamEstimate: ProductionEstimate | null; // v1: No hay estimación agregada de sinergia real
  metadata: TeamMetadata;
}

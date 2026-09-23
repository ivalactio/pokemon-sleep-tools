import type { OptimizerConfig } from './optimizer/core';
import type { IslandId } from './optimizer/islands';
import type { OptimizerObjective, RecipeType } from './optimizer/core';

export type QueryType = 'organizer' | 'planner';

export interface SavedQuery {
  id: string;
  name: string;
  createdAt: number;
  type?: QueryType;
  config?: OptimizerConfig;
  plannerContext?: WeeklyPlan;
}

export interface SavedTeam {
  id: string;
  name: string;
  createdAt: number;
  queryContext: OptimizerConfig; // The scenario it was generated under
  memberIds: string[]; // References to actual pokemon in collection
  metrics?: {
    berries: number;
    ingredients: number;
    skills: number;
    score: number;
  };
}

export interface DailyPlan {
  dayOfWeek: number; // 1 (Monday) to 7 (Sunday)
  teamId?: string; // Overrides mainTeamId if set
  recipeId?: string; // Recipe for the day
  notes?: string;
}

export interface WeeklyPlan {
  id: string;
  name: string;
  createdAt: number;
  weekStart: string; // ISO date string e.g., '2026-09-21'
  
  // Context
  island: IslandId;
  areaBonus: number;
  favoriteBerries: string[];
  recipeType: RecipeType;
  targetRecipeId?: string;
  objective: OptimizerObjective;
  
  // Teams
  mainTeamId?: string;
  alternativeTeamIds: string[]; // for alternate scenarios
  
  // Daily overrides
  dailyPlans: DailyPlan[];
  
  notes?: string;
}

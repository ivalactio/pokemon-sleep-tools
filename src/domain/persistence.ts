import type { OptimizerConfig } from './optimizer/core';

export interface SavedQuery {
  id: string;
  name: string;
  createdAt: number;
  config: OptimizerConfig;
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

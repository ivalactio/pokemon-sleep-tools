import { expect, test } from 'vitest';
import {
  BerryScoringStrategy,
  IngredientScoringStrategy,
  RecipeScoringStrategy
} from './ScoringStrategies';
import type { TeamEvaluationContext } from '../../domain/optimizer/core';
import type { StaticDataSchema, OwnedPokemon, SimulationConfig, ProductionEstimate } from '../../domain/models';

const mockGameData: StaticDataSchema = {
  gameDataVersion: '1',
  species: [],
  ingredients: [
    { name: 'Apple', value: 90, taxedValue: 90, longName: 'Fancy Apple' },
    { name: 'Honey', value: 101, taxedValue: 101, longName: 'Honey' }
  ],
  berries: [
    { name: 'GREPA', value: 25, type: 'electric' },
    { name: 'DURIN', value: 30, type: 'grass' }
  ],
  recipes: [
    {
      name: 'APPLE_JUICE',
      displayName: 'Apple Juice',
      type: 'dessert',
      value: 500,
      valueMax: 1000,
      bonus: 1,
      nrOfIngredients: 10,
      ingredients: [
        { amount: 10, ingredient: { name: 'Apple', value: 90, taxedValue: 90, longName: 'Apple' } }
      ]
    },
    {
      name: 'APPLE_HONEY_SALAD',
      displayName: 'Apple Honey Salad',
      type: 'salad',
      value: 1200,
      valueMax: 2000,
      bonus: 1,
      nrOfIngredients: 20,
      ingredients: [
        { amount: 10, ingredient: { name: 'Apple', value: 90, taxedValue: 90, longName: 'Apple' } },
        { amount: 10, ingredient: { name: 'Honey', value: 101, taxedValue: 101, longName: 'Honey' } }
      ]
    }
  ],
  mainSkills: [], subSkills: [], natures: []
};

const makeEstimate = (berries: any[], ingredients: any[], config: SimulationConfig): ProductionEstimate => ({
  period: '24h',
  berries,
  ingredients,
  skillProcs: 1,
  configUsed: config,
  calculatedAt: 0
});

const mockConfig: SimulationConfig = {
  camp: false,
  bedtime: '22:00',
  wakeup: '06:00',
  island: 'greengrass',
  areaBonus: 0,
  favoriteBerries: ['GREPA', 'DURIN', 'LUM'] // Explicitly setting favorites
};

test('BerryScoringStrategy correctly calculates total and favored values', () => {
  const strategy = new BerryScoringStrategy(mockGameData);
  const context: TeamEvaluationContext = {
    team: { members: [] },
    metadata: { uniqueSpecies: 1, uniqueSkills: 1, uniqueBerries: 1, specialtyBreakdown: { berry: 1, ingredient: 0, skill: 0 } },
    teamEstimate: null,
    memberEstimates: [
      {
        pokemon: {} as OwnedPokemon,
        estimate: makeEstimate([{ name: 'GREPA', amount: 10 }], [], mockConfig) // Favored: 10 * 25 * 2 = 500
      },
      {
        pokemon: {} as OwnedPokemon,
        estimate: makeEstimate([{ name: 'CHESTO', amount: 10 }], [], mockConfig) // Not favored, not in mockGameData -> 0
      }
    ]
  };

  const score = strategy.score(context);
  expect(score.objective).toBe('berries');
  expect(score.score).toBe(500);
  expect(score.berryDetails?.totalValue).toBe(500);
  expect(score.berryDetails?.favoredValue).toBe(500);
});

test('BerryScoringStrategy uses island default favorites if config has no favoriteBerries', () => {
  const strategy = new BerryScoringStrategy(mockGameData);
  const configNoFavs: SimulationConfig = { ...mockConfig, island: 'cyan', favoriteBerries: undefined };
  // Cyan beach defaults: ORAN, PECHA, PAMTRE. We'll simulate producing GREPA (not favored)
  
  const context: TeamEvaluationContext = {
    team: { members: [] },
    metadata: { uniqueSpecies: 1, uniqueSkills: 1, uniqueBerries: 1, specialtyBreakdown: { berry: 1, ingredient: 0, skill: 0 } },
    teamEstimate: null,
    memberEstimates: [
      {
        pokemon: {} as OwnedPokemon,
        estimate: makeEstimate([{ name: 'GREPA', amount: 10 }], [], configNoFavs) // Base: 10 * 25 = 250
      }
    ]
  };

  const score = strategy.score(context);
  expect(score.score).toBe(250);
  expect(score.berryDetails?.favoredValue).toBe(0);
});

test('IngredientScoringStrategy calculates total value', () => {
  const strategy = new IngredientScoringStrategy(mockGameData);
  const context: TeamEvaluationContext = {
    team: { members: [] },
    metadata: { uniqueSpecies: 1, uniqueSkills: 1, uniqueBerries: 1, specialtyBreakdown: { berry: 1, ingredient: 0, skill: 0 } },
    teamEstimate: null,
    memberEstimates: [
      {
        pokemon: {} as OwnedPokemon,
        estimate: makeEstimate([], [{ name: 'Apple', amount: 10 }], mockConfig) // 10 * 90 = 900
      },
      {
        pokemon: {} as OwnedPokemon,
        estimate: makeEstimate([], [{ name: 'Honey', amount: 5 }], mockConfig) // 5 * 101 = 505
      }
    ]
  };

  const score = strategy.score(context);
  expect(score.objective).toBe('ingredients');
  expect(score.score).toBe(1405);
  expect(score.ingredientDetails?.totalValue).toBe(1405);
});

test('RecipeScoringStrategy handles missing ingredients and coverage ratio', () => {
  const strategy = new RecipeScoringStrategy(mockGameData, 'APPLE_HONEY_SALAD');
  // Requires: 10 Apple, 10 Honey
  
  const context: TeamEvaluationContext = {
    team: { members: [] },
    metadata: { uniqueSpecies: 1, uniqueSkills: 1, uniqueBerries: 1, specialtyBreakdown: { berry: 1, ingredient: 0, skill: 0 } },
    teamEstimate: null,
    memberEstimates: [
      {
        pokemon: {} as OwnedPokemon,
        estimate: makeEstimate([], [{ name: 'Apple', amount: 25 }], mockConfig) // Apple Coverage: 2.5
      },
      {
        pokemon: {} as OwnedPokemon,
        estimate: makeEstimate([], [{ name: 'Honey', amount: 5 }], mockConfig) // Honey Coverage: 0.5
      }
    ]
  };

  const score = strategy.score(context);
  expect(score.objective).toBe('recipe');
  
  // Limitante es Honey con 0.5. 
  const details = score.recipeDetails!;
  expect(details.estimatedServings).toBe(0.5);
  expect(details.coveragePercent).toBe(50);
  expect(details.ingredientsMissing).toContain('Honey');
  expect(details.ingredientsMissing).not.toContain('Apple');
  
  // Score = 0.5 * recipe.value (1200) = 600
  expect(score.score).toBe(600);
});

test('RecipeScoringStrategy produces identical scores for identical metrics (deterministic)', () => {
  const strategy = new RecipeScoringStrategy(mockGameData, 'APPLE_JUICE');
  // Requires: 10 Apple. Value: 500
  
  const ctx: TeamEvaluationContext = {
    team: { members: [] },
    metadata: { uniqueSpecies: 1, uniqueSkills: 1, uniqueBerries: 1, specialtyBreakdown: { berry: 1, ingredient: 0, skill: 0 } },
    teamEstimate: null,
    memberEstimates: [
      {
        pokemon: {} as OwnedPokemon,
        estimate: makeEstimate([], [{ name: 'Apple', amount: 30 }], mockConfig) // Coverage: 3
      }
    ]
  };

  const score1 = strategy.score(ctx);
  const score2 = strategy.score(ctx);
  
  expect(score1).toEqual(score2);
  expect(score1.score).toBe(1500); // 3 * 500
});

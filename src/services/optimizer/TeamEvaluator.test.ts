import { expect, test } from 'vitest';
import { TeamEvaluator } from './TeamEvaluator';
import type { CalculationEngine } from '../../domain/services/interfaces';
import type { OwnedPokemon, ProductionEstimate, SimulationConfig, StaticDataSchema } from '../../domain/models';

const mockGameData: StaticDataSchema = {
  gameDataVersion: '1',
  species: [
    {
      name: 'BULBASAUR',
      pokedexNumber: 1,
      displayName: 'Bulbasaur',
      specialty: 'ingredient',
      berry: { name: 'DURIN', value: 30, type: 'grass' },
      carrySize: 11,
      frequency: 4400,
      ingredientPercentage: 25.7,
      skillPercentage: 1.9,
      previousEvolutions: 0,
      remainingEvolutions: 2,
      skill: { name: 'Ingredient Magnet S', description: '' },
      ingredient0: [], ingredient30: [], ingredient60: []
    },
    {
      name: 'PIKACHU',
      pokedexNumber: 25,
      displayName: 'Pikachu',
      specialty: 'berry',
      berry: { name: 'GREPA', value: 30, type: 'electric' },
      carrySize: 17,
      frequency: 2700,
      ingredientPercentage: 20.0,
      skillPercentage: 2.0,
      previousEvolutions: 1,
      remainingEvolutions: 1,
      skill: { name: 'Charge Strength S', description: '' },
      ingredient0: [], ingredient30: [], ingredient60: []
    }
  ],
  ingredients: [], berries: [], recipes: [], mainSkills: [], subSkills: [], natures: []
};

const makePokemon = (id: string, speciesId: string): OwnedPokemon => ({
  id,
  speciesId,
  level: 30,
  nickname: '',
  ribbonLevel: 0,
  natureId: 'Brave',
  subskills: { 10: null, 25: null, 50: null, 75: null, 100: null },
  ingredientChoices: { 1: null, 30: null, 60: null },
  skillLevel: 1,
  shiny: false,
  notes: '',
  sneakySnacking: false,
  helpingFrequencySeen: null,
  carryLimitSeen: null,
  source: 'manual',
  createdAt: 0,
  updatedAt: 0,
  gameDataVersion: '1'
});

const mockConfig: SimulationConfig = {
  camp: false,
  bedtime: '22:00',
  wakeup: '06:00',
  island: 'greengrass',
  areaBonus: 0
};

class MockEngine implements CalculationEngine {
  calls = 0;
  async estimateProduction(pokemon: OwnedPokemon, config: SimulationConfig): Promise<ProductionEstimate> {
    this.calls++;
    return {
      period: '24h',
      berries: [{ name: pokemon.speciesId === 'BULBASAUR' ? 'DURIN' : 'GREPA', amount: 10 }],
      ingredients: [{ name: 'Honey', amount: 5 }],
      skillProcs: 1,
      configUsed: config,
      calculatedAt: Date.now()
    };
  }
  async simulateTeam(team, config) { return Promise.all(team.map(p => this.estimateProduction(p, config))); }
  async validateTeam(): Promise<boolean> { return true; }
}

test('TeamEvaluator generates context correctly and maps metadata', async () => {
  const engine = new MockEngine();
  const evaluator = new TeamEvaluator(engine, mockGameData);
  
  const team = {
    members: [
      makePokemon('p1', 'BULBASAUR'),
      makePokemon('p2', 'BULBASAUR'),
      makePokemon('p3', 'PIKACHU')
    ]
  };

  const context = await evaluator.evaluate(team, mockConfig);
  
  // Evaluation
  expect(engine.calls).toBe(3);
  expect(context.memberEstimates.length).toBe(3);
  expect(context.memberEstimates[0].estimate.berries[0].name).toBe('DURIN');
  expect(context.memberEstimates[2].estimate.berries[0].name).toBe('GREPA');

  // Metadata checks (2 distinct species: BULBASAUR, PIKACHU)
  // Skills: Ingredient Magnet S, Charge Strength S (2)
  // Berries: DURIN, GREPA (2)
  // Specialty: 1 berry, 2 ingredient
  expect(context.metadata.uniqueSpecies).toBe(2);
  expect(context.metadata.uniqueSkills).toBe(2);
  expect(context.metadata.uniqueBerries).toBe(2);
  expect(context.metadata.specialtyBreakdown.berry).toBe(1);
  expect(context.metadata.specialtyBreakdown.ingredient).toBe(2);
  expect(context.metadata.specialtyBreakdown.skill).toBe(0);
});

test('evaluates a full team of 5 and maps metadata correctly', async () => {
  const engine = new MockEngine();
  const evaluator = new TeamEvaluator(engine, mockGameData);
  
  const team = {
    members: [
      makePokemon('p1', 'BULBASAUR'),
      makePokemon('p2', 'PIKACHU'),
      makePokemon('p3', 'PIKACHU'),
      makePokemon('p4', 'PIKACHU'),
      makePokemon('p5', 'BULBASAUR')
    ]
  };

  const context = await evaluator.evaluate(team, mockConfig);
  
  expect(engine.calls).toBe(5);
  expect(context.memberEstimates.length).toBe(5);

  // Metadata should still reflect 2 unique species despite 5 members
  expect(context.metadata.uniqueSpecies).toBe(2);
  expect(context.metadata.uniqueSkills).toBe(2);
  expect(context.metadata.uniqueBerries).toBe(2);
  expect(context.metadata.specialtyBreakdown.berry).toBe(3);
  expect(context.metadata.specialtyBreakdown.ingredient).toBe(2);
});

test('evaluator is deterministic and delegates caching to the engine', async () => {
  class CachingMockEngine extends MockEngine {
    private cache = new Map<string, ProductionEstimate>();
    override async estimateProduction(pokemon: OwnedPokemon, config: SimulationConfig): Promise<ProductionEstimate> {
      const key = `${pokemon.id}-${config.island}`;
      if (this.cache.has(key)) return this.cache.get(key)!;
      const res = await super.estimateProduction(pokemon, config);
      this.cache.set(key, res);
      return res;
    }
  }

  const engine = new CachingMockEngine();
  const evaluator = new TeamEvaluator(engine, mockGameData);
  
  const team = {
    members: [makePokemon('p1', 'BULBASAUR'), makePokemon('p2', 'BULBASAUR')] // same species, different ID
  };

  // Evaluate same team twice
  await evaluator.evaluate(team, mockConfig);
  const ctx2 = await evaluator.evaluate(team, mockConfig);

  // The engine was called exactly 2 times total (for p1 and p2) during the first evaluation.
  // The second evaluation hit the cache entirely.
  expect(engine.calls).toBe(2);
  
  expect(ctx2.memberEstimates.length).toBe(2);
  expect(ctx2.metadata.uniqueSpecies).toBe(1); // Only BULBASAUR
});

test('Evaluator calls engine mapped properly and is deterministic', async () => {
  const engine = new MockEngine();
  const evaluator = new TeamEvaluator(engine, mockGameData);
  
  const team = {
    members: [makePokemon('p1', 'BULBASAUR')]
  };

  const ctx1 = await evaluator.evaluate(team, mockConfig);
  const ctx2 = await evaluator.evaluate(team, mockConfig);

  // Evaluator itself doesn't cache, the engine is expected to cache if needed,
  // but it correctly maps exactly what the engine returns.
  expect(engine.calls).toBe(2); // Since mock engine doesn't cache
  expect(ctx1.memberEstimates[0].estimate.berries).toEqual(ctx2.memberEstimates[0].estimate.berries);
  expect(ctx1.metadata).toEqual(ctx2.metadata);
});

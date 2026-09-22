import { expect, test, vi, beforeEach } from 'vitest';
import { SleepApiEngine } from './sleepapi-engine';
import type { OwnedPokemon, SimulationConfig, StaticDataSchema } from '../../domain/models';

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
      ingredient0: [{ amount: 2, ingredient: { name: 'Honey', value: 100, taxedValue: 100 } }],
      ingredient30: [{ amount: 5, ingredient: { name: 'Honey', value: 100, taxedValue: 100 } }, { amount: 4, ingredient: { name: 'Tomato', value: 110, taxedValue: 110 } }],
      ingredient60: [{ amount: 7, ingredient: { name: 'Honey', value: 100, taxedValue: 100 } }, { amount: 7, ingredient: { name: 'Tomato', value: 110, taxedValue: 110 } }, { amount: 6, ingredient: { name: 'Potato', value: 120, taxedValue: 120 } }]
    }
  ],
  ingredients: [],
  berries: [],
  recipes: [],
  mainSkills: [],
  subSkills: [],
  natures: []
};

const mockPokemon: OwnedPokemon = {
  id: '1',
  speciesId: 'BULBASAUR',
  nickname: 'Bulby',
  level: 30,
  ribbonLevel: 0,
  natureId: 'Brave',
  subskills: {
    10: 'Helping Bonus',
    25: 'Helping Speed M',
    50: null,
    75: null,
    100: null
  },
  ingredientChoices: {
    30: 'Honey',
    60: 'Potato'
  },
  skillLevel: 1,
  shiny: false,
  notes: '',
  sneakySnacking: false,
  helpingFrequencySeen: null,
  carryLimitSeen: 14,
  source: 'manual',
  createdAt: 0,
  updatedAt: 0,
  gameDataVersion: '1'
};

const mockConfig: SimulationConfig = {
  camp: false,
  bedtime: '22:00',
  wakeup: '06:00'
};

beforeEach(() => {
  vi.restoreAllMocks();
});

test('estimates production and uses cache', async () => {
  const engine = new SleepApiEngine(mockGameData);
  
  const mockFetch = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({
    members: [{
      produceTotal: {
        berries: [{ amount: 10, berry: { name: 'DURIN' } }],
        ingredients: [{ amount: 20, ingredient: { name: 'Honey' } }]
      },
      skillProcs: 1.5
    }]
  })));

  // First call
  const result1 = await engine.estimateProduction(mockPokemon, mockConfig);
  expect(mockFetch).toHaveBeenCalledTimes(1);
  expect(result1.skillProcs).toBe(1.5);
  expect(result1.berries).toEqual([{ name: 'DURIN', amount: 10 }]);
  expect(result1.ingredients).toEqual([{ name: 'Honey', amount: 20 }]);

  // Second call with same parameters should hit cache
  const result2 = await engine.estimateProduction(mockPokemon, mockConfig);
  expect(mockFetch).toHaveBeenCalledTimes(1);
  expect(result2).toBe(result1); // Reference equality

  // Validate the request payload sent to SleepAPI
  const callPayload = JSON.parse((mockFetch.mock.calls[0][1] as RequestInit).body as string);
  
  expect(callPayload.settings.camp).toBe(false);
  expect(callPayload.members[0].pokemon).toBe('BULBASAUR');
  expect(callPayload.members[0].level).toBe(30);
  
  // Ingredients should only include level 1 and 30, because pokemon level is 30
  expect(callPayload.members[0].ingredients).toEqual([
    { level: 1, amount: 2, name: 'Honey' },
    { level: 30, amount: 5, name: 'Honey' }
  ]);

  // Subskills should only include level 10 and 25
  expect(callPayload.members[0].subskills).toEqual([
    { level: 10, subskill: 'Helping Bonus' },
    { level: 25, subskill: 'Helping Speed M' }
  ]);
});

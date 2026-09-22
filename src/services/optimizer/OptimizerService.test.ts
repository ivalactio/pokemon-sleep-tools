import { expect, test } from 'vitest';
import { OptimizerService } from './OptimizerService';
import type { OptimizerConfig } from '../../domain/optimizer/core';
import type { CalculationEngine } from '../../domain/services/interfaces';
import type { OwnedPokemon, ProductionEstimate, SimulationConfig, StaticDataSchema } from '../../domain/models';

const mockGameData: StaticDataSchema = {
  gameDataVersion: '1',
  species: [
    { name: 'MEWTWO', pokedexNumber: 150, displayName: 'Mewtwo', specialty: 'berry', berry: { name: 'BELUE', value: 30, type: 'psychic' }, carrySize: 10, frequency: 1000, ingredientPercentage: 10, skillPercentage: 1, previousEvolutions: 0, remainingEvolutions: 0, skill: { name: 'Psystrike', description: '' }, ingredient0: [], ingredient30: [], ingredient60: [] },
    { name: 'PIKACHU', pokedexNumber: 25, displayName: 'Pikachu', specialty: 'berry', berry: { name: 'GREPA', value: 25, type: 'electric' }, carrySize: 10, frequency: 1000, ingredientPercentage: 10, skillPercentage: 1, previousEvolutions: 0, remainingEvolutions: 0, skill: { name: 'Psystrike', description: '' }, ingredient0: [], ingredient30: [], ingredient60: [] },
    { name: 'BULBASAUR', pokedexNumber: 1, displayName: 'Bulbasaur', specialty: 'ingredient', berry: { name: 'DURIN', value: 20, type: 'grass' }, carrySize: 10, frequency: 1000, ingredientPercentage: 10, skillPercentage: 1, previousEvolutions: 0, remainingEvolutions: 0, skill: { name: 'Psystrike', description: '' }, ingredient0: [], ingredient30: [], ingredient60: [] },
    { name: 'CHARMANDER', pokedexNumber: 4, displayName: 'Charmander', specialty: 'ingredient', berry: { name: 'LEPPA', value: 20, type: 'fire' }, carrySize: 10, frequency: 1000, ingredientPercentage: 10, skillPercentage: 1, previousEvolutions: 0, remainingEvolutions: 0, skill: { name: 'Psystrike', description: '' }, ingredient0: [], ingredient30: [], ingredient60: [] },
    { name: 'SQUIRTLE', pokedexNumber: 7, displayName: 'Squirtle', specialty: 'ingredient', berry: { name: 'ORAN', value: 20, type: 'water' }, carrySize: 10, frequency: 1000, ingredientPercentage: 10, skillPercentage: 1, previousEvolutions: 0, remainingEvolutions: 0, skill: { name: 'Psystrike', description: '' }, ingredient0: [], ingredient30: [], ingredient60: [] }
  ],
  ingredients: [],
  berries: [
    { name: 'BELUE', value: 30, type: 'psychic' },
    { name: 'GREPA', value: 25, type: 'electric' },
    { name: 'DURIN', value: 20, type: 'grass' },
    { name: 'LEPPA', value: 20, type: 'fire' },
    { name: 'ORAN', value: 20, type: 'water' }
  ],
  recipes: [], mainSkills: [], subSkills: [], natures: []
};

const makePokemon = (id: string, speciesId: string, level: number = 30): OwnedPokemon => ({
  id, speciesId, level, nickname: '', ribbonLevel: 0, natureId: 'Brave',
  subskills: { 10: null, 25: null, 50: null, 75: null, 100: null },
  ingredientChoices: { 1: null, 30: null, 60: null }, skillLevel: 1, shiny: false, notes: '',
  sneakySnacking: false, helpingFrequencySeen: null, carryLimitSeen: null, source: 'manual',
  createdAt: 0, updatedAt: 0, gameDataVersion: '1'
});

const collection = [
  makePokemon('m1', 'MEWTWO', 50),
  makePokemon('m2', 'MEWTWO', 40),
  makePokemon('m3', 'MEWTWO', 30),
  makePokemon('p1', 'PIKACHU', 50),
  makePokemon('p2', 'PIKACHU', 40),
  makePokemon('b1', 'BULBASAUR', 50),
  makePokemon('c1', 'CHARMANDER', 50),
  makePokemon('s1', 'SQUIRTLE', 50)
]; // 8 pokemon, 5 distinct species

class MockEngine implements CalculationEngine {
  async estimateProduction(pokemon: OwnedPokemon, config: SimulationConfig): Promise<ProductionEstimate> {
    const berryName = mockGameData.species.find(s => s.name === pokemon.speciesId)!.berry.name;
    // To make them rank differently, we will produce more berries if level is higher
    return {
      period: '24h',
      berries: [{ name: berryName, amount: pokemon.level }],
      ingredients: [], skillProcs: 1, configUsed: config, calculatedAt: 0
    };
  }
  async simulateTeam(team, config) { return Promise.all(team.map(p => this.estimateProduction(p, config))); }
  async validateTeam(): Promise<boolean> { return true; }
}

const mockConfig = (): OptimizerConfig => ({
  simulation: { camp: false, bedtime: '22:00', wakeup: '06:00', island: 'cyan', areaBonus: 0 },
  constraints: { uniqueSpecies: false, requiredPokemonIds: [], excludedPokemonIds: [] },
  recipeType: 'curry',
  objectives: ['berries'],
  maxResults: 3
});

test('OptimizerService completes a full run and returns topN', async () => {
  const service = new OptimizerService(mockGameData, new MockEngine());
  const config = mockConfig();
  
  const results = await service.optimize(collection, config);
  
  // Total teams from 8 C 5 = 56
  // It returns top 3
  expect(results.length).toBe(3);
  
  // Best team should be the one with highest levels: m1(50), p1(50), b1(50), c1(50), s1(50) = 250 level sum.
  // Actually, we also have m2(40) and p2(40).
  // The berry values are: BELUE(30), GREPA(25), DURIN(20), LEPPA(20), ORAN(20)
  // Highest value combo will naturally be m1(50*30=1500), m2(40*30=1200), m3(30*30=900), p1(50*25=1250), p2(40*25=1000) -> 5850 score.
  
  // Let's just ensure it's sorted descending
  expect(results[0].score.score).toBeGreaterThanOrEqual(results[1].score.score);
  expect(results[1].score.score).toBeGreaterThanOrEqual(results[2].score.score);
});

test('OptimizerService reports progress and finishes exactly at 100%', async () => {
  const service = new OptimizerService(mockGameData, new MockEngine());
  const config = mockConfig();
  
  const progresses: number[] = [];
  await service.optimize(collection, config, (p) => progresses.push(p.percentage));
  
  // It should at least report the final 100% since C(8,5) = 56 is < CHUNK_SIZE(1000)
  expect(progresses[progresses.length - 1]).toBe(100);
});

test('OptimizerService throws on invalid config (overlapping required/excluded)', async () => {
  const service = new OptimizerService(mockGameData, new MockEngine());
  const config = mockConfig();
  config.constraints.requiredPokemonIds = ['m1'];
  config.constraints.excludedPokemonIds = ['m1'];

  await expect(service.optimize(collection, config)).rejects.toThrow(/requerido y excluido a la vez/);
});

test('OptimizerService throws if greengrass and no favorite berries', async () => {
  const service = new OptimizerService(mockGameData, new MockEngine());
  const config = mockConfig();
  config.simulation.island = 'greengrass';
  config.simulation.favoriteBerries = [];

  await expect(service.optimize(collection, config)).rejects.toThrow(/Debes configurar las bayas favoritas/);
});

test('OptimizerService applies uniqueSpecies constraints effectively', async () => {
  const service = new OptimizerService(mockGameData, new MockEngine());
  const config = mockConfig();
  config.constraints.uniqueSpecies = true;

  const results = await service.optimize(collection, config);
  // C(5 species, 5) = 1 combination base. But we have multiple Mewtwo and Pikachu.
  // Mewtwos: 3, Pikachus: 2, others: 1 each.
  // 3 * 2 * 1 * 1 * 1 = 6 possible valid teams.
  // We asked for maxResults = 3.
  expect(results.length).toBe(3);
  
  // They must all have 5 distinct species
  for (const res of results) {
    const species = new Set(res.evaluation.team.members.map(m => m.speciesId));
    expect(species.size).toBe(5);
  }
});

test('OptimizerService handles abort signal', async () => {
  const service = new OptimizerService(mockGameData, new MockEngine());
  const config = mockConfig();
  
  const controller = new AbortController();
  controller.abort(); // Abort immediately

  await expect(service.optimize(collection, config, undefined, controller.signal)).rejects.toThrow(/Cancelado/);
});

test('OptimizerService throws if not enough valid teams', async () => {
  const service = new OptimizerService(mockGameData, new MockEngine());
  const config = mockConfig();
  config.constraints.excludedPokemonIds = collection.map(c => c.id); // Exclude all

  await expect(service.optimize(collection, config)).rejects.toThrow(/No existen suficientes combinaciones válidas/);
});

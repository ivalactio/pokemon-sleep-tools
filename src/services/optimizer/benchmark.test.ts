import { OptimizerService } from './OptimizerService';
import type { OwnedPokemon, ProductionEstimate, SimulationConfig, StaticDataSchema } from '../../domain/models';
import type { OptimizerConfig } from '../../domain/optimizer/core';

// Minimal mock game data
const mockGameData: StaticDataSchema = {
  gameDataVersion: '1',
  species: [
    { name: 'PIKACHU', pokedexNumber: 25, displayName: 'Pikachu', specialty: 'berry', berry: { name: 'GREPA', value: 25, type: 'electric' }, carrySize: 10, frequency: 1000, ingredientPercentage: 10, skillPercentage: 1, previousEvolutions: 0, remainingEvolutions: 0, skill: { name: 'Psystrike', description: '' }, ingredient0: [], ingredient30: [], ingredient60: [] },
    { name: 'BULBASAUR', pokedexNumber: 1, displayName: 'Bulbasaur', specialty: 'ingredient', berry: { name: 'DURIN', value: 20, type: 'grass' }, carrySize: 10, frequency: 1000, ingredientPercentage: 10, skillPercentage: 1, previousEvolutions: 0, remainingEvolutions: 0, skill: { name: 'Psystrike', description: '' }, ingredient0: [], ingredient30: [], ingredient60: [] },
    { name: 'CHARMANDER', pokedexNumber: 4, displayName: 'Charmander', specialty: 'ingredient', berry: { name: 'LEPPA', value: 20, type: 'fire' }, carrySize: 10, frequency: 1000, ingredientPercentage: 10, skillPercentage: 1, previousEvolutions: 0, remainingEvolutions: 0, skill: { name: 'Psystrike', description: '' }, ingredient0: [], ingredient30: [], ingredient60: [] },
    { name: 'SQUIRTLE', pokedexNumber: 7, displayName: 'Squirtle', specialty: 'ingredient', berry: { name: 'ORAN', value: 20, type: 'water' }, carrySize: 10, frequency: 1000, ingredientPercentage: 10, skillPercentage: 1, previousEvolutions: 0, remainingEvolutions: 0, skill: { name: 'Psystrike', description: '' }, ingredient0: [], ingredient30: [], ingredient60: [] },
    { name: 'CHIKORITA', pokedexNumber: 152, displayName: 'Chikorita', specialty: 'berry', berry: { name: 'DURIN', value: 20, type: 'grass' }, carrySize: 10, frequency: 1000, ingredientPercentage: 10, skillPercentage: 1, previousEvolutions: 0, remainingEvolutions: 0, skill: { name: 'Psystrike', description: '' }, ingredient0: [], ingredient30: [], ingredient60: [] }
  ],
  ingredients: [],
  berries: [
    { name: 'GREPA', value: 25, type: 'electric' },
    { name: 'DURIN', value: 20, type: 'grass' },
    { name: 'LEPPA', value: 20, type: 'fire' },
    { name: 'ORAN', value: 20, type: 'water' }
  ],
  recipes: [], mainSkills: [], subSkills: [], natures: []
};

// Generate 39 pokemon
const collection: OwnedPokemon[] = [];
const species = ['PIKACHU', 'BULBASAUR', 'CHARMANDER', 'SQUIRTLE', 'CHIKORITA'];
for (let i = 0; i < 39; i++) {
  collection.push({
    id: `poke_${i}`,
    speciesId: species[i % species.length],
    level: Math.floor(Math.random() * 50) + 1,
    nickname: '', ribbonLevel: 0, natureId: 'Brave',
    subskills: { 10: null, 25: null, 50: null, 75: null, 100: null },
    ingredientChoices: { 1: null, 30: null, 60: null }, skillLevel: 1, shiny: false, notes: '',
    sneakySnacking: false, helpingFrequencySeen: null, carryLimitSeen: null, source: 'manual',
    createdAt: 0, updatedAt: 0, gameDataVersion: '1'
  });
}

const mockConfig: OptimizerConfig = {
  simulation: { camp: false, bedtime: '22:00', wakeup: '06:00', island: 'cyan', areaBonus: 0 },
  constraints: { uniqueSpecies: false, requiredPokemonIds: [], excludedPokemonIds: [] },
  recipeType: 'curry',
  objectives: ['berries'],
  maxResults: 10
};

// Mock engine that simulates 1000ms delay internally if it didn't cache, but since it's just raw computation we'll do minimal sync work
class FastEngine {
  async estimateProduction(pokemon: OwnedPokemon, config: SimulationConfig): Promise<ProductionEstimate> {
    const berryName = mockGameData.species.find(s => s.name === pokemon.speciesId)!.berry.name;
    return {
      period: '24h',
      berries: [{ name: berryName, amount: pokemon.level * 10 }],
      ingredients: [], skillProcs: 1, configUsed: config, calculatedAt: Date.now()
    };
  }
  async simulateTeam() { return null; }
  async validateTeam() { return true; }
}

import { test } from 'vitest';

test('Benchmark 39 pokemon optimization', async () => {
  console.log(`Starting benchmark with ${collection.length} Pokémon...`);
  const service = new OptimizerService(mockGameData, new FastEngine());
  
  const start = performance.now();
  
  const results = await service.optimize(collection, mockConfig, (p) => {
    if (p.processedTeams % 50000 === 0) {
      console.log(`Progress: ${p.percentage.toFixed(2)}% (${p.processedTeams}/${p.totalTeams})`);
    }
  });
  
  const end = performance.now();
  
  console.log(`\nBenchmark finished in ${((end - start) / 1000).toFixed(2)} seconds`);
  console.log(`Top Team Score: ${results[0]?.score.score}`);
}, 60000); // 60s timeout

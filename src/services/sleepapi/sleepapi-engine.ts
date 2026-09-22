import type { CalculationEngine } from '../../domain/services/interfaces';
import type { OwnedPokemon, ProductionEstimate, SimulationConfig, StaticDataSchema } from '../../domain/models';

export class SleepApiEngine implements CalculationEngine {
  private cache = new Map<string, ProductionEstimate>();
  private readonly baseUrl = 'https://api.sleepapi.net/api';
  private gameData: StaticDataSchema;

  constructor(gameData: StaticDataSchema) {
    this.gameData = gameData;
  }

  async estimateProduction(pokemon: OwnedPokemon, config: SimulationConfig): Promise<ProductionEstimate> {
    const cacheKey = this.generateCacheKey(pokemon, config);
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey)!;
    }

    const payload = this.buildCalculateTeamRequest(pokemon, config);

    try {
      const response = await fetch(`${this.baseUrl}/calculator/team`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`SleepAPI request failed with status ${response.status}: ${errorText}`);
      }

      const data = await response.json();
      const estimate = this.mapToProductionEstimate(data, config);
      
      this.cache.set(cacheKey, estimate);
      return estimate;
    } catch (error) {
      console.error('Error estimating production via SleepAPI:', error);
      throw error;
    }
  }

  simulateTeam(): Promise<unknown> {
    throw new Error('simulateTeam not implemented');
  }

  validateTeam(): Promise<boolean> {
    throw new Error('validateTeam not implemented');
  }

  private generateCacheKey(pokemon: OwnedPokemon, config: SimulationConfig): string {
    return JSON.stringify({
      p: {
        id: pokemon.id,
        level: pokemon.level,
        ribbonLevel: pokemon.ribbonLevel,
        natureId: pokemon.natureId,
        subskills: pokemon.subskills,
        ingredientChoices: pokemon.ingredientChoices,
        skillLevel: pokemon.skillLevel,
        carryLimitSeen: pokemon.carryLimitSeen
      },
      c: config
    });
  }

  private buildCalculateTeamRequest(pokemon: OwnedPokemon, config: SimulationConfig) {
    const species = this.gameData.species.find(s => s.name === pokemon.speciesId);
    if (!species) {
      throw new Error(`Species ${pokemon.speciesId} not found in game data`);
    }

    const ingredients: { level: number; amount: number; name: string }[] = [];
    if (species.ingredient0 && species.ingredient0[0]) {
      ingredients.push({
        level: 1,
        amount: species.ingredient0[0].amount,
        name: species.ingredient0[0].ingredient.name
      });
    }

    if (pokemon.level >= 30 && pokemon.ingredientChoices[30]) {
      const choice = species.ingredient30.find(i => i.ingredient.name === pokemon.ingredientChoices[30]);
      if (choice) {
        ingredients.push({
          level: 30,
          amount: choice.amount,
          name: choice.ingredient.name
        });
      }
    }

    if (pokemon.level >= 60 && pokemon.ingredientChoices[60]) {
      const choice = species.ingredient60.find(i => i.ingredient.name === pokemon.ingredientChoices[60]);
      if (choice) {
        ingredients.push({
          level: 60,
          amount: choice.amount,
          name: choice.ingredient.name
        });
      }
    }

    const subskills: { level: number; subskill: string }[] = [];
    for (const [lvlStr, subskillName] of Object.entries(pokemon.subskills)) {
      const lvl = Number(lvlStr);
      if (subskillName && pokemon.level >= lvl) {
        subskills.push({ level: lvl, subskill: subskillName });
      }
    }

    return {
      settings: {
        camp: config.camp,
        bedtime: config.bedtime,
        wakeup: config.wakeup,
        island: {
          name: "Greengrass Isle",
          shortName: "greengrass",
          areaBonus: 0,
          berries: []
        }
      },
      members: [
        {
          pokemon: pokemon.speciesId,
          level: pokemon.level,
          ribbon: pokemon.ribbonLevel,
          carrySize: pokemon.carryLimitSeen || 0, // Sending total carry limit if available
          skillLevel: pokemon.skillLevel,
          nature: pokemon.natureId,
          subskills: subskills,
          ingredients: ingredients,
          sneakySnacking: false,
          externalId: pokemon.id
        }
      ]
    };
  }

  private mapToProductionEstimate(response: unknown, config: SimulationConfig): ProductionEstimate {
    const res = response as { members?: { produceTotal?: { berries: { berry: { name: string }, amount: number }[], ingredients: { ingredient: { name: string }, amount: number }[] }, skillProcs?: number }[] };
    const member = res.members?.[0];
    if (!member) {
      throw new Error('SleepAPI response did not contain member production data');
    }

    const produceTotal = member.produceTotal || { berries: [], ingredients: [] };
    
    return {
      period: "24 horas",
      berries: produceTotal.berries.map(b => ({
        name: b.berry.name,
        amount: b.amount
      })),
      ingredients: produceTotal.ingredients.map(i => ({
        name: i.ingredient.name,
        amount: i.amount
      })),
      skillProcs: member.skillProcs || 0,
      configUsed: config,
      calculatedAt: Date.now()
    };
  }
}

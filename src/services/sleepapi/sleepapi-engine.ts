import type { CalculationEngine } from '../../domain/services/interfaces';
import type { OwnedPokemon, ProductionEstimate, SimulationConfig, StaticDataSchema } from '../../domain/models';
import { getIsland } from '../../domain/optimizer/islands';

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
    const canonicalSpeciesId = pokemon.speciesId.toUpperCase();
    const species = this.gameData.species.find(s => s.name === canonicalSpeciesId);
    if (!species) {
      throw new Error(`Especie '${pokemon.speciesId}' no encontrada en los datos del juego.`);
    }

    if (!pokemon.natureId) {
      throw new Error('La naturaleza es obligatoria para calcular la producción.');
    }

    // Normalize natureId to match title case in gamedata.json (e.g. 'brave' -> 'Brave')
    const canonicalNatureId = pokemon.natureId.charAt(0).toUpperCase() + pokemon.natureId.slice(1).toLowerCase();
    const natureExists = this.gameData.natures.some(n => n.name === canonicalNatureId);
    if (!natureExists) {
      throw new Error(`La naturaleza '${pokemon.natureId}' no es válida.`);
    }

    const ingredients: { level: number; amount: number; name: string }[] = [];

    if (!pokemon.ingredientChoices[1]) {
      throw new Error(`Ingrediente de nivel 1 es requerido.`);
    }
    const choice1 = species.ingredient0.find(i => i.ingredient.name === pokemon.ingredientChoices[1]);
    if (choice1) {
      ingredients.push({ level: 1, amount: choice1.amount, name: choice1.ingredient.name });
    } else {
      throw new Error(`Ingrediente de nivel 1 '${pokemon.ingredientChoices[1]}' no es válido para la especie.`);
    }

    if (pokemon.level >= 30) {
      if (!pokemon.ingredientChoices[30]) {
        throw new Error(`Ingrediente de nivel 30 es requerido para Pokémon de nivel >= 30.`);
      }
      const choice = species.ingredient30.find(i => i.ingredient.name === pokemon.ingredientChoices[30]);
      if (choice) {
        ingredients.push({ level: 30, amount: choice.amount, name: choice.ingredient.name });
      }
    }

    if (pokemon.level >= 60) {
      if (!pokemon.ingredientChoices[60]) {
        throw new Error(`Ingrediente de nivel 60 es requerido para Pokémon de nivel >= 60.`);
      }
      const choice = species.ingredient60.find(i => i.ingredient.name === pokemon.ingredientChoices[60]);
      if (choice) {
        ingredients.push({ level: 60, amount: choice.amount, name: choice.ingredient.name });
      }
    }

    const subskills: { level: number; subskill: string }[] = [];
    const seenSubskills = new Set<string>();
    for (const [lvlStr, subskillName] of Object.entries(pokemon.subskills)) {
      const lvl = Number(lvlStr);
      if (subskillName && pokemon.level >= lvl) {
        if (seenSubskills.has(subskillName)) {
           throw new Error(`Subskill duplicada: '${subskillName}'. Un Pokémon no puede tener la misma subskill varias veces.`);
        }
        if (!this.gameData.subSkills.some(sk => sk.name === subskillName)) {
           throw new Error(`Subskill '${subskillName}' no es válida.`);
        }
        seenSubskills.add(subskillName);
        subskills.push({ level: lvl, subskill: subskillName });
      }
    }

    const islandCfg = getIsland(config.island);
    const resolvedBerries = config.favoriteBerries ?? islandCfg.defaultFavoriteBerries;

    return {
      settings: {
        camp: config.camp,
        bedtime: config.bedtime,
        wakeup: config.wakeup,
        island: { 
          name: islandCfg.name, 
          shortName: islandCfg.shortName, 
          areaBonus: config.areaBonus ?? 0, 
          berries: resolvedBerries 
        }
      },
      members: [
        {
          pokemon: canonicalSpeciesId,
          level: pokemon.level,
          ribbon: pokemon.ribbonLevel,
          carrySize: 0, // Ignored by SleepAPI backend
          skillLevel: pokemon.skillLevel,
          nature: canonicalNatureId,
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

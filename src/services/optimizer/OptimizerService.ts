import { CandidateFilter } from './CandidateFilter';
import { TeamGenerator } from './TeamGenerator';
import { TeamEvaluator } from './TeamEvaluator';
import { BerryScoringStrategy, IngredientScoringStrategy, RecipeScoringStrategy } from './ScoringStrategies';
import type { OptimizerConfig, TeamResult, OptimizerObjective } from '../../domain/optimizer/core';
import type { OwnedPokemon, StaticDataSchema } from '../../domain/models';
import type { CalculationEngine } from '../../domain/services/interfaces';
import { getIsland } from '../../domain/optimizer/islands';

export interface OptimizerProgress {
  processedTeams: number;
  totalTeams: number;
  percentage: number;
}

export class OptimizerService {
  private gameData: StaticDataSchema;
  private engine: CalculationEngine;

  constructor(gameData: StaticDataSchema, engine: CalculationEngine) {
    this.gameData = gameData;
    this.engine = engine;
  }

  async optimize(
    collection: OwnedPokemon[],
    config: OptimizerConfig,
    onProgress?: (progress: OptimizerProgress) => void,
    signal?: AbortSignal
  ): Promise<TeamResult[]> {
    if (!this.validateConfig(collection, config)) {
      return [];
    }

    const filter = new CandidateFilter();
    const candidates = filter.filter(collection, config.constraints);

    const required = candidates.filter(c => config.constraints.requiredPokemonIds.includes(c.id));
    
    // Verificar que todos los requeridos sobrevivieron al filtro (o existían)
    for (const reqId of config.constraints.requiredPokemonIds) {
      if (!required.find(r => r.id === reqId)) {
        throw new Error(`Pokémon obligatorio con ID ${reqId} no cumple los filtros (minLevel) o no existe.`);
      }
    }

    if (config.constraints.uniqueSpecies) {
      const distinctSpecies = new Set(candidates.map(c => c.speciesId));
      if (distinctSpecies.size < 5) {
        throw new Error('No hay 5 especies distintas disponibles tras aplicar los filtros.');
      }
    }

    const generator = new TeamGenerator();
    const totalTeams = generator.countTeams(candidates, required, config.constraints);

    if (totalTeams === 0) {
      throw new Error('No existen suficientes combinaciones válidas de Pokémon con estas restricciones.');
    }

    const evaluator = new TeamEvaluator(this.engine, this.gameData);
    
    const primaryObjective = config.objectives[0];
    if (!primaryObjective) {
      throw new Error('Se requiere al menos un objetivo de optimización.');
    }
    const strategy = this.getStrategy(primaryObjective, config);

    const topN: TeamResult[] = [];
    let processedTeams = 0;

    // Precalentamos la caché del motor. 
    // Pedimos al CalculationEngine evaluar individualmente a todos los candidatos.
    // Esto asegura que durante la evaluación de equipos (TeamEvaluator),
    // el Promise.all de los 5 miembros resuelva inmediatamente leyendo de la caché.
    await Promise.all(
      candidates.map(p => this.engine.estimateProduction(p, config.simulation))
    );

    const CHUNK_SIZE = 1000;
    
    for (const team of generator.generateTeams(candidates, required, config.constraints)) {
      if (signal?.aborted) {
        throw new Error('Cancelado por el usuario');
      }

      const ctx = await evaluator.evaluate(team, config.simulation);
      const score = strategy.score(ctx);
      
      const result: TeamResult = { evaluation: ctx, score };
      
      this.insertSorted(topN, result, config.maxResults || 10);
      processedTeams++;

      if (processedTeams % CHUNK_SIZE === 0) {
        onProgress?.({
          processedTeams,
          totalTeams,
          percentage: (processedTeams / totalTeams) * 100
        });
        // Ceder el control al hilo principal (Event Loop) para evitar congelar la UI
        await new Promise(r => setTimeout(r, 0));
      }
    }

    onProgress?.({ processedTeams, totalTeams, percentage: 100 });
    return topN;
  }

  private validateConfig(collection: OwnedPokemon[], config: OptimizerConfig): boolean {
    if (config.constraints.requiredPokemonIds.length > 5) {
      throw new Error('No puedes requerir más de 5 Pokémon.');
    }
    
    const reqSet = new Set(config.constraints.requiredPokemonIds);
    const excSet = new Set(config.constraints.excludedPokemonIds);
    for (const req of reqSet) {
      if (excSet.has(req)) {
        return false;
      }
    }
    
    const island = getIsland(config.simulation.island);
    if (island.id === 'greengrass') {
      const favs = config.simulation.favoriteBerries;
      if (!favs || favs.length === 0) {
        throw new Error('Debes configurar las bayas favoritas para Isla Verdegal (Greengrass Isle).');
      }
    }
    
    if (config.constraints.uniqueSpecies) {
      const requiredSpecies = new Set(
        collection.filter(p => reqSet.has(p.id)).map(p => p.speciesId)
      );
      if (requiredSpecies.size < reqSet.size) {
        throw new Error('Hay Pokémon requeridos con la misma especie, pero la restricción uniqueSpecies está activada.');
      }
    }

    return true;
  }

  private getStrategy(objective: OptimizerObjective, config: OptimizerConfig) {
    switch (objective) {
      case 'berries': return new BerryScoringStrategy(this.gameData);
      case 'ingredients': return new IngredientScoringStrategy(this.gameData);
      case 'recipe': 
        if (!config.recipeType) throw new Error('Se requiere recipeType para el objetivo de receta.');
        return new RecipeScoringStrategy(this.gameData, config.recipeType, config.targetRecipeId);
      default:
        throw new Error(`Objetivo ${objective} no implementado todavía.`);
    }
  }

  private insertSorted(topN: TeamResult[], result: TeamResult, max: number) {
    let low = 0;
    let high = topN.length;
    while (low < high) {
      const mid = (low + high) >>> 1;
      // Orden descendente por score
      if (topN[mid].score.score < result.score.score) {
        high = mid;
      } else {
        low = mid + 1;
      }
    }
    topN.splice(low, 0, result);
    if (topN.length > max) {
      topN.pop();
    }
  }
}

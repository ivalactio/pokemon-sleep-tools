import type { CalculationEngine } from '../../domain/services/interfaces';
import type { SimulationConfig, StaticDataSchema } from '../../domain/models';
import type { Team, TeamEvaluationContext, TeamMetadata } from '../../domain/optimizer/core';

export class TeamEvaluator {
  private engine: CalculationEngine;
  private gameData: StaticDataSchema;

  constructor(
    engine: CalculationEngine,
    gameData: StaticDataSchema
  ) {
    this.engine = engine;
    this.gameData = gameData;
  }

  async evaluate(team: Team, config: SimulationConfig): Promise<TeamEvaluationContext> {
    // Para aprovechar la caché eficientemente (y evitar esperas secuenciales excesivas),
    // resolvemos la producción de todos los miembros en paralelo.
    // El engine (ej. SleepApiEngine) manejará la caché interna.
    const memberEstimates = await Promise.all(
      team.members.map(async pokemon => {
        const estimate = await this.engine.estimateProduction(pokemon, config);
        return { pokemon, estimate };
      })
    );

    const metadata = this.calculateMetadata(team);

    return {
      team,
      memberEstimates,
      teamEstimate: null, // Placeholder para simulación de equipo completa (v2/Neroli's Lab)
      metadata
    };
  }

  private calculateMetadata(team: Team): TeamMetadata {
    const speciesIds = new Set<string>();
    const skills = new Set<string>();
    const berries = new Set<string>();
    const specialtyBreakdown = { berry: 0, ingredient: 0, skill: 0 };

    for (const member of team.members) {
      // member.speciesId usa el ID canónico (ej. "BULBASAUR")
      speciesIds.add(member.speciesId);
      
      const speciesData = this.gameData.species.find(s => s.name === member.speciesId);
      if (speciesData) {
        skills.add(speciesData.skill.name);
        berries.add(speciesData.berry.name);
        specialtyBreakdown[speciesData.specialty]++;
      }
    }

    return {
      uniqueSpecies: speciesIds.size,
      uniqueSkills: skills.size,
      uniqueBerries: berries.size,
      specialtyBreakdown
    };
  }
}

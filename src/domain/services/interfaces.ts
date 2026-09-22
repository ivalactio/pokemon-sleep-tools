import type { OwnedPokemon, ProductionEstimate, SimulationConfig } from '../models';

export interface CalculationEngine {
  estimateProduction(pokemon: OwnedPokemon, config: SimulationConfig): Promise<ProductionEstimate>;
  simulateTeam(team: OwnedPokemon[], config: SimulationConfig): Promise<unknown>;
  validateTeam(team: OwnedPokemon[]): Promise<boolean>;
}

export interface VisionProvider {
  analyzeScreenshot(imageBlob: Blob): Promise<Partial<OwnedPokemon>>;
}

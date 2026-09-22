import type { OwnedPokemon, ProductionEstimate, SimulationConfig } from '../models';
import type { PokemonExtractionResult } from '../vision/models';

export interface CalculationEngine {
  estimateProduction(pokemon: OwnedPokemon, config: SimulationConfig): Promise<ProductionEstimate>;
  simulateTeam(team: OwnedPokemon[], config: SimulationConfig): Promise<ProductionEstimate[]>;
  validateTeam(team: OwnedPokemon[]): Promise<boolean>;
}

export interface VisionProvider {
  extractPokemonFromImage(image: Blob | File): Promise<PokemonExtractionResult>;
}

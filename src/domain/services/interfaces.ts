import type { OwnedPokemon } from '../models';

export interface CalculationEngine {
  estimateProduction(pokemon: OwnedPokemon, durationHours: number): Promise<unknown>;
  simulateTeam(team: OwnedPokemon[], durationHours: number): Promise<unknown>;
  validateTeam(team: OwnedPokemon[]): Promise<boolean>;
}

export interface VisionProvider {
  analyzeScreenshot(imageBlob: Blob): Promise<Partial<OwnedPokemon>>;
}

import type { OwnedPokemon } from '../../domain/models';
import type { TeamConstraints } from '../../domain/optimizer/core';

export class CandidateFilter {
  filter(collection: OwnedPokemon[], constraints: TeamConstraints): OwnedPokemon[] {
    return collection.filter(pokemon => {
      // 1. Descartar si está explícitamente excluido
      if (constraints.excludedPokemonIds.includes(pokemon.id)) {
        return false;
      }
      
      // 2. Comprobar minLevel (aplica a todos los Pokémon, incluidos los required)
      if (constraints.minLevel !== undefined && pokemon.level < constraints.minLevel) {
        return false;
      }
      
      return true;
    });
  }
}

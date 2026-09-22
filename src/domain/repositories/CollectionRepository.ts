import type { OwnedPokemon } from '../../domain/models';

export interface CollectionRepository {
  getAll(): Promise<OwnedPokemon[]>;
  getById(id: string): Promise<OwnedPokemon | undefined>;
  add(pokemon: OwnedPokemon): Promise<void>;
  update(pokemon: OwnedPokemon): Promise<void>;
  delete(id: string): Promise<void>;
  import(pokemonList: OwnedPokemon[]): Promise<void>;
  clearAll(): Promise<void>;
}

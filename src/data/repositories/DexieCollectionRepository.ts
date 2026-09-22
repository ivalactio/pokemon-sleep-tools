import { db } from '../db';
import type { CollectionRepository } from '../../domain/repositories/CollectionRepository';
import type { OwnedPokemon } from '../../domain/models';

export class DexieCollectionRepository implements CollectionRepository {
  async getAll(): Promise<OwnedPokemon[]> {
    return await db.ownedPokemon.toArray();
  }

  async getById(id: string): Promise<OwnedPokemon | undefined> {
    return await db.ownedPokemon.get(id);
  }

  async add(pokemon: OwnedPokemon): Promise<void> {
    await db.ownedPokemon.add(pokemon);
  }

  async update(pokemon: OwnedPokemon): Promise<void> {
    await db.ownedPokemon.put(pokemon);
  }

  async delete(id: string): Promise<void> {
    await db.ownedPokemon.delete(id);
  }

  async import(pokemonList: OwnedPokemon[]): Promise<void> {
    // Basic import, overwriting duplicates or just adding them
    await db.ownedPokemon.bulkPut(pokemonList);
  }

  async clearAll(): Promise<void> {
    await db.ownedPokemon.clear();
  }
}

export const collectionRepository = new DexieCollectionRepository();

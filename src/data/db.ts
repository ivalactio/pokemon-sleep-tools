import Dexie, { type EntityTable } from 'dexie';
import type { OwnedPokemon } from '../domain/models';

export const db = new Dexie('PokeSleepOptimizerDB') as Dexie & {
  ownedPokemon: EntityTable<OwnedPokemon, 'id'>;
};

// Define the schema
db.version(1).stores({
  ownedPokemon: 'id, speciesId, specialty, level, createdAt, updatedAt' // Indexes
});

import Dexie, { type EntityTable } from 'dexie';
import type { OwnedPokemon } from '../domain/models';
import type { SavedQuery, SavedTeam, WeeklyPlan } from '../domain/persistence';

export const db = new Dexie('PokeSleepOptimizerDB') as Dexie & {
  ownedPokemon: EntityTable<OwnedPokemon, 'id'>;
  savedQueries: EntityTable<SavedQuery, 'id'>;
  savedTeams: EntityTable<SavedTeam, 'id'>;
  weeklyPlans: EntityTable<WeeklyPlan, 'id'>;
};

db.version(1).stores({
  ownedPokemon: 'id, speciesId, specialty, level, createdAt, updatedAt'
});

db.version(2).stores({
  savedQueries: 'id, createdAt',
  savedTeams: 'id, createdAt'
});

db.version(3).stores({
  weeklyPlans: 'id, createdAt, weekStart'
}).upgrade(() => {
  // Add weeklyPlans
});

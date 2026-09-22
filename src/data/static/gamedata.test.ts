import { expect, test } from 'vitest';
import gamedata from './gamedata.json';

test('gamedata.species objects use name as their canonical uppercase identifier', () => {
  // Ensure that every species has a name field and it's uppercase (canonical)
  expect(gamedata.species.length).toBeGreaterThan(0);
  
  for (const species of gamedata.species) {
    expect(species.name).toBeDefined();
    expect(typeof species.name).toBe('string');
    // We expect the 'name' field to be the uppercase canonical identifier
    expect(species.name).toBe(species.name.toUpperCase());
    // Ensure there's no leading/trailing spaces
    expect(species.name.trim()).toBe(species.name);
  }

  // Find a specific known species to confirm its name field matches our usage of speciesId
  const pikachu = gamedata.species.find(s => s.name === 'PIKACHU');
  expect(pikachu).toBeDefined();
  expect(pikachu?.displayName).toBe('Pikachu');
});

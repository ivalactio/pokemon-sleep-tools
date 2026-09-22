import { describe, it, expect, beforeEach } from 'vitest';
import { collectionRepository } from './DexieCollectionRepository';
import type { OwnedPokemon } from '../../domain/models';

describe('DexieCollectionRepository', () => {
  beforeEach(async () => {
    await collectionRepository.clearAll();
  });

  it('should add and retrieve a pokemon', async () => {
    const pokemon: OwnedPokemon = {
      id: 'test-1',
      speciesId: 'BULBASAUR',
      nickname: 'Bulby',
      level: 10,
      ribbonLevel: 0,
      natureId: 'Brave',
      subskills: { 10: null, 25: null, 50: null, 75: null, 100: null },
      ingredientChoices: { 30: null, 60: null },
      skillLevel: 1,
      shiny: false,
      notes: '',
      sneakySnacking: true,
      helpingFrequencySeen: null,
      carryLimitSeen: null,
      source: 'manual',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      gameDataVersion: '1.0.0'
    };

    await collectionRepository.add(pokemon);
    const retrieved = await collectionRepository.getById('test-1');
    expect(retrieved).toEqual(pokemon);
  });

  it('should list all pokemon', async () => {
    const list = await collectionRepository.getAll();
    expect(list).toHaveLength(0);
  });
});

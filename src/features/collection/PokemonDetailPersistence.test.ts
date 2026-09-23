import { describe, it, expect, beforeEach, vi } from 'vitest';
import { collectionRepository } from '../../data/repositories/DexieCollectionRepository';
import { validatePokemon } from '../../utils/pokemonValidator';
import { getSpeciesMainSkillName } from '../../services/i18n-game';
import gamedata from '../../data/static/gamedata.json';
import type { OwnedPokemon, StaticDataSchema } from '../../domain/models';

const gameData = gamedata as unknown as StaticDataSchema;

describe('Pokemon Detail Persistence & Edit Flow Tests', () => {
  beforeEach(async () => {
    await collectionRepository.clearAll();
  });

  it('edits Mew, validates, persists changes to repository, and reloads updated record', async () => {
    const mewSpecies = gameData.species.find(s => s.name === 'MEW')!;
    expect(mewSpecies.specialty).toBe('all');
    expect(getSpeciesMainSkillName(mewSpecies)).toBe('Versatile');

    const initialMew: OwnedPokemon = {
      id: 'mew-persistence-1',
      speciesId: 'MEW',
      nickname: 'OriginalMew',
      level: 25,
      ribbonLevel: 1,
      natureId: 'Modest',
      subskills: { 10: 'Skill Trigger M', 25: null, 50: null, 75: null, 100: null },
      ingredientChoices: { 1: mewSpecies.ingredient0[0].ingredient.name, 30: null, 60: null },
      skillLevel: 3,
      shiny: true,
      notes: '',
      sneakySnacking: true,
      helpingFrequencySeen: null,
      carryLimitSeen: null,
      source: 'manual',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      gameDataVersion: '1.0'
    };

    await collectionRepository.add(initialMew);

    // 1. Load existing Mew
    const loaded = await collectionRepository.getById('mew-persistence-1');
    expect(loaded).toBeDefined();
    expect(loaded?.nickname).toBe('OriginalMew');

    // 2. Perform edits on draft
    const draft: OwnedPokemon = {
      ...loaded!,
      nickname: 'CosmicMew',
      level: 50,
      skillLevel: 6,
      subskills: { 10: 'Skill Trigger M', 25: 'Helping Speed M', 50: 'Berry Finding S', 75: null, 100: null },
      ingredientChoices: {
        1: mewSpecies.ingredient0[0].ingredient.name,
        30: mewSpecies.ingredient30[0].ingredient.name,
        60: mewSpecies.ingredient60[1].ingredient.name
      }
    };

    // 3. Validate before save
    const validation = validatePokemon(draft, gameData);
    expect(validation.isValid).toBe(true);

    // 4. Persist to Dexie
    await collectionRepository.update(draft);

    // 5. Reload from Dexie and verify persisted fields
    const reloaded = await collectionRepository.getById('mew-persistence-1');
    expect(reloaded?.nickname).toBe('CosmicMew');
    expect(reloaded?.level).toBe(50);
    expect(reloaded?.skillLevel).toBe(6);
    expect(reloaded?.subskills[50]).toBe('Berry Finding S');
    expect(getSpeciesMainSkillName(gameData.species.find(s => s.name === reloaded?.speciesId))).toBe('Versatile');
  });

  it('edits Darkrai, validates, persists changes to repository, and reloads updated record', async () => {
    const darkraiSpecies = gameData.species.find(s => s.name === 'DARKRAI')!;
    expect(darkraiSpecies.specialty).toBe('all');
    expect(getSpeciesMainSkillName(darkraiSpecies)).toBe('Charge Strength M');

    const initialDarkrai: OwnedPokemon = {
      id: 'darkrai-persistence-1',
      speciesId: 'DARKRAI',
      nickname: 'Shadow',
      level: 30,
      ribbonLevel: 0,
      natureId: 'Adamant',
      subskills: { 10: 'Ingredient Finder M', 25: 'Inventory Up L', 50: null, 75: null, 100: null },
      ingredientChoices: { 1: darkraiSpecies.ingredient0[0].ingredient.name, 30: darkraiSpecies.ingredient30[0].ingredient.name, 60: null },
      skillLevel: 2,
      shiny: false,
      notes: '',
      sneakySnacking: false,
      helpingFrequencySeen: null,
      carryLimitSeen: null,
      source: 'manual',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      gameDataVersion: '1.0'
    };

    await collectionRepository.add(initialDarkrai);

    const loaded = await collectionRepository.getById('darkrai-persistence-1');
    expect(loaded?.nickname).toBe('Shadow');

    const draft: OwnedPokemon = {
      ...loaded!,
      nickname: 'DarkVoid',
      level: 60,
      ribbonLevel: 4,
      subskills: { 10: 'Ingredient Finder M', 25: 'Inventory Up L', 50: 'Helping Speed S', 75: null, 100: null },
      ingredientChoices: {
        1: darkraiSpecies.ingredient0[0].ingredient.name,
        30: darkraiSpecies.ingredient30[0].ingredient.name,
        60: darkraiSpecies.ingredient60[0].ingredient.name
      }
    };

    const validation = validatePokemon(draft, gameData);
    expect(validation.isValid).toBe(true);

    await collectionRepository.update(draft);

    const reloaded = await collectionRepository.getById('darkrai-persistence-1');
    expect(reloaded?.nickname).toBe('DarkVoid');
    expect(reloaded?.level).toBe(60);
    expect(reloaded?.ribbonLevel).toBe(4);
    expect(getSpeciesMainSkillName(gameData.species.find(s => s.name === reloaded?.speciesId))).toBe('Charge Strength M');
  });

  it('prevents saving when validation fails and keeps repository unchanged', async () => {
    const charizard = gameData.species.find(s => s.name === 'CHARIZARD')!;
    const initialCharizard: OwnedPokemon = {
      id: 'chari-1',
      speciesId: 'CHARIZARD',
      nickname: 'Blaze',
      level: 20,
      ribbonLevel: 0,
      natureId: 'Adamant',
      subskills: { 10: 'Helping Speed M', 25: null, 50: null, 75: null, 100: null },
      ingredientChoices: { 1: charizard.ingredient0[0].ingredient.name, 30: null, 60: null },
      skillLevel: 2,
      shiny: false,
      notes: '',
      sneakySnacking: false,
      helpingFrequencySeen: null,
      carryLimitSeen: null,
      source: 'manual',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      gameDataVersion: '1.0'
    };

    await collectionRepository.add(initialCharizard);

    // Invalid edit: level out of range
    const invalidDraft: OwnedPokemon = {
      ...initialCharizard,
      level: -5
    };

    const validation = validatePokemon(invalidDraft, gameData);
    expect(validation.isValid).toBe(false);

    // Simulated component action: do not update if invalid!
    if (validation.isValid) {
      await collectionRepository.update(invalidDraft);
    }

    const reloaded = await collectionRepository.getById('chari-1');
    expect(reloaded?.level).toBe(20); // Unchanged!
  });

  it('catches persistence failure and does not claim success', async () => {
    const pikachu = gameData.species.find(s => s.name === 'PIKACHU')!;
    const pikaRecord: OwnedPokemon = {
      id: 'pika-err-1',
      speciesId: 'PIKACHU',
      nickname: 'PikaErr',
      level: 10,
      ribbonLevel: 0,
      natureId: 'Brave',
      subskills: { 10: 'Helping Speed S', 25: null, 50: null, 75: null, 100: null },
      ingredientChoices: { 1: pikachu.ingredient0[0].ingredient.name, 30: null, 60: null },
      skillLevel: 1,
      shiny: false,
      notes: '',
      sneakySnacking: false,
      helpingFrequencySeen: null,
      carryLimitSeen: null,
      source: 'manual',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      gameDataVersion: '1.0'
    };

    // Spy update to throw Dexie error
    const spyUpdate = vi.spyOn(collectionRepository, 'update').mockRejectedValueOnce(new Error('IndexedDB Transaction Failed'));

    let saveSuccess = false;
    let errorMessage: string | null = null;

    try {
      const validation = validatePokemon(pikaRecord, gameData);
      if (validation.isValid) {
        await collectionRepository.update(pikaRecord);
        saveSuccess = true;
      }
    } catch (err: unknown) {
      saveSuccess = false;
      errorMessage = err instanceof Error ? err.message : 'Database error';
    }

    expect(saveSuccess).toBe(false);
    expect(errorMessage).toBe('IndexedDB Transaction Failed');

    spyUpdate.mockRestore();
  });
});

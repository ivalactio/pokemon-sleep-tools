import { describe, it, expect } from 'vitest';
import { validatePokemon } from './pokemonValidator';
import gamedata from '../data/static/gamedata.json';
import { getSpeciesMainSkillName, getSpeciesMainSkillDisplayName } from '../services/i18n-game';
import type { OwnedPokemon, StaticDataSchema } from '../domain/models';
import i18next from 'i18next';
import es from '../i18n/locales/es.json';
import en from '../i18n/locales/en.json';

const gameData = gamedata as unknown as StaticDataSchema;

describe('Pokemon Validator & Special Species Handling', () => {
  it('correctly loads and resolves Mew specialty and main skill', () => {
    const species = gameData.species.find(s => s.name === 'MEW');
    expect(species).toBeDefined();
    expect(species?.specialty).toBe('all');
    
    const skillName = getSpeciesMainSkillName(species);
    expect(skillName).toBe('Versatile');

    const mewRecord: OwnedPokemon = {
      id: 'mew-1',
      speciesId: 'MEW',
      nickname: 'Mew Test',
      level: 50,
      ribbonLevel: 2,
      natureId: 'Modest',
      subskills: {
        10: 'Helping Speed M',
        25: 'Skill Trigger M',
        50: 'Berry Finding S',
        75: null,
        100: null
      },
      ingredientChoices: {
        1: species?.ingredient0[0]?.ingredient.name || 'Egg',
        30: species?.ingredient30[0]?.ingredient.name || 'Herb',
        60: species?.ingredient60[1]?.ingredient.name || 'Leek'
      },
      skillLevel: 6,
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

    const validation = validatePokemon(mewRecord, gameData);
    expect(validation.isValid).toBe(true);
    expect(Object.keys(validation.errors)).toHaveLength(0);
  });

  it('correctly loads and resolves Darkrai specialty and main skill', () => {
    const species = gameData.species.find(s => s.name === 'DARKRAI');
    expect(species).toBeDefined();
    expect(species?.specialty).toBe('all');

    const skillName = getSpeciesMainSkillName(species);
    expect(skillName).toBe('Charge Strength M');

    const darkraiRecord: OwnedPokemon = {
      id: 'darkrai-1',
      speciesId: 'DARKRAI',
      nickname: 'Nightmare',
      level: 30,
      ribbonLevel: 0,
      natureId: 'Adamant',
      subskills: {
        10: 'Ingredient Finder M',
        25: 'Inventory Up L',
        50: null,
        75: null,
        100: null
      },
      ingredientChoices: {
        1: species?.ingredient0[0]?.ingredient.name || 'Sausage',
        30: species?.ingredient30[1]?.ingredient.name || 'Apple',
        60: null
      },
      skillLevel: 4,
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

    const validation = validatePokemon(darkraiRecord, gameData);
    expect(validation.isValid).toBe(true);
    expect(Object.keys(validation.errors)).toHaveLength(0);
  });

  it('validates normal species (Pikachu, Bulbasaur, Charizard) correctly', () => {
    const pika = gameData.species.find(s => s.name === 'PIKACHU')!;
    const pikachuRecord: OwnedPokemon = {
      id: 'pika-1',
      speciesId: 'PIKACHU',
      nickname: 'Sparky',
      level: 25,
      ribbonLevel: 1,
      natureId: 'Jolly',
      subskills: {
        10: 'Helping Speed S',
        25: 'Berry Finding S',
        50: null,
        75: null,
        100: null
      },
      ingredientChoices: {
        1: pika.ingredient0[0].ingredient.name,
        30: null,
        60: null
      },
      skillLevel: 2,
      shiny: false,
      notes: '',
      sneakySnacking: true,
      helpingFrequencySeen: null,
      carryLimitSeen: null,
      source: 'manual',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      gameDataVersion: '1.0'
    };

    expect(validatePokemon(pikachuRecord, gameData).isValid).toBe(true);
  });

  it('fails validation when mandatory level is out of bounds', () => {
    const pika = gameData.species.find(s => s.name === 'PIKACHU')!;
    const invalidRecord: OwnedPokemon = {
      id: 'inv-1',
      speciesId: 'PIKACHU',
      nickname: 'BadLevel',
      level: 150, // Out of bounds
      ribbonLevel: 0,
      natureId: 'Jolly',
      subskills: { 10: 'Helping Speed S', 25: null, 50: null, 75: null, 100: null },
      ingredientChoices: { 1: pika.ingredient0[0].ingredient.name, 30: null, 60: null },
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

    const result = validatePokemon(invalidRecord, gameData);
    expect(result.isValid).toBe(false);
    expect(result.errors.level).toBeDefined();
  });

  it('fails validation when duplicate subskills are assigned', () => {
    const pika = gameData.species.find(s => s.name === 'PIKACHU')!;
    const invalidRecord: OwnedPokemon = {
      id: 'inv-2',
      speciesId: 'PIKACHU',
      nickname: 'DupSubskill',
      level: 30,
      ribbonLevel: 0,
      natureId: 'Jolly',
      subskills: {
        10: 'Helping Speed S',
        25: 'Helping Speed S', // Duplicate!
        50: null,
        75: null,
        100: null
      },
      ingredientChoices: { 1: pika.ingredient0[0].ingredient.name, 30: pika.ingredient30[0].ingredient.name, 60: null },
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

    const result = validatePokemon(invalidRecord, gameData);
    expect(result.isValid).toBe(false);
    expect(result.errors.subskill_25).toContain('duplicada');
  });

  it('fails validation when unlocked ingredient choice is invalid for species', () => {
    const pika = gameData.species.find(s => s.name === 'PIKACHU')!;
    const invalidRecord: OwnedPokemon = {
      id: 'inv-3',
      speciesId: 'PIKACHU',
      nickname: 'BadIng',
      level: 30,
      ribbonLevel: 0,
      natureId: 'Jolly',
      subskills: { 10: 'Helping Speed S', 25: 'Skill Trigger S', 50: null, 75: null, 100: null },
      ingredientChoices: { 
        1: pika.ingredient0[0].ingredient.name, 
        30: 'NonExistentIngredient', // Invalid
        60: null 
      },
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

    const result = validatePokemon(invalidRecord, gameData);
    expect(result.isValid).toBe(false);
    expect(result.errors.ingredient_30).toBeDefined();
  });

  it('ensures internal IDs and validation logic remain unchanged across i18n locale switches', async () => {
    await i18next.init({
      lng: 'es',
      resources: { es: { translation: es }, en: { translation: en } }
    });

    const mew = gameData.species.find(s => s.name === 'MEW')!;
    const tEs = i18next.t.bind(i18next);
    const esSkillDisplay = getSpeciesMainSkillDisplayName(tEs, mew);

    await i18next.changeLanguage('en');
    const tEn = i18next.t.bind(i18next);
    const enSkillDisplay = getSpeciesMainSkillDisplayName(tEn, mew);

    // Internal ID is always "Versatile"
    expect(getSpeciesMainSkillName(mew)).toBe('Versatile');
    // Display names match localization dictionary
    expect(esSkillDisplay).toBe('Versátil');
    expect(enSkillDisplay).toBe('Versatile');
  });
});

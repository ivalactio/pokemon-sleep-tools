import { describe, it, expect } from 'vitest';
import { SleepApiEngine } from '../../services/sleepapi/sleepapi-engine';
import gamedata from '../../data/static/gamedata.json';
import { getSpeciesMainSkillName, translateSpecialty } from '../../services/i18n-game';
import type { OwnedPokemon, StaticDataSchema, SimulationConfig } from '../../domain/models';
import i18next from 'i18next';
import es from '../../i18n/locales/es.json';
import en from '../../i18n/locales/en.json';

const gameData = gamedata as unknown as StaticDataSchema;
const engine = new SleepApiEngine(gameData);

describe('Comparator Page & Logic Tests', () => {
  const config: SimulationConfig = {
    camp: false,
    bedtime: '22:00',
    wakeup: '06:00',
    island: 'greengrass',
    areaBonus: 0
  };

  it('compares two normal species (Pikachu vs Bulbasaur) using production engine', async () => {
    const pikaSpecies = gameData.species.find(s => s.name === 'PIKACHU')!;
    const bulbaSpecies = gameData.species.find(s => s.name === 'BULBASAUR')!;

    const pikachu: OwnedPokemon = {
      id: 'cmp-pika',
      speciesId: 'PIKACHU',
      nickname: 'Pikachu A',
      level: 30,
      ribbonLevel: 1,
      natureId: 'Brave',
      subskills: { 10: 'Helping Speed S', 25: 'Skill Chance S', 50: null, 75: null, 100: null },
      ingredientChoices: { 1: pikaSpecies.ingredient0[0].ingredient.name, 30: pikaSpecies.ingredient30[0].ingredient.name, 60: null },
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

    const bulbasaur: OwnedPokemon = {
      id: 'cmp-bulba',
      speciesId: 'BULBASAUR',
      nickname: 'Bulbasaur B',
      level: 30,
      ribbonLevel: 0,
      natureId: 'Modest',
      subskills: { 10: 'Ingredient Finder S', 25: 'Inventory Up S', 50: null, 75: null, 100: null },
      ingredientChoices: { 1: bulbaSpecies.ingredient0[0].ingredient.name, 30: bulbaSpecies.ingredient30[0].ingredient.name, 60: null },
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

    const estPika = await engine.estimateProduction(pikachu, config);
    const estBulba = await engine.estimateProduction(bulbasaur, config);

    expect(estPika).toBeDefined();
    expect(estBulba).toBeDefined();

    const pikaBerries = estPika.berries.reduce((s, b) => s + b.amount, 0);
    const bulbaIngs = estBulba.ingredients.reduce((s, i) => s + i.amount, 0);

    expect(pikaBerries).toBeGreaterThan(0);
    expect(bulbaIngs).toBeGreaterThan(0);
  });

  it('compares Mew and Darkrai without errors, resolving specialty "all" and main skills', async () => {
    const mewSpecies = gameData.species.find(s => s.name === 'MEW')!;
    const darkraiSpecies = gameData.species.find(s => s.name === 'DARKRAI')!;

    expect(mewSpecies.specialty).toBe('all');
    expect(darkraiSpecies.specialty).toBe('all');

    expect(getSpeciesMainSkillName(mewSpecies)).toBe('Versatile');
    expect(getSpeciesMainSkillName(darkraiSpecies)).toBe('Charge Strength M');

    const mew: OwnedPokemon = {
      id: 'cmp-mew',
      speciesId: 'MEW',
      nickname: 'Mew Spec',
      level: 50,
      ribbonLevel: 2,
      natureId: 'Modest',
      subskills: { 10: 'Skill Chance M', 25: 'Helping Speed M', 50: 'Berry Finding S', 75: null, 100: null },
      ingredientChoices: { 1: mewSpecies.ingredient0[0].ingredient.name, 30: mewSpecies.ingredient30[0].ingredient.name, 60: mewSpecies.ingredient60[1].ingredient.name },
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

    const darkrai: OwnedPokemon = {
      id: 'cmp-darkrai',
      speciesId: 'DARKRAI',
      nickname: 'Darkrai Spec',
      level: 50,
      ribbonLevel: 1,
      natureId: 'Adamant',
      subskills: { 10: 'Ingredient Finder M', 25: 'Inventory Up L', 50: null, 75: null, 100: null },
      ingredientChoices: { 1: darkraiSpecies.ingredient0[0].ingredient.name, 30: darkraiSpecies.ingredient30[0].ingredient.name, 60: darkraiSpecies.ingredient60[0].ingredient.name },
      skillLevel: 5,
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

    const estMew = await engine.estimateProduction(mew, config);
    const estDarkrai = await engine.estimateProduction(darkrai, config);

    expect(estMew).toBeDefined();
    expect(estDarkrai).toBeDefined();

    expect(estMew.skillProcs).toBeGreaterThan(0);
    expect(estDarkrai.skillProcs).toBeGreaterThan(0);
  });

  it('maintains consistent internal IDs and calculation results when switching languages ES <-> EN', async () => {
    await i18next.init({
      lng: 'es',
      resources: { es: { translation: es }, en: { translation: en } }
    });

    const tEs = i18next.t.bind(i18next);
    expect(translateSpecialty(tEs, 'all')).toBe('Todas');

    await i18next.changeLanguage('en');
    const tEn = i18next.t.bind(i18next);
    expect(translateSpecialty(tEn, 'all')).toBe('All');

    // Calculations remain strictly based on internal IDs
    const charizard = gameData.species.find(s => s.name === 'CHARIZARD')!;
    const chariRecord: OwnedPokemon = {
      id: 'cmp-chari',
      speciesId: 'CHARIZARD',
      nickname: 'Blaze',
      level: 40,
      ribbonLevel: 0,
      natureId: 'Adamant',
      subskills: { 10: 'Helping Speed M', 25: 'Ingredient Finder M', 50: null, 75: null, 100: null },
      ingredientChoices: { 1: charizard.ingredient0[0].ingredient.name, 30: charizard.ingredient30[0].ingredient.name, 60: null },
      skillLevel: 3,
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

    const res1 = await engine.estimateProduction(chariRecord, config);
    await i18next.changeLanguage('es');
    const res2 = await engine.estimateProduction(chariRecord, config);

    expect(res1.skillProcs).toBe(res2.skillProcs);
    expect(res1.berries[0].amount).toBe(res2.berries[0].amount);
  });
});

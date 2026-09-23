import { globalHarness } from '../testHarness';
import { SleepApiEngine } from '../../../services/sleepapi/sleepapi-engine';
import gamedata from '../../../data/static/gamedata.json';
import type { StaticDataSchema, OwnedPokemon } from '../../../domain/models';
import i18next from 'i18next';
import es from '../../../i18n/locales/es.json';
import en from '../../../i18n/locales/en.json';

const engine = new SleepApiEngine(gamedata as unknown as StaticDataSchema);

globalHarness.register({
  id: 'CMP-001',
  name: 'Compare normal species (Pikachu vs Bulbasaur)',
  category: 'Comparator',
  layer: 'SERVICE',
  fn: async () => {
    const p1: OwnedPokemon = {
      id: 'p1', speciesId: 'PIKACHU', nickname: 'Pika', level: 25, ribbonLevel: 0, natureId: 'Brave',
      subskills: { 10: 'Helping Speed S', 25: null, 50: null, 75: null, 100: null },
      ingredientChoices: { 1: 'Apple', 30: null, 60: null },
      skillLevel: 2, shiny: false, notes: '', sneakySnacking: false,
      helpingFrequencySeen: null, carryLimitSeen: null, source: 'test', createdAt: Date.now(), updatedAt: Date.now(), gameDataVersion: '1.0'
    };
    const p2: OwnedPokemon = {
      id: 'p2', speciesId: 'BULBASAUR', nickname: 'Bulby', level: 25, ribbonLevel: 0, natureId: 'Modest',
      subskills: { 10: 'Ingredient Finder S', 25: null, 50: null, 75: null, 100: null },
      ingredientChoices: { 1: 'Honey', 30: null, 60: null },
      skillLevel: 1, shiny: false, notes: '', sneakySnacking: false,
      helpingFrequencySeen: null, carryLimitSeen: null, source: 'test', createdAt: Date.now(), updatedAt: Date.now(), gameDataVersion: '1.0'
    };
    const config = { camp: false, bedtime: '22:00', wakeup: '06:00', island: 'greengrass' as const, areaBonus: 0 };
    const e1 = await engine.estimateProduction(p1, config);
    const e2 = await engine.estimateProduction(p2, config);
    if (!e1 || !e2) return { status: 'FAIL', message: 'Estimación de producción nula' };
    return { status: 'PASS', message: `Pikachu: ${e1.berries[0]?.amount.toFixed(1)} bayas, Bulbasaur: ${e2.ingredients[0]?.amount.toFixed(1)} ings` };
  }
});

globalHarness.register({
  id: 'CMP-002',
  name: 'Compare special species (Mew vs Darkrai)',
  category: 'Comparator',
  layer: 'SERVICE',
  fn: async () => {
    const mew: OwnedPokemon = {
      id: 'm1', speciesId: 'MEW', nickname: 'Mew', level: 50, ribbonLevel: 2, natureId: 'Modest',
      subskills: { 10: 'Skill Trigger M', 25: 'Helping Speed M', 50: 'Berry Finding S', 75: null, 100: null },
      ingredientChoices: { 1: 'Egg', 30: 'Herb', 60: 'Leek' },
      skillLevel: 6, shiny: true, notes: '', sneakySnacking: true,
      helpingFrequencySeen: null, carryLimitSeen: null, source: 'test', createdAt: Date.now(), updatedAt: Date.now(), gameDataVersion: '1.0'
    };
    const darkrai: OwnedPokemon = {
      id: 'd1', speciesId: 'DARKRAI', nickname: 'Darkrai', level: 50, ribbonLevel: 1, natureId: 'Adamant',
      subskills: { 10: 'Ingredient Finder M', 25: 'Inventory Up L', 50: null, 75: null, 100: null },
      ingredientChoices: { 1: 'Sausage', 30: 'Apple', 60: 'Herb' },
      skillLevel: 5, shiny: false, notes: '', sneakySnacking: false,
      helpingFrequencySeen: null, carryLimitSeen: null, source: 'test', createdAt: Date.now(), updatedAt: Date.now(), gameDataVersion: '1.0'
    };
    const config = { camp: false, bedtime: '22:00', wakeup: '06:00', island: 'greengrass' as const, areaBonus: 0 };
    const e1 = await engine.estimateProduction(mew, config);
    const e2 = await engine.estimateProduction(darkrai, config);
    if (!e1 || !e2) return { status: 'FAIL', message: 'Estimación nula para Pokémon especiales' };
    return { status: 'PASS', message: `Mew (Skill procs ${e1.skillProcs.toFixed(2)}) vs Darkrai (Skill procs ${e2.skillProcs.toFixed(2)})` };
  }
});

globalHarness.register({
  id: 'CMP-003',
  name: 'Ensure i18n locale switch ES/EN does not break comparison',
  category: 'Comparator',
  layer: 'SERVICE',
  fn: async () => {
    await i18next.init({ lng: 'es', resources: { es: { translation: es }, en: { translation: en } } });
    const p1: OwnedPokemon = {
      id: 'p1', speciesId: 'MEW', nickname: 'Mew', level: 30, ribbonLevel: 0, natureId: 'Hardy',
      subskills: { 10: 'Helping Speed S', 25: null, 50: null, 75: null, 100: null },
      ingredientChoices: { 1: 'Egg', 30: 'Herb', 60: null },
      skillLevel: 1, shiny: false, notes: '', sneakySnacking: false,
      helpingFrequencySeen: null, carryLimitSeen: null, source: 'test', createdAt: Date.now(), updatedAt: Date.now(), gameDataVersion: '1.0'
    };
    const config = { camp: false, bedtime: '22:00', wakeup: '06:00', island: 'greengrass' as const, areaBonus: 0 };
    const eEs = await engine.estimateProduction(p1, config);
    await i18next.changeLanguage('en');
    const eEn = await engine.estimateProduction(p1, config);

    if (eEs.skillProcs !== eEn.skillProcs) {
      return { status: 'FAIL', message: 'Los cálculos variaron con el idioma' };
    }
    return { status: 'PASS', message: 'Cálculos consistentes independientemente del idioma' };
  }
});
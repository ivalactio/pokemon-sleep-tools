import { describe, it, expect, beforeEach } from 'vitest';
import i18next from 'i18next';
import es from '../i18n/locales/es.json';
import en from '../i18n/locales/en.json';
import { translateNature, translateMainSkill, translateSubskill, translateIngredient, getNatureDisplayName, getNatureEffects, getSpeciesMainSkillName, getSpeciesMainSkillDisplayName } from './i18n-game';

describe('Game Data Localization', () => {
  beforeEach(async () => {
    await i18next.init({
      lng: 'es',
      resources: { es: { translation: es }, en: { translation: en } }
    });
  });

  it('translates natures correctly based on language (including accents/ñ)', async () => {
    const t = i18next.t.bind(i18next);
    expect(translateNature(t, 'Lonely')).toBe('Huraña');

    await i18next.changeLanguage('en');
    expect(translateNature(t, 'Lonely')).toBe('Lonely');
  });

  it('translates nature effects correctly', async () => {
    const t = i18next.t.bind(i18next);
    expect(getNatureEffects(t, 'Lonely')).toBe('(+Rapidez de ayuda, -Recuperación de energía)');
    expect(getNatureDisplayName(t, 'Lonely')).toBe('Huraña (+Rapidez de ayuda, -Recuperación de energía)');
    expect(getNatureDisplayName(t, 'Hardy')).toBe('Fuerte');

    await i18next.changeLanguage('en');
    expect(getNatureEffects(t, 'Lonely')).toBe('(+Speed of help, -Energy recovery)');
    expect(getNatureDisplayName(t, 'Lonely')).toBe('Lonely (+Speed of help, -Energy recovery)');
    expect(getNatureDisplayName(t, 'Hardy')).toBe('Hardy');
  });

  it('translates main skills correctly', async () => {
    const t = i18next.t.bind(i18next);
    expect(translateMainSkill(t, 'Ingredient Magnet S')).toBe('Imán Ingredientes S');
    await i18next.changeLanguage('en');
    expect(translateMainSkill(t, 'Ingredient Magnet S')).toBe('Ingredient Magnet S');
  });

  it('resolves species main skills safely for standard, modified, and special species', async () => {
    const t = i18next.t.bind(i18next);
    const pikachu = { skill: { name: 'Charge Strength S' } };
    const darkrai = { skill: { baseSkill: { name: 'Charge Strength M' }, modifierName: 'Bad Dreams' } };
    const mew = { skill: { name: 'Versatile' } };
    const heracross = { skill: { baseSkill: { name: 'Cooking Assist S' } } };

    expect(getSpeciesMainSkillName(pikachu)).toBe('Charge Strength S');
    expect(getSpeciesMainSkillName(darkrai)).toBe('Charge Strength M');
    expect(getSpeciesMainSkillName(mew)).toBe('Versatile');
    expect(getSpeciesMainSkillName(heracross)).toBe('Cooking Assist S');
    expect(getSpeciesMainSkillName(null)).toBe('');
    expect(getSpeciesMainSkillName({})).toBe('');

    expect(getSpeciesMainSkillDisplayName(t, pikachu)).toBe('Carga Vigor S');
    expect(getSpeciesMainSkillDisplayName(t, darkrai)).toBe('Carga Vigor M');
    expect(getSpeciesMainSkillDisplayName(t, mew)).toBe('Versátil');
    expect(getSpeciesMainSkillDisplayName(t, heracross)).toBe('Ayuda de Cocina S');
    expect(getSpeciesMainSkillDisplayName(t, null)).toBe('Desconocida');
  });

  it('translates subskills correctly', async () => {
    const t = i18next.t.bind(i18next);
    expect(translateSubskill(t, 'Berry Finding S')).toBe('Busca bayas S');
    await i18next.changeLanguage('en');
    expect(translateSubskill(t, 'Berry Finding S')).toBe('Berry Finding S');
  });

  it('translates ingredients correctly', async () => {
    const t = i18next.t.bind(i18next);
    expect(translateIngredient(t, 'Honey')).toBe('Miel');
    await i18next.changeLanguage('en');
    expect(translateIngredient(t, 'Honey')).toBe('Honey');
  });

  it('returns the internal id if translation is missing', () => {
    const t = i18next.t.bind(i18next);
    expect(translateNature(t, 'FakeNature')).toBe('FakeNature');
  });

  it('no localization values contain the replacement character U+FFFD', () => {
    const checkObjForReplacementChar = (obj: Record<string, unknown>) => {
      for (const key of Object.keys(obj)) {
        if (typeof obj[key] === 'string') {
          expect(obj[key]).not.toContain('\uFFFD');
        } else if (typeof obj[key] === 'object' && obj[key] !== null) {
          checkObjForReplacementChar(obj[key] as Record<string, unknown>);
        }
      }
    };
    checkObjForReplacementChar(es);
    checkObjForReplacementChar(en);
  });
});

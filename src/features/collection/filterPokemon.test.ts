import { describe, it, expect } from 'vitest';
import { filterPokemonList } from './filterPokemon';
import type { OwnedPokemon } from '../../domain/models';
import type { CollectionFilters } from './types';

const makePokemon = (partial: Partial<OwnedPokemon> & { id: string; speciesId: string }): OwnedPokemon => ({
  nickname: '',
  level: 1,
  ribbonLevel: 0,
  natureId: 'Hardy',
  subskills: { 10: null, 25: null, 50: null, 75: null, 100: null },
  ingredientChoices: { 1: null, 30: null, 60: null },
  skillLevel: 1,
  shiny: false,
  notes: '',
  sneakySnacking: false,
  helpingFrequencySeen: null,
  carryLimitSeen: null,
  source: 'manual',
  createdAt: 0,
  updatedAt: 0,
  gameDataVersion: '1',
  ...partial
});

describe('Collection Filter Logic (Language-Independent)', () => {
  const gengar: OwnedPokemon = makePokemon({
    id: 'pkmn-gengar-1',
    speciesId: 'GENGAR',
    nickname: 'ShadowKing',
    level: 35,
    natureId: 'Modest',
    subskills: { 10: 'Ingredient Finder S', 25: 'Helping Speed M', 50: null, 75: null, 100: null },
    ingredientChoices: { 1: 'Mushroom', 30: 'Mushroom', 60: 'Herb' },
    skillLevel: 2,
    isFavorite: true,
    shiny: false
  });

  const raichu: OwnedPokemon = makePokemon({
    id: 'pkmn-raichu-1',
    speciesId: 'RAICHU',
    nickname: 'Chispa',
    level: 42,
    natureId: 'Adamant',
    subskills: { 10: 'Berry Finding S', 25: 'Helping Bonus', 50: null, 75: null, 100: null },
    ingredientChoices: { 1: 'Apple', 30: 'Apple', 60: 'Ginger' },
    skillLevel: 3,
    isFavorite: false,
    shiny: true
  });

  const sylveon: OwnedPokemon = makePokemon({
    id: 'pkmn-sylveon-1',
    speciesId: 'SYLVEON',
    nickname: 'Ribbon',
    level: 28,
    natureId: 'Calm',
    subskills: { 10: 'Skill Trigger M', 25: 'Skill Level Up S', 50: null, 75: null, 100: null },
    ingredientChoices: { 1: 'Milk', 30: 'Cacao', 60: 'Milk' },
    skillLevel: 5,
    isFavorite: true,
    shiny: false
  });

  const sampleList = [gengar, raichu, sylveon];

  const emptyFilters: CollectionFilters = {
    search: '',
    subSkillIds: [],
    ingredientIds: [],
    favoritesOnly: false,
    incompleteOnly: false
  };

  it('without filters returns all pokemon', () => {
    const res = filterPokemonList(sampleList, emptyFilters);
    expect(res).toHaveLength(3);
  });

  it('filters by specialty = ingredient correctly (matches Gengar)', () => {
    const filters: CollectionFilters = { ...emptyFilters, specialty: 'ingredient' };
    const res = filterPokemonList(sampleList, filters);
    expect(res).toHaveLength(1);
    expect(res[0].speciesId).toBe('GENGAR');
  });

  it('filters by specialty = berry correctly (matches Raichu)', () => {
    const filters: CollectionFilters = { ...emptyFilters, specialty: 'berry' };
    const res = filterPokemonList(sampleList, filters);
    expect(res).toHaveLength(1);
    expect(res[0].speciesId).toBe('RAICHU');
  });

  it('filters by specialty = skill correctly (matches Sylveon)', () => {
    const filters: CollectionFilters = { ...emptyFilters, specialty: 'skill' };
    const res = filterPokemonList(sampleList, filters);
    expect(res).toHaveLength(1);
    expect(res[0].speciesId).toBe('SYLVEON');
  });

  it('filters by nature correctly', () => {
    const filters: CollectionFilters = { ...emptyFilters, natureId: 'Adamant' };
    const res = filterPokemonList(sampleList, filters);
    expect(res).toHaveLength(1);
    expect(res[0].id).toBe('pkmn-raichu-1');
  });

  it('filters by level range correctly', () => {
    const filters: CollectionFilters = { ...emptyFilters, minLevel: 30, maxLevel: 40 };
    const res = filterPokemonList(sampleList, filters);
    expect(res).toHaveLength(1);
    expect(res[0].id).toBe('pkmn-gengar-1');
  });

  it('filters by favorites only', () => {
    const filters: CollectionFilters = { ...emptyFilters, favoritesOnly: true };
    const res = filterPokemonList(sampleList, filters);
    expect(res).toHaveLength(2);
    expect(res.map(p => p.id)).toEqual(['pkmn-gengar-1', 'pkmn-sylveon-1']);
  });

  it('filters by search term matching nickname or species displayName', () => {
    const byNickname: CollectionFilters = { ...emptyFilters, search: 'Chispa' };
    expect(filterPokemonList(sampleList, byNickname)).toHaveLength(1);

    const byDisplayName: CollectionFilters = { ...emptyFilters, search: 'Gengar' };
    expect(filterPokemonList(sampleList, byDisplayName)).toHaveLength(1);
  });

  it('combines multiple filters correctly', () => {
    const combined: CollectionFilters = {
      ...emptyFilters,
      specialty: 'ingredient',
      favoritesOnly: true,
      minLevel: 30
    };
    const res = filterPokemonList(sampleList, combined);
    expect(res).toHaveLength(1);
    expect(res[0].speciesId).toBe('GENGAR');
  });

  it('returns empty array when combined filters have no match', () => {
    const noMatch: CollectionFilters = {
      ...emptyFilters,
      specialty: 'berry',
      favoritesOnly: true // Raichu is berry but not favorite
    };
    const res = filterPokemonList(sampleList, noMatch);
    expect(res).toHaveLength(0);
  });
});

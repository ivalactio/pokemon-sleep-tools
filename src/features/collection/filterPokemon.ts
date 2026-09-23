import type { OwnedPokemon } from '../../domain/models';
import type { CollectionFilters } from './types';
import gamedata from '../../data/static/gamedata.json';
import { isComplete } from '../../utils/pokemonUtils';
import { getSpeciesMainSkillName } from '../../services/i18n-game';

/**
 * Filter an OwnedPokemon against CollectionFilters.
 * Operates purely on stable internal IDs/values, completely independent of UI language.
 */
export function matchesFilters(p: OwnedPokemon, filters: CollectionFilters): boolean {
  if (filters.search) {
    const term = filters.search.toLowerCase().trim();
    const nicknameMatch = p.nickname?.toLowerCase().includes(term);
    const speciesIdMatch = p.speciesId.toLowerCase().includes(term);
    const species = gamedata.species.find((s: any) => s.name === p.speciesId);
    const displayNameMatch = species?.displayName?.toLowerCase().includes(term);

    if (!nicknameMatch && !speciesIdMatch && !displayNameMatch) {
      return false;
    }
  }

  if (filters.minLevel !== undefined && p.level < filters.minLevel) return false;
  if (filters.maxLevel !== undefined && p.level > filters.maxLevel) return false;
  if (filters.natureId && p.natureId !== filters.natureId) return false;
  if (filters.favoritesOnly && !p.isFavorite) return false;
  if (filters.incompleteOnly && isComplete(p)) return false;

  const species = gamedata.species.find((s: any) => s.name === p.speciesId);
  if (!species) return false;

  // Specialty matches internal lowercase values: 'berry' | 'ingredient' | 'skill'
  if (filters.specialty && species.specialty !== filters.specialty) {
    return false;
  }

  if (filters.berryId && species.berry?.name !== filters.berryId) {
    return false;
  }

  if (filters.mainSkillId && getSpeciesMainSkillName(species) !== filters.mainSkillId) {
    return false;
  }

  if (filters.subSkillIds && filters.subSkillIds.length > 0) {
    if (!p.subskills) return false;
    const activeLevels = [10, 25, 50, 75, 100].filter(l => p.level >= l);
    const activeSubskills = activeLevels.map(l => (p.subskills as any)[l]).filter(Boolean);
    if (!filters.subSkillIds.every(id => activeSubskills.includes(id))) {
      return false;
    }
  }

  if (filters.ingredientIds && filters.ingredientIds.length > 0) {
    const pIngs = [
      (p.ingredientChoices as any)?.[1] || species.ingredient0?.[0]?.ingredient?.name,
      (p.ingredientChoices as any)?.[30],
      (p.ingredientChoices as any)?.[60]
    ].filter(Boolean) as string[];

    if (!filters.ingredientIds.every(id => pIngs.includes(id))) {
      return false;
    }
  }

  return true;
}

export function filterPokemonList(pokemonList: OwnedPokemon[], filters: CollectionFilters): OwnedPokemon[] {
  return pokemonList.filter(p => matchesFilters(p, filters));
}

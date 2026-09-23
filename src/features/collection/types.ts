export interface CollectionFilters {
  search: string;
  minLevel?: number;
  maxLevel?: number;
  natureId?: string;
  mainSkillId?: string;
  specialty?: string;
  berryId?: string;
  subSkillIds: string[];
  ingredientIds: string[];
  favoritesOnly: boolean;
  incompleteOnly: boolean;
}

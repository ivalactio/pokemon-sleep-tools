export interface CollectionFilters {
  search: string;
  minLevel?: number;
  maxLevel?: number;
  natureId?: string;
  mainSkillId?: string;
  subSkillIds: string[];
  ingredientIds: string[];
  favoritesOnly: boolean;
  incompleteOnly: boolean;
}

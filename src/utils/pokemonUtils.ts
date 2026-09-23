import type { OwnedPokemon } from '../domain/models';

export const isComplete = (p: OwnedPokemon) => {
  if (!p.natureId) return false;
  if (!p.ingredientChoices || !p.ingredientChoices[30]) return false;
  if (p.level >= 60 && !p.ingredientChoices[60]) return false;
  if (!p.subskills) return false;
  if (p.level >= 10 && !p.subskills[10]) return false;
  if (p.level >= 25 && !p.subskills[25]) return false;
  if (p.level >= 50 && !p.subskills[50]) return false;
  if (p.level >= 75 && !p.subskills[75]) return false;
  if (p.level >= 100 && !p.subskills[100]) return false;
  return true;
};

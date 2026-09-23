import type { TFunction } from 'i18next';
import { natureEffects } from '../data/static/natureEffects';

export function translateNature(t: TFunction, id: string): string {
  if (!id) return id;
  return t(`game.nature.${id}`, { defaultValue: id });
}

export function getNatureEffects(t: TFunction, id: string): string | null {
  if (!id) return null;
  const effects = natureEffects[id];
  if (!effects) return null;
  const plusText = t(`game.effect.${effects.plus}`, { defaultValue: effects.plus });
  const minusText = t(`game.effect.${effects.minus}`, { defaultValue: effects.minus });
  return `(+${plusText}, -${minusText})`;
}

export function getNatureDisplayName(t: TFunction, id: string): string {
  if (!id) return id;
  const name = translateNature(t, id);
  const effects = getNatureEffects(t, id);
  if (effects) {
    return `${name} ${effects}`;
  }
  return name;
}

export function translateSubskill(t: TFunction, id: string): string {
  if (!id) return id;
  return t(`game.subskill.${id}`, { defaultValue: id });
}

export function translateMainSkill(t: TFunction, id?: string): string {
  if (!id) return '';
  return t(`game.mainSkill.${id}`, { defaultValue: id });
}

export function translateIngredient(t: TFunction, id: string): string {
  if (!id) return id;
  return t(`game.ingredient.${id}`, { defaultValue: id });
}

export function translateBerry(t: TFunction, id: string): string {
  if (!id) return id;
  return t(`game.berry.${id}`, { defaultValue: id });
}

export function translateRecipe(t: TFunction, id: string): string {
  if (!id) return id;
  return t(`game.recipe.${id}`, { defaultValue: id });
}

export function translateSpecialty(t: TFunction, specialty: string): string {
  if (!specialty) return specialty;
  return t(`game.specialty.${specialty.toLowerCase()}`, { defaultValue: specialty });
}

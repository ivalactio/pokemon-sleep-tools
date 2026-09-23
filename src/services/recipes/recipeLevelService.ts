import { db } from '../../data/db';

export const RECIPE_LEVEL_BONUSES: number[] = [
  0,   // L1: 0%
  2,   // L2
  4,   // L3
  6,   // L4
  8,   // L5
  9,   // L6
  11,  // L7
  13,  // L8
  16,  // L9
  18,  // L10
  20, 22, 24, 26, 28, 30, 32, 34, 36, 38, // L11-20
  41, 44, 47, 50, 53, 56, 59, 62, 65, 68, // L21-30
  72, 76, 80, 84, 88, 92, 96, 100, 104, 108, // L31-40
  113, 118, 123, 128, 133, 138, 143, 148, 153, 158, // L41-50
  164, 170, 176, 182, 188, 194, 200, 206, 212, 218  // L51-60
];

export function getRecipeLevelBonusPercent(level: number): number {
  const lvl = Math.max(1, Math.min(60, Math.floor(level || 1)));
  return RECIPE_LEVEL_BONUSES[lvl - 1] || 0;
}

export function calculateRecipePower(baseValue: number, level: number): number {
  const bonusPct = getRecipeLevelBonusPercent(level);
  return Math.round(baseValue * (1 + bonusPct / 100));
}

export async function setRecipeLevelInDb(recipeId: string, level: number): Promise<void> {
  const lvl = Math.max(1, Math.min(60, Math.floor(level || 1)));
  await db.recipeLevels.put({ recipeId, level: lvl });
}

export async function getRecipeLevelMap(): Promise<Record<string, number>> {
  const records = await db.recipeLevels.toArray();
  const map: Record<string, number> = {};
  for (const r of records) {
    map[r.recipeId] = r.level;
  }
  return map;
}

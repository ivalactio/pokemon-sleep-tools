import { describe, it, expect, beforeEach } from 'vitest';
import { 
  getRecipeLevelBonusPercent, 
  calculateRecipePower, 
  setRecipeLevelInDb, 
  getRecipeLevelMap 
} from './recipeLevelService';
import { db } from '../../data/db';

describe('recipeLevelService', () => {
  beforeEach(async () => {
    await db.recipeLevels.clear();
  });

  it('calculates correct level bonus percentages', () => {
    expect(getRecipeLevelBonusPercent(1)).toBe(0);
    expect(getRecipeLevelBonusPercent(2)).toBe(2);
    expect(getRecipeLevelBonusPercent(10)).toBe(18);
    expect(getRecipeLevelBonusPercent(60)).toBe(218);

    // Clamping invalid bounds
    expect(getRecipeLevelBonusPercent(0)).toBe(0);
    expect(getRecipeLevelBonusPercent(100)).toBe(218);
  });

  it('calculates power at level correctly', () => {
    const basePower = 1000;
    expect(calculateRecipePower(basePower, 1)).toBe(1000);
    expect(calculateRecipePower(basePower, 10)).toBe(1180);
    expect(calculateRecipePower(basePower, 60)).toBe(3180);
  });

  it('persists and retrieves recipe levels in Dexie database', async () => {
    await setRecipeLevelInDb('SIMPLE_CHOWDER', 15);
    await setRecipeLevelInDb('FANCY_APPLE_CURRY', 45);

    const map = await getRecipeLevelMap();
    expect(map['SIMPLE_CHOWDER']).toBe(15);
    expect(map['FANCY_APPLE_CURRY']).toBe(45);
  });
});

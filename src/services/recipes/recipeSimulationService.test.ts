import { describe, it, expect } from 'vitest';
import { simulate21Meals } from './recipeSimulationService';

describe('recipeSimulationService', () => {
  const dummyRecipe = {
    ingredients: [
      { amount: 20, ingredient: { name: 'Apple' } }
    ]
  };

  it('returns 100% weekly coverage for 21/21 meals completed', () => {
    // 60 Apples per day = 20 per meal -> exactly 21/21 meals cooked
    const teamIngs = new Map<string, number>([['Apple', 60]]);
    const res = simulate21Meals(dummyRecipe, teamIngs);

    expect(res.totalMealsCooked).toBe(21);
    expect(res.weeklyCoveragePercent).toBe(100);
    expect(res.weeklyCoveragePercent).toBeLessThanOrEqual(100);
  });

  it('returns ~71.4% weekly coverage for 15/21 meals completed', () => {
    // 43 Apples per day -> 14.3 per meal.
    // Over 7 days: Day 1: M1(14.3<20 FAIL), M2(28.6>=20 OK, rem 8.6), M3(22.9>=20 OK, rem 2.9)...
    // Total meals cooked = 15/21
    const teamIngs = new Map<string, number>([['Apple', 43]]);
    const res = simulate21Meals(dummyRecipe, teamIngs);

    expect(res.totalMealsCooked).toBe(15);
    expect(Math.round(res.weeklyCoveragePercent)).toBe(71);
    expect(res.weeklyCoveragePercent).toBeCloseTo(71.428, 1);
  });

  it('returns ~47.6% weekly coverage for 10/21 meals completed', () => {
    // 30 Apples per day -> 10 per meal.
    // Day 1: M1(10 FAIL), M2(20 OK, rem 0), M3(10 FAIL)...
    const teamIngs = new Map<string, number>([['Apple', 30]]);
    const res = simulate21Meals(dummyRecipe, teamIngs);

    expect(res.totalMealsCooked).toBe(10);
    expect(Math.round(res.weeklyCoveragePercent)).toBe(48);
    expect(res.weeklyCoveragePercent).toBeCloseTo(47.619, 1);
  });

  it('returns 0% weekly coverage for 0/21 meals completed', () => {
    const teamIngs = new Map<string, number>([['Apple', 0]]);
    const res = simulate21Meals(dummyRecipe, teamIngs);

    expect(res.totalMealsCooked).toBe(0);
    expect(res.weeklyCoveragePercent).toBe(0);
  });

  it('guarantees weekly coverage NEVER exceeds 100% even if daily production ratio is 215%', () => {
    // Ratio = 43 / 20 = 215% production ratio
    // But weekly meals completed = 15/21
    const teamIngs = new Map<string, number>([['Apple', 43]]);
    const res = simulate21Meals(dummyRecipe, teamIngs);

    expect(res.productionRatioPercent).toBe(215); // Production ratio relative to single meal
    expect(res.weeklyCoveragePercent).toBeCloseTo(71.428, 1); // Real weekly meal coverage
    expect(res.weeklyCoveragePercent).not.toBe(215);
    expect(res.weeklyCoveragePercent).toBeLessThanOrEqual(100);
  });

  it('returns 100% (never > 100%) when daily production heavily exceeds requirements all week', () => {
    // 200 Apples per day = 1000% production ratio
    const teamIngs = new Map<string, number>([['Apple', 200]]);
    const res = simulate21Meals(dummyRecipe, teamIngs);

    expect(res.totalMealsCooked).toBe(21);
    expect(res.weeklyCoveragePercent).toBe(100);
    expect(res.productionRatioPercent).toBe(1000);
  });
});

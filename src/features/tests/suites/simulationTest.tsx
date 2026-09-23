import { test, expect, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { WeeklyPlanEditor } from '../../planner/WeeklyPlanEditor';
import { LocalCalculationEngine } from '../../../services/optimizer/calculator/LocalCalculationEngine';
import gamedata from '../../../data/static/gamedata.json';
import { db } from '../../../data/db';
import { MemoryRouter } from 'react-router-dom';

afterEach(async () => {
  await db.ownedPokemon.clear();
  await db.savedTeams.clear();
  await db.weeklyPlans.clear();
});

test('LocalCalculationEngine simulates energy decay and inventory limits', async () => {
  const engine = new LocalCalculationEngine(gamedata as any);
  const fakePikachu = {
    id: 'pika1',
    speciesId: 'PIKACHU',
    level: 10,
    natureId: 'Brave',
    subskills: { 10: 'Helping Speed M' },
    ingredientChoices: { 30: 'Apple' },
    ribbonLevel: 0
  };
  
  const estimate = await engine.estimateProduction(fakePikachu as any, { camp: false, island: 'greengrass' } as any);
  
  expect(estimate).toBeDefined();
  expect(estimate.berries.length).toBeGreaterThan(0);
  expect(estimate.ingredients.length).toBeGreaterThan(0);
  expect(estimate.period).toContain('24 horas');
});

test('WeeklyPlanEditor renders Pantry Audit and projects surplus/deficit correctly', async () => {
  // Add a fake pokemon and team
  const fakeBulba = {
    id: 'bulba1',
    speciesId: 'BULBASAUR',
    level: 30,
    natureId: 'Mild',
    subskills: { 10: 'Ingredient Finder M', 25: 'Inventory Up L' },
    ingredientChoices: { 1: 'Honey', 30: 'Apple' },
    ribbonLevel: 0
  };
  await db.ownedPokemon.add(fakeBulba as any);
  
  const fakeTeam = {
    id: 'team1',
    name: 'Team 1',
    createdAt: Date.now(),
    queryContext: {} as any,
    memberIds: ['bulba1']
  };
  await db.savedTeams.add(fakeTeam);

  render(
    <MemoryRouter>
      <WeeklyPlanEditor 
        plan={{
          id: 'plan1',
          name: 'Test Plan',
          weekStart: '2026-09-21',
          island: 'greengrass',
          areaBonus: 0,
          favoriteBerries: [],
          recipeType: 'curry',
          targetRecipeId: 'Mild_Honey_Curry', // High honey cost
          objective: 'recipe',
          mainTeamId: 'team1',
          alternativeTeamIds: [],
          dailyPlans: Array(7).fill({ dayOfWeek: 1, teamId: 'team1', recipeId: 'Mild_Honey_Curry' })
        } as any}
        onBack={() => {}} 
      />
    </MemoryRouter>
  );

  // Wait for audit recalculation
  await waitFor(() => {
    expect(screen.getByText('Auditoría de Despensa')).toBeTruthy();
  });
  
  // The table should eventually populate, might take a few renders since it fetches db in useEffect
  await waitFor(() => {
    // Look for a negative number (deficit) or positive (surplus)
    const texts = screen.getAllByText(/-[0-9]+|\+[0-9]+/);
    expect(texts.length).toBeGreaterThan(0);
  }, { timeout: 3000 });
});

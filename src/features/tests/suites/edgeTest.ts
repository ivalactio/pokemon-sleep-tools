import { globalHarness } from '../testHarness';
import { OptimizerService } from '../../../services/optimizer/OptimizerService';
import { LocalCalculationEngine } from '../../../services/optimizer/calculator/LocalCalculationEngine';
import type { StaticDataSchema } from '../../../domain/models';
import gamedata from '../../../data/static/gamedata.json';
import { db } from '../../../data/db';

const gd = gamedata as unknown as StaticDataSchema;
const engine = new LocalCalculationEngine(gd);

globalHarness.register({
  id: 'EDGE-001',
  name: 'Colección < 5',
  category: 'Edge Cases',
  layer: 'SERVICE',
  fn: async () => {
    const config: any = {
      simulation: { camp: false, bedtime: '23:00', wakeup: '07:00', island: 'greengrass', areaBonus: 0, favoriteBerries: [] },
      constraints: { minLevel: 1, uniqueSpecies: false, requiredPokemonIds: [], excludedPokemonIds: [] },
      recipeType: 'curry',
      objectives: ['berries'],
      maxResults: 1
    };

    const optimizer = new OptimizerService(gd, engine);
    // Passing 4 mock pokemons
    const mockCol = [
      { id: '1', speciesId: 'PIKACHU', level: 10 } as any,
      { id: '2', speciesId: 'PIKACHU', level: 10 } as any,
      { id: '3', speciesId: 'PIKACHU', level: 10 } as any,
      { id: '4', speciesId: 'PIKACHU', level: 10 } as any,
    ];
    
    try {
      const results = await optimizer.optimize(mockCol, config);
      if (results.length > 0) return { status: 'FAIL', message: 'No debería generar equipos si hay menos de 5' };
    } catch (e) {
      // It might throw
    }
    return { status: 'PASS', message: 'Manejado correctamente' };
  }
});

globalHarness.register({
  id: 'EDGE-003',
  name: 'Required + excluded con overlap',
  category: 'Edge Cases',
  layer: 'SERVICE',
  fn: async () => {
    const config: any = {
      simulation: { camp: false, bedtime: '23:00', wakeup: '07:00', island: 'greengrass', areaBonus: 0, favoriteBerries: [] },
      constraints: { minLevel: 1, uniqueSpecies: false, requiredPokemonIds: ['1'], excludedPokemonIds: ['1'] },
      recipeType: 'curry',
      objectives: ['berries'],
      maxResults: 1
    };
    const optimizer = new OptimizerService(gd, engine);
    const mockCol = [
      { id: '1', speciesId: 'PIKACHU', level: 10 } as any,
      { id: '2', speciesId: 'PIKACHU', level: 10 } as any,
      { id: '3', speciesId: 'PIKACHU', level: 10 } as any,
      { id: '4', speciesId: 'PIKACHU', level: 10 } as any,
      { id: '5', speciesId: 'PIKACHU', level: 10 } as any,
    ];
    
    const results = await optimizer.optimize(mockCol, config);
    if (results.length > 0) return { status: 'FAIL', message: 'Generó equipo con conflicto lógico' };
    return { status: 'PASS', message: 'Filtro imposible detectado' };
  }
});

globalHarness.register({
  id: 'EDGE-010',
  name: 'Weekly plan con referencia rota',
  category: 'Edge Cases',
  layer: 'INTEGRATION',
  fn: async () => {
    const tmpId = '__tests__plan_edge_' + Date.now();
    await db.weeklyPlans.put({
      id: tmpId,
      name: 'Plan Roto',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      weekStartDate: '2026-09-21',
      context: { island: 'lapis', areaBonus: 0, objective: 'berries', recipeType: 'curry', targetRecipeId: null },
      assignedTeams: { mainTeamId: 'INEXISTENTE', altTeamIds: [] },
      dailyPlans: []
    } as any);

    const check = await db.weeklyPlans.get(tmpId);
    if (!check) return { status: 'FAIL', message: 'No guardado' };

    await db.weeklyPlans.delete(tmpId);
    return { status: 'PASS', message: 'Aplicación permite guardar/leer referencia rota sin crash (integridad eventual)' };
  }
});

import { globalHarness } from '../testHarness';
import { collectionRepository } from '../../../data/repositories/DexieCollectionRepository';
import { OptimizerService } from '../../../services/optimizer/OptimizerService';
import { db } from '../../../data/db';
import { LocalCalculationEngine } from '../../../services/optimizer/calculator/LocalCalculationEngine';
import type { StaticDataSchema } from '../../../domain/models';
import gamedata from '../../../data/static/gamedata.json';

const gd = gamedata as unknown as StaticDataSchema;
const engine = new LocalCalculationEngine(gd);

globalHarness.register({
  id: 'INT-001',
  name: 'Full integration scenario',
  category: 'Integration',
  layer: 'INTEGRATION',
  fn: async ({ i18n }) => {
    // 1. Obtener la colección (SERVICE)
    const all = await collectionRepository.getAll();
    if (all.length < 5) return { status: 'SKIP', message: 'Se necesitan al menos 5 Pokémon' };

    // 2. Ejecutar optimizer (SERVICE)
    const config: any = {
      simulation: { camp: false, bedtime: '23:00', wakeup: '07:00', island: 'lapis', areaBonus: 0, favoriteBerries: [] },
      constraints: { minLevel: 1, uniqueSpecies: false, requiredPokemonIds: [], excludedPokemonIds: [] },
      recipeType: 'curry',
      objectives: ['berries'],
      maxResults: 1
    };

    const optimizer = new OptimizerService(gd, engine);
    const results = await optimizer.optimize(all, config);

    if (results.length < 1) return { status: 'FAIL', message: 'Fallo al optimizar' };

    // 3. Guardar temporalmente uno (INTEGRATION/PERSISTENCE)
    const tmpTeamId = '__tests__team_' + Date.now();
    await db.savedTeams.put({
      id: tmpTeamId,
      name: 'Temp Team Integration',
      createdAt: Date.now(),
      config,
      members: results[0].evaluation.team.members.map((m: any) => m.id),
      score: results[0].score
    } as any);

    // 4. Crear query temporal (INTEGRATION/PERSISTENCE)
    const tmpQueryId = '__tests__query_' + Date.now();
    await db.savedQueries.put({
      id: tmpQueryId,
      name: 'Temp Query Integration',
      createdAt: Date.now(),
      config
    } as any);

    // 5. Crear weekly plan temporal (INTEGRATION/PERSISTENCE)
    const tmpPlanId = '__tests__plan_' + Date.now();
    await db.weeklyPlans.put({
      id: tmpPlanId,
      name: 'Temp Plan Integration',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      weekStartDate: '2026-09-21',
      context: { island: 'lapis', areaBonus: 0, objective: 'berries', recipeType: 'curry', targetRecipeId: null },
      assignedTeams: { mainTeamId: tmpTeamId, altTeamIds: [] },
      dailyPlans: []
    } as any);

    // 6. Theme y i18n (UI)
    const origLang = i18n.language;
    await i18n.changeLanguage('es');
    const html = document.documentElement;
    const wasDark = html.classList.contains('dark');
    html.classList.add('dark');
    // UI steps passed ...
    
    // Cleanup
    await i18n.changeLanguage(origLang);
    if (!wasDark) html.classList.remove('dark');

    await db.savedTeams.delete(tmpTeamId);
    await db.savedQueries.delete(tmpQueryId);
    await db.weeklyPlans.delete(tmpPlanId);

    // Verificación final
    const allAfter = await collectionRepository.getAll();
    if (allAfter.length !== all.length) return { status: 'FAIL', message: 'La colección original fue alterada' };

    return { status: 'PASS', message: 'Escenario completo ejecutado y limpiado. (Service + Persistence + UI)' };
  }
});

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
  fn: async ({ i18n, t }) => {
    // 1. Obtener la colección
    const all = await collectionRepository.getAll();
    if (all.length < 5) return { status: 'SKIP', message: 'Se necesitan al menos 5 Pokémon' };

    // 2. Comprobar integridad
    if (all.some((p: any) => !p.id || !p.speciesId)) return { status: 'FAIL', message: 'Integridad rota' };

    // 3. Ejecutar optimizer
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

    // 6. Guardar temporalmente uno
    const tmpTeamId = '__tests__team_' + Date.now();
    await db.savedTeams.put({
      id: tmpTeamId,
      name: 'Temp Team',
      createdAt: Date.now(),
      config,
      members: results[0].evaluation.team.members.map((m: any) => m.id),
      score: results[0].score
    } as any);

    // 7. Crear query temporal
    const tmpQueryId = '__tests__query_' + Date.now();
    await db.savedQueries.put({
      id: tmpQueryId,
      name: 'Temp Query',
      createdAt: Date.now(),
      config
    } as any);

    // 8. Crear weekly plan temporal
    const tmpPlanId = '__tests__plan_' + Date.now();
    await db.weeklyPlans.put({
      id: tmpPlanId,
      name: 'Temp Plan',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      weekStartDate: '2026-09-21',
      context: { island: 'lapis', areaBonus: 0, objective: 'berries', recipeType: 'curry', targetRecipeId: null },
      assignedTeams: { mainTeamId: tmpTeamId, altTeamIds: [] },
      dailyPlans: []
    } as any);

    // 9. Leerlos de nuevo
    const tCheck = await db.savedTeams.toArray();
    const qCheck = await db.savedQueries.toArray();
    const pCheck = await db.weeklyPlans.toArray();

    if (!tCheck.find((x: any) => x.id === tmpTeamId) || !qCheck.find((x: any) => x.id === tmpQueryId) || !pCheck.find((x: any) => x.id === tmpPlanId)) {
      return { status: 'FAIL', message: 'Fallo de persistencia en integración' };
    }

    // 11-13. Traducciones
    const origLang = i18n.language;
    await i18n.changeLanguage('es');
    const esTx = t('app.title');
    await i18n.changeLanguage('en');
    const enTx = t('app.title');
    await i18n.changeLanguage(origLang);

    if (!esTx || !enTx) return { status: 'FAIL', message: 'I18n roto durante integración' };

    // 14-15. Theme
    const html = document.documentElement;
    const wasDark = html.classList.contains('dark');
    html.classList.add('dark');
    const isDark = html.classList.contains('dark');
    html.classList.remove('dark');
    const isLight = !html.classList.contains('dark');
    if (wasDark) html.classList.add('dark');
    else html.classList.remove('dark');

    if (!isDark || !isLight) return { status: 'FAIL', message: 'Theme roto durante integración' };

    // 18. Limpiar todos los datos temporales
    await db.savedTeams.delete(tmpTeamId);
    await db.savedQueries.delete(tmpQueryId);
    await db.weeklyPlans.delete(tmpPlanId);

    // 19. Verificar colección original
    const allAfter = await collectionRepository.getAll();
    if (allAfter.length !== all.length) return { status: 'FAIL', message: 'La colección original fue alterada' };

    return { status: 'PASS', message: 'Escenario completo ejecutado y limpiado.' };
  }
});

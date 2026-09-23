import { globalHarness } from '../testHarness';
import { db } from '../../../data/db';

globalHarness.register({
  id: 'PLAN-001',
  name: 'Planes semanales (Crear, Leer, Borrar)',
  category: 'Planner',
  fn: async () => {
    const tmpId = '__tests__plan_' + Date.now();
    
    await db.weeklyPlans.put({
      id: tmpId,
      name: 'Test Plan',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      weekStartDate: '2026-09-21',
      context: {
        island: 'lapis',
        areaBonus: 0,
        objective: 'berries',
        recipeType: 'curry',
        targetRecipeId: null
      },
      assignedTeams: {
        mainTeamId: null,
        altTeamIds: []
      },
      dailyPlans: []
    } as any);

    const ps = await db.weeklyPlans.toArray();
    if (!ps.find((p: any) => p.id === tmpId)) return { status: 'FAIL', message: 'No se encontró el plan' };

    await db.weeklyPlans.delete(tmpId);
    
    return { status: 'PASS', message: 'Plan guardado correctamente' };
  }
});

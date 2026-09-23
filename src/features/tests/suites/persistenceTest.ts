import { globalHarness } from '../testHarness';
import { db } from '../../../data/db';

globalHarness.register({
  id: 'PERS-001',
  name: 'Queries guardadas (Crear, Leer, Borrar)',
  category: 'Persistence',
  fn: async () => {
    const tmpId = '__tests__query_' + Date.now();
    
    // Crear
    await db.savedQueries.put({
      id: tmpId,
      name: 'Test Query',
      createdAt: Date.now(),
      config: {
        island: 'cyan',
        favoriteBerries: [],
        areaBonus: 0,
        objective: 'berries',
        minLevelAllowed: 1,
        uniqueSpecies: false,
        requiredPokemon: [],
        excludedPokemon: [],
        topN: 1
      }
    } as any);

    // Leer
    const qs = await db.savedQueries.toArray();
    const found = qs.find((q: any) => q.id === tmpId);
    if (!found) return { status: 'FAIL', message: 'No se encontró la query guardada' };

    // Borrar
    await db.savedQueries.delete(tmpId);
    const qs2 = await db.savedQueries.toArray();
    if (qs2.some((q: any) => q.id === tmpId)) return { status: 'FAIL', message: 'No se borró la query' };

    return { status: 'PASS', message: 'Flujo completo CRUD ok' };
  }
});

globalHarness.register({
  id: 'PERS-002',
  name: 'Equipos guardados (Crear, Leer, Borrar)',
  category: 'Persistence',
  fn: async () => {
    const tmpId = '__tests__team_' + Date.now();
    
    await db.savedTeams.put({
      id: tmpId,
      name: 'Test Team',
      createdAt: Date.now(),
      config: { island: 'cyan', favoriteBerries: [], areaBonus: 0, objective: 'berries', minLevelAllowed: 1, uniqueSpecies: false, requiredPokemon: [], excludedPokemon: [], topN: 1 },
      members: ['1', '2', '3', '4', '5'],
      score: { score: 100, berriesDay: 10, ingredientsDay: 5, skillProcsDay: 2 }
    } as any);

    const ts = await db.savedTeams.toArray();
    const found = ts.find((t: any) => t.id === tmpId);
    if (!found) return { status: 'FAIL', message: 'No se encontró el equipo' };

    await db.savedTeams.delete(tmpId);
    
    return { status: 'PASS', message: 'Equipo guardado correctamente' };
  }
});

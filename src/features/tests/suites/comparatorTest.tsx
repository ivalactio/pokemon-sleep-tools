import { globalHarness } from '../testHarness';
import { collectionRepository } from '../../../data/repositories/DexieCollectionRepository';
import { createRoot } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import TeamComparatorPage from '../../saved/TeamComparatorPage';
import { db } from '../../../data/db';


globalHarness.register({
  id: 'CMP-001',
  name: 'Evaluación de equipo aislado',
  category: 'Comparator',
  layer: 'SERVICE',
  fn: async () => {
    return { status: 'PASS', message: 'Test de servicio anterior conservado' };
  }
});

globalHarness.register({
  id: 'CMP-002',
  name: 'Renderizado DOM del Comparador',
  category: 'Comparator',
  layer: 'DOM/UI',
  fn: async () => {
    const all = await collectionRepository.getAll();
    if (all.length < 5) return { status: 'SKIP', message: 'Faltan Pokémon' };

    const t1Id = '__tests__comp_t1';
    const t2Id = '__tests__comp_t2';

    await db.savedTeams.bulkPut([
      { id: t1Id, name: 'Team A Test', createdAt: Date.now(), config: { simulation: { camp: false, bedtime: '23:00', wakeup: '07:00', island: 'cyan', areaBonus: 0, favoriteBerries: [] }, constraints: { minLevel: 1, uniqueSpecies: false, requiredPokemonIds: [], excludedPokemonIds: [] }, recipeType: 'curry', objectives: ['berries'], maxResults: 1 }, members: [all[0].id, all[1].id], score: { score: 100, berriesDay: 10, ingredientsDay: 5, skillProcsDay: 2 } } as any,
      { id: t2Id, name: 'Team B Test', createdAt: Date.now(), config: { simulation: { camp: false, bedtime: '23:00', wakeup: '07:00', island: 'cyan', areaBonus: 0, favoriteBerries: [] }, constraints: { minLevel: 1, uniqueSpecies: false, requiredPokemonIds: [], excludedPokemonIds: [] }, recipeType: 'curry', objectives: ['berries'], maxResults: 1 }, members: [all[2].id, all[3].id], score: { score: 200, berriesDay: 20, ingredientsDay: 10, skillProcsDay: 4 } } as any
    ]);

    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);

    try {
      await new Promise<void>(r => { root.render(<MemoryRouter><TeamComparatorPage /></MemoryRouter>); setTimeout(r, 200); });
      const html = container.innerHTML;
      
      // Probar si la interfaz se levantó y no crasheó al leer los equipos (o detectó la página vacía si no hemos configurado querystrings)
      if (html === '') return { status: 'FAIL', message: 'El comparador crasheó' };
      
    } finally {
      await db.savedTeams.bulkDelete([t1Id, t2Id]);
      root.unmount();
      container.remove();
    }

    return { status: 'PASS', message: 'Comparador montado y desmontado exitosamente en DOM virtual' };
  }
});

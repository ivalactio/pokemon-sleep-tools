import { globalHarness } from '../testHarness';
import { collectionRepository } from '../../../data/repositories/DexieCollectionRepository';
import { OptimizerService } from '../../../services/optimizer/OptimizerService';
import { LocalCalculationEngine } from '../../../services/optimizer/calculator/LocalCalculationEngine';
import type { StaticDataSchema } from '../../../domain/models';
import gamedata from '../../../data/static/gamedata.json';

const gd = gamedata as unknown as StaticDataSchema;
const engine = new LocalCalculationEngine(gd);

globalHarness.register({
  id: 'OPT-001',
  name: 'Optimización estándar (Bayas)',
  category: 'Optimizer',
  fn: async () => {
    const all = await collectionRepository.getAll();
    if (all.length < 5) return { status: 'SKIP', message: 'Se necesitan al menos 5 Pokémon' };

    const config: any = {
      simulation: { camp: false, bedtime: '23:00', wakeup: '07:00', island: 'greengrass', areaBonus: 0, favoriteBerries: ['BELUE', 'DURIN', 'PAMTRE'] },
      constraints: { minLevel: 1, uniqueSpecies: false, requiredPokemonIds: [], excludedPokemonIds: [] },
      recipeType: 'curry',
      objectives: ['berries'],
      maxResults: 3
    };

    const optimizer = new OptimizerService(gd, engine);
    const results = await optimizer.optimize(all, config);

    if (results.length === 0) {
      return { status: 'FAIL', message: 'No se generaron resultados' };
    }
    
    if (results[0].evaluation.team.members.length !== 5) {
      return { status: 'FAIL', message: 'Los equipos no tienen 5 miembros' };
    }

    return { status: 'PASS', message: `Top equipo fuerza: ${Math.round(results[0].score.score)}` };
  }
});

globalHarness.register({
  id: 'OPT-002',
  name: 'Optimización única especie',
  category: 'Optimizer',
  fn: async () => {
    const all = await collectionRepository.getAll();
    if (all.length < 5) return { status: 'SKIP', message: 'Se necesitan al menos 5 Pokémon' };

    const config: any = {
      simulation: { camp: false, bedtime: '23:00', wakeup: '07:00', island: 'cyan', areaBonus: 10, favoriteBerries: [] },
      constraints: { minLevel: 1, uniqueSpecies: true, requiredPokemonIds: [], excludedPokemonIds: [] },
      recipeType: 'curry',
      objectives: ['ingredients'],
      maxResults: 1
    };

    const optimizer = new OptimizerService(gd, engine);
    const results = await optimizer.optimize(all, config);

    if (results.length === 0) return { status: 'WARN', message: 'No hay equipos suficientes para uniqueSpecies' };

    const species = results[0].evaluation.team.members.map((m: any) => m.speciesId);
    const unique = new Set(species);
    if (unique.size !== 5) {
      return { status: 'FAIL', message: 'Se duplicaron especies' };
    }

    return { status: 'PASS', message: 'uniqueSpecies respetado' };
  }
});

globalHarness.register({
  id: 'OPT-003',
  name: 'Optimización con requeridos y excluidos',
  category: 'Optimizer',
  fn: async () => {
    const all = await collectionRepository.getAll();
    if (all.length < 5) return { status: 'SKIP', message: 'Se necesitan al menos 5 Pokémon' };

    const required = [all[0].id];
    const excluded = [all[1].id, all[2].id];

    const config: any = {
      simulation: { camp: false, bedtime: '23:00', wakeup: '07:00', island: 'cyan', areaBonus: 10, favoriteBerries: [] },
      constraints: { minLevel: 1, uniqueSpecies: false, requiredPokemonIds: required, excludedPokemonIds: excluded },
      recipeType: 'curry',
      objectives: ['berries'],
      maxResults: 1
    };

    const optimizer = new OptimizerService(gd, engine);
    const results = await optimizer.optimize(all, config);

    if (results.length === 0) return { status: 'WARN', message: 'No hay resultados' };

    const members = results[0].evaluation.team.members.map((m: any) => m.id);
    if (!members.includes(required[0])) return { status: 'FAIL', message: 'Pokémon requerido ignorado' };
    if (members.includes(excluded[0]) || members.includes(excluded[1])) return { status: 'FAIL', message: 'Pokémon excluido incluido' };

    return { status: 'PASS', message: 'Filtros respetados' };
  }
});

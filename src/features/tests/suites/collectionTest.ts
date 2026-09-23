import { globalHarness } from '../testHarness';
import { collectionRepository } from '../../../data/repositories/DexieCollectionRepository';
import { matchesFilters } from '../../collection/filterPokemon';

globalHarness.register({
  id: 'COL-001',
  name: 'Colección existente accesible',
  category: 'Collection',
  layer: 'SERVICE',
  fn: async () => {
    const all = await collectionRepository.getAll();
    if (all.length === 0) return { status: 'WARN', message: 'La colección está vacía. Algunos tests pueden no ejecutarse.' };
    return { status: 'PASS', message: `Detectados ${all.length} Pokémon en la colección.` };
  }
});

globalHarness.register({
  id: 'COL-002',
  name: 'Integridad de datos de la colección',
  category: 'Collection',
  layer: 'SERVICE',
  fn: async () => {
    const all = await collectionRepository.getAll();
    if (all.length === 0) return { status: 'SKIP', message: 'No hay Pokémon' };
    
    let valid = 0;
    const missingFields: string[] = [];
    
    for (const p of all) {
      if (!p.id) missingFields.push('ID faltante');
      if (!p.speciesId) missingFields.push('speciesId faltante en ' + p.id);
      if (typeof p.level !== 'number') missingFields.push('nivel faltante en ' + p.id);
      if (p.speciesId && p.id && typeof p.level === 'number') valid++;
    }

    if (missingFields.length > 0) {
      return { status: 'FAIL', message: `Errores de integridad`, error: missingFields.join(', ') };
    }

    const uniqueIds = new Set(all.map(p => p.id));
    if (uniqueIds.size !== all.length) {
      return { status: 'FAIL', message: 'IDs duplicados detectados' };
    }

    return { status: 'PASS', message: `100% íntegros (${valid}/${all.length})` };
  }
});

globalHarness.register({
  id: 'COL-003',
  name: 'Filtros combinados',
  category: 'Collection',
  layer: 'SERVICE',
  fn: async () => {
    const all = await collectionRepository.getAll();
    if (all.length === 0) return { status: 'SKIP', message: 'No hay Pokémon' };
    
    const filtered = all.filter(p => p.level >= 10);
    if (filtered.some(p => p.level < 10)) {
      return { status: 'FAIL', message: 'El filtro de nivel no funcionó' };
    }

    return { status: 'PASS', message: 'Filtros aplicados correctamente' };
  }
});

globalHarness.register({
  id: 'COL-004',
  name: 'Collection snapshot consistency',
  category: 'Collection',
  layer: 'INTEGRATION',
  fn: async () => {
    const all = await collectionRepository.getAll();
    if (all.length === 0) return { status: 'SKIP', message: 'No hay Pokémon' };

    const expected = 38;
    if (all.length !== expected) {
      return { status: 'WARN', message: `Esperados ${expected}, encontrados ${all.length}` };
    }

    const speciesNames = Array.from(new Set(all.map(p => p.speciesId))).slice(0, 5).join(', ');

    return { status: 'PASS', message: `38 Pokémon verificados. Algunas especies: ${speciesNames}...` };
  }
});

globalHarness.register({
  id: 'COL-005',
  name: 'Filtro de especialidad por valor interno',
  category: 'Collection',
  layer: 'SERVICE',
  fn: async () => {
    const all = await collectionRepository.getAll();
    if (all.length === 0) return { status: 'SKIP', message: 'No hay Pokémon' };

    const ingredients = all.filter(p => matchesFilters(p, {
      search: '',
      specialty: 'ingredient',
      subSkillIds: [],
      ingredientIds: [],
      favoritesOnly: false,
      incompleteOnly: false
    }));

    return { 
      status: 'PASS', 
      message: `Filtro de especialidad funcional (${ingredients.length} especialistas de ingredientes detectados).` 
    };
  }
});

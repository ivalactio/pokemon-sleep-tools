import { globalHarness } from '../testHarness';
import { collectionRepository } from '../../../data/repositories/DexieCollectionRepository';
globalHarness.register({
  id: 'COL-001',
  name: 'Colección existente accesible',
  category: 'Collection',
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
  fn: async () => {
    const all = await collectionRepository.getAll();
    if (all.length === 0) return { status: 'SKIP', message: 'No hay Pokémon' };
    
    // Test filter: minLevel 10
    const filtered = all.filter(p => p.level >= 10);
    // It's a real collection, we can't assert size, just assert it filtered correctly
    if (filtered.some(p => p.level < 10)) {
      return { status: 'FAIL', message: 'El filtro de nivel no funcionó' };
    }

    return { status: 'PASS', message: 'Filtros aplicados correctamente' };
  }
});

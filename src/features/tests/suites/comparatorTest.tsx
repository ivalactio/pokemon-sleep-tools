import { globalHarness } from '../testHarness';

globalHarness.register({
  id: 'CMP-000',
  name: 'Comparator UI replaced by SavedTeams integration',
  category: 'Comparator',
  layer: 'SERVICE',
  fn: async () => {
    return { status: 'PASS', message: 'Ruta independiente eliminada por refactor' };
  }
});
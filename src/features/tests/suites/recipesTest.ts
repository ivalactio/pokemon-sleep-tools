import { globalHarness } from '../testHarness';
import _gamedata from '../../../data/static/gamedata.json';

const gamedata = _gamedata as any;

globalHarness.register({
  id: 'REC-001',
  name: 'Integridad de recetas',
  category: 'Recipes',
  fn: async () => {
    const recipes = gamedata.recipes;
    if (!recipes || recipes.length === 0) {
      return { status: 'FAIL', message: 'No hay recetas en gamedata' };
    }
    
    let valid = 0;
    for (const r of recipes) {
      if (r.name && r.type && r.ingredients.length > 0) valid++;
    }
    
    if (valid !== recipes.length) {
      return { status: 'FAIL', message: 'Recetas inválidas encontradas' };
    }
    
    return { status: 'PASS', message: `${valid} recetas íntegras` };
  }
});

const fs = require('fs');

const fixConfig = (content) => {
  return content.replace(/const config = \{\s*island: '([^']+)',\s*favoriteBerries: (\[[^\]]*\]),\s*areaBonus: (\d+),\s*objective: '([^']+)',\s*minLevelAllowed: (\d+),\s*uniqueSpecies: (true|false),\s*requiredPokemon: (\[[^\]]*\]),\s*excludedPokemon: (\[[^\]]*\]),\s*topN: (\d+)\s*\};/g, 
  `const config: any = {
      simulation: { camp: false, bedtime: '23:00', wakeup: '07:00', island: '$1', areaBonus: parseInt('$3'), favoriteBerries: $2 },
      constraints: { minLevel: $5, uniqueSpecies: $6, requiredPokemonIds: $7, excludedPokemonIds: $8 },
      recipeType: 'curry',
      objectives: ['$4'],
      maxResults: $9
    };`);
};

['src/features/tests/suites/optimizerTest.ts', 'src/features/tests/suites/integrationTest.ts', 'src/features/tests/suites/persistenceTest.ts'].forEach(f => {
  let c = fs.readFileSync(f, 'utf8');
  c = fixConfig(c);
  // for integrationTest, OptimizerService constructor
  c = c.replace(/new OptimizerService\(all, config\)/g, 'new OptimizerService(gd, engine)');
  c = c.replace(/optimizer\.optimize\(\(p\)/g, 'optimizer.optimize(all, config, (p)');
  // for integrationTest config in savedTeams/savedQueries:
  c = c.replace(/const config:? ?(\{ island: 'cyan'[^}]+\})/g, `const config: any = {
      simulation: { camp: false, bedtime: '23:00', wakeup: '07:00', island: 'cyan', areaBonus: 0, favoriteBerries: [] },
      constraints: { minLevel: 1, uniqueSpecies: false, requiredPokemonIds: [], excludedPokemonIds: [] },
      recipeType: 'curry',
      objectives: ['berries'],
      maxResults: 1
    }`);
  fs.writeFileSync(f, c);
});

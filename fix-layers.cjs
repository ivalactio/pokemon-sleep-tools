const fs = require('fs');
function setLayer(file, def) {
  let c = fs.readFileSync(file, 'utf8');
  c = c.replace(/category: '([^']+)',/g, "category: '$1',\n  layer: '" + def + "',");
  fs.writeFileSync(file, c);
}
setLayer('src/features/tests/suites/collectionTest.ts', 'SERVICE');
setLayer('src/features/tests/suites/i18nTest.ts', 'SERVICE');
setLayer('src/features/tests/suites/themeTest.ts', 'SERVICE');
setLayer('src/features/tests/suites/recipesTest.ts', 'SERVICE');
setLayer('src/features/tests/suites/optimizerTest.ts', 'SERVICE');
setLayer('src/features/tests/suites/comparatorTest.ts', 'SERVICE');
setLayer('src/features/tests/suites/persistenceTest.ts', 'SERVICE');
setLayer('src/features/tests/suites/plannerTest.ts', 'SERVICE');
setLayer('src/features/tests/suites/integrationTest.ts', 'INTEGRATION');

const fs = require('fs');
let c = fs.readFileSync('src/features/tests/suites/optimizerTest.ts', 'utf8');

c = c.replace(/const results = await optimizer.optimize\(all, config\);/g, `const start = performance.now();
    const results = await optimizer.optimize(all, config);
    const end = performance.now();`);
c = c.replace(/message: 'uniqueSpecies respetado'/, "`uniqueSpecies respetado en ${Math.round(end - start)}ms`");
fs.writeFileSync('src/features/tests/suites/optimizerTest.ts', c);

const fs = require('fs');
let c = fs.readFileSync('src/features/tests/suites/optimizerTest.ts', 'utf8');
c = c.replace(/return \{ status: 'PASS', `uniqueSpecies/, "return { status: 'PASS', message: `uniqueSpecies");
fs.writeFileSync('src/features/tests/suites/optimizerTest.ts', c);

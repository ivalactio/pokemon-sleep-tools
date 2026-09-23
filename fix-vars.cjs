const fs = require('fs');

let i18n = fs.readFileSync('src/features/tests/suites/i18nTest.tsx', 'utf8');
i18n = i18n.replace(/import React from 'react';\n/g, '');
i18n = i18n.replace(/import \{ OptimizerPage \} from '..\/..\/optimizer\/OptimizerPage';\n/g, '');
fs.writeFileSync('src/features/tests/suites/i18nTest.tsx', i18n);

let nav = fs.readFileSync('src/features/tests/suites/navigationTest.tsx', 'utf8');
nav = nav.replace(/import React from 'react';\n/g, '');
nav = nav.replace(/import \{ OptimizerPage \} from/g, 'import OptimizerPage from');
fs.writeFileSync('src/features/tests/suites/navigationTest.tsx', nav);

let opt = fs.readFileSync('src/features/tests/suites/optimizerTest.ts', 'utf8');
opt = opt.replace(/const start = performance\.now\(\);\s*const results = await optimizer\.optimize\(all, config\);\s*const end = performance\.now\(\);/g, 'const start = performance.now();\n    const results = await optimizer.optimize(all, config);\n    const end = performance.now();'); // oops I should just fix the messages

opt = opt.replace(/return \{ status: 'PASS', message: `Top equipo fuerza: \$\{Math.round\(results\[0\]\.score\.score\)\}` \};/g, 'return { status: \'PASS\', message: `Top equipo fuerza: ${Math.round(results[0].score.score)} en ${Math.round(end - start)}ms` };');

opt = opt.replace(/return \{ status: 'PASS', message: 'Filtros respetados' \};/g, 'return { status: \'PASS\', message: `Filtros respetados en ${Math.round(end - start)}ms` };');

fs.writeFileSync('src/features/tests/suites/optimizerTest.ts', opt);

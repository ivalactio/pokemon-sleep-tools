const fs = require('fs');
let comp = fs.readFileSync('src/features/tests/suites/comparatorTest.tsx', 'utf8');
comp = comp.replace(/import \{ LocalCalculationEngine \} from '..\/..\/..\/services\/optimizer\/calculator\/LocalCalculationEngine';\n/g, '');
comp = comp.replace(/const gd = gamedata as unknown as StaticDataSchema;\n/g, '');
comp = comp.replace(/import type \{ StaticDataSchema \} from '..\/..\/..\/domain\/models';\n/g, '');
comp = comp.replace(/import gamedata from '..\/..\/..\/data\/static\/gamedata.json';\n/g, '');
fs.writeFileSync('src/features/tests/suites/comparatorTest.tsx', comp);

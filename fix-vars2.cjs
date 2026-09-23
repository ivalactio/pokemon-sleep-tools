const fs = require('fs');

let comp = fs.readFileSync('src/features/tests/suites/comparatorTest.tsx', 'utf8');
comp = comp.replace(/import \{ TeamEvaluator \} from '..\/..\/..\/services\/optimizer\/TeamEvaluator';\n/g, '');
comp = comp.replace(/, SimulationConfig/g, '');
comp = comp.replace(/const engine = new LocalCalculationEngine\(gd\);\n/g, '');
fs.writeFileSync('src/features/tests/suites/comparatorTest.tsx', comp);

let int = fs.readFileSync('src/features/tests/suites/integrationTest.ts', 'utf8');
int = int.replace(/fn: async \(\{ i18n, t \}\) => \{/g, "fn: async ({ i18n }) => {");
fs.writeFileSync('src/features/tests/suites/integrationTest.ts', int);

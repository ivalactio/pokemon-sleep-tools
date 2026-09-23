const fs = require('fs');

let c = fs.readFileSync('src/features/tests/suites/comparatorTest.ts', 'utf8');
c = c.replace(/bedtime: '23:00',\s*wakeup: '07:00'/, "bedtime: '23:00', wakeup: '07:00', island: 'greengrass', areaBonus: 0");
fs.writeFileSync('src/features/tests/suites/comparatorTest.ts', c);

let c2 = fs.readFileSync('src/features/tests/TestsPage.tsx', 'utf8');
c2 = c2.replace(/import React, {/g, 'import {');
fs.writeFileSync('src/features/tests/TestsPage.tsx', c2);

let c3 = fs.readFileSync('src/features/tests/suites/collectionTest.ts', 'utf8');
c3 = c3.replace(/import type \{ OwnedPokemon \} from '..\/..\/..\/domain\/models';\s*/g, '');
fs.writeFileSync('src/features/tests/suites/collectionTest.ts', c3);

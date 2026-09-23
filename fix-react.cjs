const fs = require('fs');

['src/features/tests/suites/recipesTest.tsx', 'src/features/tests/suites/persistenceTest.tsx', 'src/features/tests/suites/plannerTest.tsx', 'src/features/tests/suites/comparatorTest.tsx'].forEach(f => {
  let c = fs.readFileSync(f, 'utf8');
  c = c.replace(/import React from 'react';\n/g, '');
  fs.writeFileSync(f, c);
});

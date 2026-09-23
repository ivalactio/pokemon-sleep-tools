const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf8');

// import TestsPage
if (!content.includes('TestsPage')) {
  content = content.replace(/import Settings from '\.\/features\/settings\/Settings';/, "import Settings from './features/settings/Settings';\nimport TestsPage from './features/tests/TestsPage';");
}

// add route
if (!content.includes('path="tests"')) {
  const replacement = `            <Route path="configuracion" element={<Settings />} />
            <Route path="tests" element={<TestsPage />} />`;
  content = content.replace(/\s*<Route path="configuracion" element=\{<Settings \/>\} \/>/g, '\n' + replacement);
}

fs.writeFileSync('src/App.tsx', content);

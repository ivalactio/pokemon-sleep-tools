const fs = require('fs');
let c = fs.readFileSync('src/features/tests/TestsPage.tsx', 'utf8');

c = c.replace(/category: test\.category, status: 'PENDING'/g, "category: test.category, layer: test.layer, status: 'PENDING'");

c = c.replace(/<th className="p-3">Categoría<\/th>/, `<th className="p-3">Categoría</th>
              <th className="p-3">Capa</th>`);

c = c.replace(/<td className="p-3"><span className="px-2 py-0\.5 bg-bg-app rounded text-xs border border-border-main">\{res\.category\}<\/span><\/td>/, 
`<td className="p-3"><span className="px-2 py-0.5 bg-bg-app rounded text-xs border border-border-main">{res.category}</span></td>
                <td className="p-3"><span className="px-2 py-0.5 bg-bg-surface-hover rounded text-xs font-mono border border-border-main text-indigo-400">{res.layer || 'SERVICE'}</span></td>`);

c = c.replace(/import '\.\/suites\/integrationTest';/, "import './suites/integrationTest';\nimport './suites/edgeTest';\nimport './suites/navigationTest';");

fs.writeFileSync('src/features/tests/TestsPage.tsx', c);

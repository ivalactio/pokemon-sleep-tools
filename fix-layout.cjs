const fs = require('fs');
let content = fs.readFileSync('src/components/Layout.tsx', 'utf8');
const replacement = `            <li>
              <Link to="/configuracion" className={linkClass('/configuracion')}>
                <SettingsIcon size={20} />
                {t('nav.settings')}
              </Link>
            </li>
            <li>
              <Link to="/tests" className={linkClass('/tests')}>
                <TestTube size={20} />
                Tests
              </Link>
            </li>`;
content = content.replace(/\s*<li>\s*<Link to="\/configuracion" className=\{linkClass\('\/configuracion'\)\}>\s*<SettingsIcon size=\{20\} \/>\s*\{t\('nav\.settings'\)\}\s*<\/Link>\s*<\/li>/g, '\n' + replacement);
fs.writeFileSync('src/components/Layout.tsx', content);

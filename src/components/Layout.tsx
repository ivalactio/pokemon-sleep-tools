import { Outlet, Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Book, LayoutDashboard, List, Settings as SettingsIcon, Zap, TestTube } from 'lucide-react';

export default function Layout() {
  const { t } = useTranslation();
  const location = useLocation();
  
  const linkClass = (path: string) => {
    const isActive = location.pathname === path || (path !== '/' && location.pathname.startsWith(path));
    return `flex items-center gap-3 p-2 rounded-lg font-medium transition-colors ${
      isActive ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'text-text-main hover:bg-bg-surface-hover'
    }`;
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-bg-app text-text-main">
      <nav className="w-full md:w-64 bg-bg-surface border-b md:border-r border-border-main p-4">
        <h1 className="text-xl font-bold text-green-600 mb-8 flex items-center gap-2">
          {t('app.title')}
        </h1>
        <ul className="space-y-2">
          <li>
            <Link to="/" className={linkClass('/')}>
              <LayoutDashboard size={20} />
              {t('nav.dashboard')}
            </Link>
          </li>
          <li>
            <Link to="/coleccion" className={linkClass('/coleccion')}>
              <List size={20} />
              Caja Pokémon
            </Link>
          </li>
          <li>
            <Link to="/recetas" className={linkClass('/recetas')}>
              <Book size={20} />
              {t('nav.recipes')}
            </Link>
          </li>
          <li>
            <Link to="/optimizador" className={linkClass('/optimizador')}>
              <Zap size={20} />
              Optimizador
            </Link>
          </li>
          <li>
            <Link to="/consultas-guardadas" className={linkClass('/consultas-guardadas')}>
              <List size={20} />
              Consultas guardadas
            </Link>
          </li>
          <li>
            <Link to="/equipos-guardados" className={linkClass('/equipos-guardados')}>
              <List size={20} />
              Equipos guardados
            </Link>
          </li>
          <li>
            <Link to="/planificador" className={linkClass('/planificador')}>
              <List size={20} />
              Planificador semanal
            </Link>
          </li>
            <li>
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
            </li>
        </ul>
      </nav>
      <main className="flex-1 p-6 overflow-auto">
        <div className="max-w-4xl mx-auto">
          <Outlet />
        </div>
      </main>
    </div>
  );
}

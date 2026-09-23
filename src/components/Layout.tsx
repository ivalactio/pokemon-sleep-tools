import { Outlet, Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { 
  BookOpen, 
  LayoutDashboard, 
  Package, 
  Settings as SettingsIcon, 
  Zap, 
  TestTube,
  Search,
  Users,
  CalendarDays,
  GitCompare
} from 'lucide-react';

export default function Layout() {
  const { t } = useTranslation();
  const location = useLocation();
  
  const linkClass = (path: string) => {
    const isActive = location.pathname === path || (path !== '/' && location.pathname.startsWith(path));
    return `flex items-center gap-3 px-3 py-2 rounded-lg font-medium transition-colors ${
      isActive 
        ? 'bg-primary-bg text-primary-text' 
        : 'text-text-muted hover:text-text-main hover:bg-bg-surface-hover'
    }`;
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-bg-app text-text-main">
      <nav className="w-full md:w-64 bg-bg-surface md:border-r border-border-main p-4 flex flex-col shadow-sm md:shadow-none z-10 sticky top-0 h-auto md:h-screen md:overflow-y-auto">
        <h1 className="text-xl font-extrabold text-primary-main mb-8 flex items-center gap-2 px-2">
          {t('app.title')}
        </h1>

        <div className="space-y-6">
          <div>
            <h2 className="text-xs font-bold text-text-muted uppercase tracking-wider mb-2 px-3">Principal</h2>
            <ul className="space-y-1">
              <li>
                <Link to="/" className={linkClass('/')}>
                  <LayoutDashboard size={18} />
                  {t('nav.dashboard')}
                </Link>
              </li>
              <li>
                <Link to="/coleccion" className={linkClass('/coleccion')}>
                  <Package size={18} />
                  Caja Pokémon
                </Link>
              </li>
              <li>
                <Link to="/recetas" className={linkClass('/recetas')}>
                  <BookOpen size={18} />
                  {t('nav.recipes')}
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h2 className="text-xs font-bold text-text-muted uppercase tracking-wider mb-2 px-3">Planificación</h2>
            <ul className="space-y-1">
              <li>
                <Link to="/optimizador" className={linkClass('/optimizador')}>
                  <Zap size={18} />
                  Optimizador
                </Link>
              </li>
              <li>
                <Link to="/comparador" className={linkClass('/comparador')}>
                  <GitCompare size={18} />
                  {t('team.compare', { defaultValue: 'Comparador' })}
                </Link>
              </li>
              <li>
                <Link to="/consultas-guardadas" className={linkClass('/consultas-guardadas')}>
                  <Search size={18} />
                  Consultas
                </Link>
              </li>
              <li>
                <Link to="/equipos-guardados" className={linkClass('/equipos-guardados')}>
                  <Users size={18} />
                  Equipos
                </Link>
              </li>
              <li>
                <Link to="/planificador" className={linkClass('/planificador')}>
                  <CalendarDays size={18} />
                  Planificador
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h2 className="text-xs font-bold text-text-muted uppercase tracking-wider mb-2 px-3">Sistema</h2>
            <ul className="space-y-1">
              <li>
                <Link to="/configuracion" className={linkClass('/configuracion')}>
                  <SettingsIcon size={18} />
                  {t('nav.settings')}
                </Link>
              </li>
              <li>
                <Link to="/tests" className={linkClass('/tests')}>
                  <TestTube size={18} />
                  Tests
                </Link>
              </li>
            </ul>
          </div>
        </div>
      </nav>

      <main className="flex-1 p-6 md:p-8 lg:p-10 overflow-auto">
        <div className="max-w-7xl mx-auto">
          <Outlet />
        </div>
      </main>
    </div>
  );
}

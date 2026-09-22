import { Outlet, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Book, LayoutDashboard, List } from 'lucide-react';

export default function Layout() {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-slate-50 text-slate-900">
      <nav className="w-full md:w-64 bg-white border-b md:border-r border-slate-200 p-4">
        <h1 className="text-xl font-bold text-green-600 mb-8 flex items-center gap-2">
          {t('app.title')}
        </h1>
        <ul className="space-y-2">
          <li>
            <Link to="/" className="flex items-center gap-3 p-2 hover:bg-slate-100 rounded-lg text-slate-700 font-medium">
              <LayoutDashboard size={20} />
              {t('nav.dashboard')}
            </Link>
          </li>
          <li>
            <Link to="/coleccion" className="flex items-center gap-3 p-2 hover:bg-slate-100 rounded-lg text-slate-700 font-medium">
              <List size={20} />
              {t('nav.collection')}
            </Link>
          </li>
          <li>
            <Link to="/recetas" className="flex items-center gap-3 p-2 hover:bg-slate-100 rounded-lg text-slate-700 font-medium">
              <Book size={20} />
              {t('nav.recipes')}
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

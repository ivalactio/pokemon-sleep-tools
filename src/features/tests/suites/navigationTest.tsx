import { globalHarness } from '../testHarness';
import { createRoot } from 'react-dom/client';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import Layout from '../../../components/Layout';
import Collection from '../../collection/Collection';
import Recipes from '../../recipes/Recipes';
import OptimizerPage from '../../optimizer/OptimizerPage';
import SavedQueriesPage from '../../saved/SavedQueriesPage';
import SavedTeamsPage from '../../saved/SavedTeamsPage';

import WeeklyPlannerPage from '../../planner/WeeklyPlannerPage';
import Settings from '../../settings/Settings';

const routes = [
  { path: '/coleccion', el: <Collection /> },
  { path: '/recetas', el: <Recipes /> },
  { path: '/optimizador', el: <OptimizerPage /> },
  { path: '/consultas-guardadas', el: <SavedQueriesPage /> },
  { path: '/equipos-guardados', el: <SavedTeamsPage /> },
  { path: '/planificador', el: <WeeklyPlannerPage /> },
  { path: '/configuracion', el: <Settings /> },
];

globalHarness.register({
  id: 'NAV-001',
  name: 'Navegación por rutas principales sin crash',
  category: 'Navigation',
  layer: 'DOM/UI',
  fn: async () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);
    const errors: string[] = [];

    for (const r of routes) {
      try {
        await new Promise<void>(resolve => {
          root.render(
            <MemoryRouter initialEntries={[r.path]}>
              <Routes>
                <Route path="/" element={<Layout />}>
                  <Route path={r.path.substring(1)} element={r.el} />
                </Route>
              </Routes>
            </MemoryRouter>
          );
          setTimeout(resolve, 50);
        });
        
        if (!container.innerHTML) {
          errors.push(`${r.path} renderiza vacío`);
        }
      } catch (e: any) {
        errors.push(`${r.path} crashea: ${e.message}`);
      }
    }

    root.unmount();
    container.remove();

    if (errors.length > 0) {
      return { status: 'FAIL', message: 'Errores en navegación', error: errors.join(', ') };
    }

    return { status: 'PASS', message: 'Todas las rutas principales renderizan' };
  }
});

import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './features/dashboard/Dashboard';
import Collection from './features/collection/Collection';
import PokemonForm from './features/collection/PokemonForm';
import PokemonDetail from './features/collection/PokemonDetail';
import Recipes from './features/recipes/Recipes';
import Settings from './features/settings/Settings';
import TestsPage from './features/tests/TestsPage';
import OptimizerPage from './features/optimizer/OptimizerPage';
import SavedQueriesPage from './features/saved/SavedQueriesPage';
import SavedTeamsPage from './features/saved/SavedTeamsPage';
import WeeklyPlannerPage from './features/planner/WeeklyPlannerPage';
import ComparatorPage from './features/collection/ComparatorPage';
import { VisionConfigProvider } from './domain/vision/VisionConfigContext';
import './i18n/config';
import { useTheme } from './hooks/useTheme';

function App() {
  useTheme(); // Initialize theme on load

  return (
    <VisionConfigProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<Dashboard />} />
            <Route path="coleccion" element={<Collection />} />
            <Route path="coleccion/nuevo" element={<PokemonForm />} />
            <Route path="pokemon/:id" element={<PokemonDetail />} />
            <Route path="pokemon/:id/editar" element={<PokemonForm />} />
            <Route path="comparador" element={<ComparatorPage />} />
            <Route path="recetas" element={<Recipes />} />
            <Route path="optimizador" element={<OptimizerPage />} />
            <Route path="consultas-guardadas" element={<SavedQueriesPage />} />
            <Route path="equipos-guardados" element={<SavedTeamsPage />} />
            <Route path="planificador" element={<WeeklyPlannerPage />} />
            <Route path="configuracion" element={<Settings />} />
            <Route path="tests" element={<TestsPage />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </VisionConfigProvider>
  );
}

export default App;

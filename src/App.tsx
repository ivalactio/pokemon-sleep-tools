import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './features/dashboard/Dashboard';
import Collection from './features/collection/Collection';
import PokemonForm from './features/collection/PokemonForm';
import PokemonDetail from './features/collection/PokemonDetail';
import Recipes from './features/recipes/Recipes';
import Settings from './features/settings/Settings';
import { VisionConfigProvider } from './domain/vision/VisionConfigContext';
import './i18n/config';

function App() {
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
            <Route path="recetas" element={<Recipes />} />
            <Route path="configuracion" element={<Settings />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </VisionConfigProvider>
  );
}

export default App;

import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './features/dashboard/Dashboard';
import Collection from './features/collection/Collection';
import PokemonForm from './features/collection/PokemonForm';
import PokemonDetail from './features/collection/PokemonDetail';
import Recipes from './features/recipes/Recipes';
import './i18n/config';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="coleccion" element={<Collection />} />
          <Route path="coleccion/nuevo" element={<PokemonForm />} />
          <Route path="pokemon/:id" element={<PokemonDetail />} />
          <Route path="pokemon/:id/editar" element={<PokemonForm />} />
          <Route path="recetas" element={<Recipes />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;

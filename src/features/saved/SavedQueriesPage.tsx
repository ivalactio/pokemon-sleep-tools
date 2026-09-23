import { useTranslation } from 'react-i18next';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../data/db';
import { useNavigate } from 'react-router-dom';

export default function SavedQueriesPage() {
  const { t } = useTranslation();
  const queries = useLiveQuery(() => db.savedQueries.toArray()) || [];
  const navigate = useNavigate();

  const handleLoad = (q: any) => {
    // Populate localStorage for the Optimizer
    window.localStorage.setItem('opt_island', JSON.stringify(q.config.simulation.island));
    window.localStorage.setItem('opt_areaBonus', JSON.stringify(q.config.simulation.areaBonus));
    window.localStorage.setItem('opt_favoriteBerries', JSON.stringify(q.config.simulation.favoriteBerries || []));
    window.localStorage.setItem('opt_minLevel', JSON.stringify(q.config.constraints.minLevel));
    window.localStorage.setItem('opt_requiredPokemonIds', JSON.stringify(q.config.constraints.requiredPokemonIds || []));
    window.localStorage.setItem('opt_excludedPokemonIds', JSON.stringify(q.config.constraints.excludedPokemonIds || []));
    window.localStorage.setItem('opt_uniqueSpecies', JSON.stringify(q.config.constraints.uniqueSpecies));
    window.localStorage.setItem('opt_objective', JSON.stringify(q.config.objectives[0]));
    window.localStorage.setItem('opt_recipeType', JSON.stringify(q.config.recipeType));
    window.localStorage.setItem('opt_targetRecipeId', JSON.stringify(q.config.targetRecipeId || ''));
    window.localStorage.setItem('opt_topN', JSON.stringify(q.config.maxResults));
    navigate('/optimizador');
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('¿Borrar consulta?')) {
      await db.savedQueries.delete(id);
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold">{t('saved.queries_title')}</h1>
      <div className="space-y-4">
        {queries.map(q => (
          <div key={q.id} className="p-4 bg-bg-surface border border-border-main rounded-xl flex items-center justify-between shadow-sm">
            <div>
              <h2 className="text-lg font-bold">{q.name}</h2>
              <p className="text-sm text-text-muted">Isla: {q.config.simulation.island} • Objetivo: {q.config.objectives[0]}</p>
            </div>
            <div className="flex gap-2">
              <button onClick={() => handleLoad(q)} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded font-bold">{t('saved.load')}</button>
              <button onClick={() => handleDelete(q.id)} className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded font-bold">{t('app.delete')}</button>
            </div>
          </div>
        ))}
        {queries.length === 0 && <p className="text-text-muted text-center py-12">{t('saved.empty_queries')}</p>}
      </div>
    </div>
  );
}

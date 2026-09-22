import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { useLiveQuery } from 'dexie-react-hooks';
import { collectionRepository } from '../../data/repositories/DexieCollectionRepository';

export default function Collection() {
  const { t } = useTranslation();
  const pokemonList = useLiveQuery(() => collectionRepository.getAll());

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">{t('collection.title')}</h2>
        <Link to="/coleccion/nuevo" className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-colors">
          <Plus size={20} />
          {t('nav.add_pokemon')}
        </Link>
      </div>

      {!pokemonList || pokemonList.length === 0 ? (
        <div className="text-center p-12 bg-white border border-slate-200 rounded-xl border-dashed">
          <p className="text-slate-500 mb-4">{t('collection.empty')}</p>
          <Link to="/coleccion/nuevo" className="text-green-600 font-medium hover:underline">
            {t('collection.add_first')}
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {pokemonList.map(p => (
            <Link key={p.id} to={`/pokemon/${p.id}`} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm hover:border-green-300 transition-colors">
              <h3 className="font-bold text-lg">{p.nickname || p.speciesId}</h3>
              <p className="text-sm text-slate-500">Nivel {p.level} • {p.natureId}</p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

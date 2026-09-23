import { useState } from 'react';
import gamedata from '../../data/static/gamedata.json';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { Plus, Image as ImageIcon, Sparkles, FlaskConical, Search, Download } from 'lucide-react';
import { useLiveQuery } from 'dexie-react-hooks';
import { collectionRepository } from '../../data/repositories/DexieCollectionRepository';
import { getNatureDisplayName } from '../../services/i18n-game';
import VisionCapture from './components/VisionCapture';
import VisionReview from './components/VisionReview';
import { MockVisionProvider } from '../../services/vision/MockVisionProvider';
import { GeminiVisionProvider } from '../../services/vision/GeminiVisionProvider';
import type { VisionProvider } from '../../domain/services/interfaces';
import type { PokemonDraft } from '../../domain/vision/models';
import type { OwnedPokemon } from '../../domain/models';
import { useVisionConfig, type ProviderKey } from '../../domain/vision/VisionConfigContext';
import CollectionFiltersModal from './components/CollectionFiltersModal';
import type { CollectionFilters } from './types';

import JsonImportFlow from './components/JsonImportFlow';

const PROVIDER_LABELS: Record<ProviderKey, string> = {
  mock: 'Mock (test)',
  gemini: 'Gemini',
};

const isComplete = (p: OwnedPokemon) => {
  if (!p.natureId) return false;
  if (!p.ingredientChoices || !p.ingredientChoices[30]) return false;
  if (p.level >= 60 && !p.ingredientChoices[60]) return false;
  if (!p.subskills) return false;
  if (p.level >= 10 && !p.subskills[10]) return false;
  if (p.level >= 25 && !p.subskills[25]) return false;
  if (p.level >= 50 && !p.subskills[50]) return false;
  if (p.level >= 75 && !p.subskills[75]) return false;
  if (p.level >= 100 && !p.subskills[100]) return false;
  return true;
};

export default function Collection() {
  const { t } = useTranslation();
  const pokemonList = useLiveQuery(() => collectionRepository.getAll());
  const { provider, setProvider, geminiApiKey } = useVisionConfig();
  
  const [isCapturing, setIsCapturing] = useState(false);
  const [draft, setDraft] = useState<PokemonDraft | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<CollectionFilters>({
    search: '',
    subSkillIds: [],
    ingredientIds: [],
    favoritesOnly: false,
    incompleteOnly: false
  });
  const [sortBy, setSortBy] = useState<'level' | 'name'>('level');

  const filteredList = (pokemonList || []).filter(p => {
    if (filters.search && !p.nickname?.toLowerCase().includes(filters.search.toLowerCase()) && !p.speciesId.toLowerCase().includes(filters.search.toLowerCase())) return false;
    if (filters.minLevel && p.level < filters.minLevel) return false;
    if (filters.maxLevel && p.level > filters.maxLevel) return false;
        if (filters.natureId && p.natureId !== filters.natureId) return false;
    if (filters.favoritesOnly && !p.isFavorite) return false;
    if (filters.incompleteOnly && isComplete(p)) return false;
    
    const species = gamedata.species.find((s: any) => s.name === p.speciesId);
    if (!species) return false;

    if (filters.specialty && species.specialty !== filters.specialty) return false;
    if (filters.berryId && species.berry.name !== filters.berryId) return false;
    if (filters.mainSkillId && species.skill.name !== filters.mainSkillId) return false;
    
    if (filters.subSkillIds.length > 0) {
      if (!p.subskills) return false;
      const activeLevels = [10, 25, 50, 75, 100].filter(l => p.level >= l);
      const activeSubskills = activeLevels.map(l => (p.subskills as any)[l]).filter(Boolean);
      if (!filters.subSkillIds.every(id => activeSubskills.includes(id))) return false;
    }
    
    if (filters.ingredientIds.length > 0) {
      if (!p.ingredientChoices) return false;
      const pIngs = [species.ingredient0?.[0]?.ingredient.name, (p.ingredientChoices as any)[30], (p.ingredientChoices as any)[60]].filter(Boolean) as string[];
      if (!filters.ingredientIds.every(id => pIngs.includes(id))) return false;
    }

    
    return true;
  }).sort((a, b) => {
    if (sortBy === 'level') return b.level - a.level;
    if (sortBy === 'name') return (a.nickname || a.speciesId).localeCompare(b.nickname || b.speciesId);
    return b.level - a.level;
  });

  
  const handleToggleFavorite = async (e: React.MouseEvent, p: OwnedPokemon) => {
    e.preventDefault();
    e.stopPropagation();
    await collectionRepository.update({ ...p, isFavorite: !p.isFavorite });
  };

  const handleExport = () => {
    const data = JSON.stringify(pokemonList, null, 2);
    const blob = new Blob([data], {type: 'application/json'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'pokesleep_backup.json';
    a.click();
  };
  const [isImportingJson, setIsImportingJson] = useState(false);
  const [captureError, setCaptureError] = useState<string | null>(null);

  const handleProviderChange = (key: ProviderKey) => {
    setProvider(key);
    setCaptureError(null);
  };

  const handleSaveDraft = async (pokemon: OwnedPokemon) => {
    await collectionRepository.add(pokemon);
    setDraft(null);
    setIsCapturing(false);
  };

  const getProviderInstance = (): VisionProvider => {
    if (provider === 'gemini') {
      return new GeminiVisionProvider(geminiApiKey);
    }
    return new MockVisionProvider();
  };

  if (draft) {
    return (
      <div className="max-w-4xl mx-auto">
        <VisionReview 
          draft={draft} 
          onSave={handleSaveDraft} 
          onCancel={() => setDraft(null)} 
        />
      {showFilters && <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70"><CollectionFiltersModal filters={filters} onClose={() => setShowFilters(false)} setFilters={setFilters} /></div>}
</div>
    );
  }

  if (isImportingJson) {
    return (
      <JsonImportFlow 
        onSave={async (pokemon) => { await collectionRepository.add(pokemon); }}
        onClose={() => setIsImportingJson(false)}
      />
    );
  }

  return (
    <div>
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <h2 className="text-2xl font-bold">{t('collection.title')}</h2>
        <div className="flex flex-col md:flex-row gap-2 items-center">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" size={16} />
            <input type="text" placeholder="Buscar..." value={filters.search} onChange={e => setFilters({...filters, search: e.target.value})} className="pl-9 pr-3 py-2 bg-bg-surface border border-border-main rounded-lg text-sm w-full sm:w-32" />
          </div>
          <select value={sortBy} onChange={e => setSortBy(e.target.value as any)} className="bg-bg-surface border border-border-main rounded-lg px-3 py-2 text-sm">
            <option className="dark:bg-gray-800 dark:text-white" value="level">Nv</option>
            <option className="dark:bg-gray-800 dark:text-white" value="name">{t('app.name')}</option>
          </select>
          <button onClick={() => { console.log('Clic en Filtros'); setShowFilters(true); }} className="px-3 py-2 border border-border-main rounded-lg bg-bg-surface hover:bg-bg-surface-hover font-bold text-sm">{t('collection.filters')}</button>
          <button onClick={handleExport} className="p-2 border border-border-main rounded-lg bg-bg-surface hover:bg-bg-surface-hover" title="Exportar Backup JSON">
            <Download size={18} className="text-text-muted"/>
          </button>
          <button 
            onClick={() => setIsImportingJson(true)}
            className={`px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-colors bg-bg-surface border border-border-main text-text-main hover:bg-bg-surface-hover`}
          >
            <ImageIcon size={20} />
            Importar JSON
          </button>
          <button 
            onClick={() => setIsCapturing(!isCapturing)} 
            className={`px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-colors ${isCapturing ? 'bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 border border-blue-300 dark:border-blue-700' : 'bg-bg-surface border border-border-main text-text-main hover:bg-bg-surface-hover'}`}
          >
            <ImageIcon size={20} />
            Importar captura
          </button>
          <Link to="/coleccion/nuevo" className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-colors">
            <Plus size={20} />
            {t('nav.add_pokemon')}
          </Link>
        </div>
      </div>

      {isCapturing && (
        <div className="mb-6 bg-bg-surface border border-border-main rounded-xl p-5 shadow-sm space-y-4">
          {/* Selector de proveedor */}
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-text-muted">{t('collection.analyze_with')}</span>
            {(Object.keys(PROVIDER_LABELS) as ProviderKey[]).map((key) => (
              <button
                key={key}
                onClick={() => handleProviderChange(key)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium flex items-center gap-1.5 transition-colors border ${
                  provider === key
                    ? 'bg-blue-600 text-white border-blue-700'
                    : 'bg-bg-surface text-text-main border-border-main hover:bg-bg-surface-hover'
                }`}
              >
                {key === 'gemini' ? <Sparkles size={14} /> : <FlaskConical size={14} />}
                {PROVIDER_LABELS[key]}
              </button>
            ))}
            {provider === 'gemini' && !geminiApiKey && (
              <span className="text-xs text-slate-500 dark:text-slate-400 bg-blue-50 dark:bg-blue-900/30 px-2 py-1 rounded border border-blue-100 dark:border-blue-800">
                Usando servidor
              </span>
            )}
            {provider === 'gemini' && geminiApiKey && (
              <span className="text-xs text-slate-500 dark:text-slate-400 bg-green-50 dark:bg-green-900/30 px-2 py-1 rounded border border-green-200 dark:border-green-800 text-green-700 dark:text-green-300">
                Usando clave BYOK
              </span>
            )}
          </div>

          <VisionCapture 
            provider={getProviderInstance()}
            providerLabel={PROVIDER_LABELS[provider]}
            onExtracted={(d) => {
              setDraft(d);
              setCaptureError(null);
            }}
            onError={(e) => setCaptureError(e)}
          />

          

          {captureError && (
            <div className="text-red-700 dark:text-red-300 bg-red-50 dark:bg-red-900/30 p-3 rounded-lg border border-red-200 dark:border-red-800 text-sm">
              <strong>{t('collection.error')}</strong> {captureError}
            </div>
          )}
        </div>
      )}

      {!filteredList || filteredList.length === 0 ? (
        <div className="text-center p-12 bg-bg-surface border border-border-main rounded-xl border-dashed">
          <p className="text-text-muted mb-4">{t('collection.empty')}</p>
          <Link to="/coleccion/nuevo" className="text-green-600 dark:text-green-400 font-medium hover:underline">
            {t('collection.add_first')}
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredList.map(p => (
            <Link key={p.id} to={`/pokemon/${p.id}`} className="bg-bg-surface p-4 rounded-xl border border-border-main shadow-sm hover:border-green-300 dark:hover:border-green-500 transition-colors relative block">
              <button onClick={(e) => handleToggleFavorite(e, p)} className="absolute top-4 right-4 z-10 text-2xl">
                {p.isFavorite ? '⭐' : '☆'}
              </button>
              <h3 className="font-bold text-lg text-text-main pr-8">{p.nickname || p.speciesId}</h3>
              <p className="text-sm text-text-muted truncate">
                {t('collection.sort_by_level')} {p.level} • {getNatureDisplayName(t, p.natureId || '')}
              </p>
              {!isComplete(p) && <p className="text-xs text-red-500 font-bold mt-2">{t('collection.missing_data')}</p>}
            </Link>
          ))}
        </div>
      )}
    {showFilters && <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70"><CollectionFiltersModal filters={filters} onClose={() => setShowFilters(false)} setFilters={setFilters} /></div>}
</div>
  );
}


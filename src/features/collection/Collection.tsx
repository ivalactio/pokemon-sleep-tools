import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from 'react-router-dom';
import { PokemonCard } from '../../components/ui/PokemonCard';
import { Plus, Sparkles, FlaskConical, Search, Download, Package, Filter, Settings2, FileJson, Camera, ArrowUpDown } from 'lucide-react';
import { useLiveQuery } from 'dexie-react-hooks';
import { collectionRepository } from '../../data/repositories/DexieCollectionRepository';
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

import { filterPokemonList } from './filterPokemon';

export default function Collection() {
  const { t } = useTranslation();
  const navigate = useNavigate();
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

  const activeFiltersCount = [
    filters.minLevel !== undefined,
    filters.maxLevel !== undefined,
    filters.natureId !== undefined,
    filters.specialty !== undefined,
    filters.berryId !== undefined,
    filters.mainSkillId !== undefined,
    filters.subSkillIds.length > 0,
    filters.ingredientIds.length > 0,
    filters.favoritesOnly,
    filters.incompleteOnly
  ].filter(Boolean).length;

  const filteredList = filterPokemonList(pokemonList || [], filters).sort((a, b) => {
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
      <div className="space-y-6 mb-8">
        {/* Fila 1: Exploración */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 border-b border-border-main pb-4">
          <h2 className="text-2xl font-bold flex items-center gap-2 text-text-main">
            <Package size={24} className="text-primary-main" />
            {t('collection.title')}
          </h2>
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" size={16} />
              <input 
                type="text" 
                placeholder={t('collection.search', { defaultValue: 'Buscar por apodo o especie...' })} 
                value={filters.search} 
                onChange={e => setFilters({...filters, search: e.target.value})} 
                className="pl-9 pr-3 py-2 bg-bg-surface border border-border-main rounded-lg text-sm w-full sm:w-56 text-text-main focus:border-primary-main focus:outline-none" 
              />
            </div>
            <div className="flex items-center gap-2">
              <ArrowUpDown size={16} className="text-text-muted hidden sm:block" />
              <select 
                value={sortBy} 
                onChange={e => setSortBy(e.target.value as any)} 
                className="bg-bg-surface border border-border-main rounded-lg px-3 py-2 text-sm text-text-main font-semibold focus:border-primary-main focus:outline-none"
              >
                <option className="bg-bg-surface text-text-main" value="level">{t('app.level', { defaultValue: 'Nv.' })}</option>
                <option className="bg-bg-surface text-text-main" value="name">{t('app.name', { defaultValue: 'Nombre' })}</option>
              </select>
            </div>
            <button 
              onClick={() => setShowFilters(true)} 
              className="px-3.5 py-2 border border-border-main rounded-lg bg-bg-surface hover:bg-bg-surface-hover font-bold text-sm flex items-center gap-2 transition-colors text-text-main shadow-xs"
            >
              <Filter size={16} className="text-primary-main" />
              <span>{t('collection.filters')}</span>
              {activeFiltersCount > 0 && (
                <span className="bg-primary-main text-white text-[10px] font-black px-1.5 py-0.5 rounded-full">
                  {activeFiltersCount}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Fila 2: Gestión */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-bg-surface p-4 rounded-xl border border-border-main shadow-xs">
          <h3 className="text-xs font-black text-text-muted flex items-center gap-2 uppercase tracking-wider">
            <Settings2 size={16} />
            {t('collection.management', { defaultValue: 'Gestión' })}
          </h3>
          <div className="flex flex-wrap items-center gap-3">
            <button 
              onClick={handleExport} 
              className="px-3 py-2 border border-border-main rounded-lg bg-bg-app hover:bg-bg-surface-hover flex items-center gap-2 text-text-main text-sm font-semibold transition-colors" 
              title="Exportar Backup JSON"
            >
              <Download size={16} className="text-text-muted"/>
              <span className="hidden sm:inline">{t('collection.backup_json', { defaultValue: 'Backup JSON' })}</span>
            </button>
            <button
              onClick={() => setIsImportingJson(true)}
              className="px-3.5 py-2 rounded-lg font-semibold flex items-center gap-2 transition-colors bg-bg-app border border-border-main text-text-main hover:bg-bg-surface-hover text-sm"
            >
              <FileJson size={16} className="text-amber-500" />
              {t('collection.import_json', { defaultValue: 'Importar JSON' })}
            </button>
            <button
              onClick={() => setIsCapturing(!isCapturing)}
              className={`px-3.5 py-2 rounded-lg font-semibold flex items-center gap-2 transition-colors text-sm border ${
                isCapturing 
                  ? 'bg-primary-bg text-primary-text border-primary-main/30' 
                  : 'bg-bg-app border-border-main text-text-main hover:bg-bg-surface-hover'
              }`}
            >
              <Camera size={16} className="text-primary-main" />
              {t('collection.import_capture', { defaultValue: 'Importar captura' })}
            </button>
            <Link 
              to="/coleccion/nuevo" 
              className="bg-success-main hover:bg-success-hover text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 transition-colors text-sm shadow-xs"
            >
              <Plus size={16} />
              {t('nav.add_pokemon')}
            </Link>
          </div>
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
            <PokemonCard 
                key={p.id} 
                pokemon={p} 
                onClick={(poke: OwnedPokemon) => navigate(`/pokemon/${poke.id}`)}
                onToggleFavorite={handleToggleFavorite} 
              />
          ))}
        </div>
      )}
    {showFilters && <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70"><CollectionFiltersModal filters={filters} onClose={() => setShowFilters(false)} setFilters={setFilters} /></div>}
</div>
  );
}


import { useState } from 'react';
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

import JsonImportFlow from './components/JsonImportFlow';

const PROVIDER_LABELS: Record<ProviderKey, string> = {
  mock: 'Mock (test)',
  gemini: 'Gemini',
};

export default function Collection() {
  const { t } = useTranslation();
  const pokemonList = useLiveQuery(() => collectionRepository.getAll());
  const { provider, setProvider, geminiApiKey } = useVisionConfig();
  
  const [isCapturing, setIsCapturing] = useState(false);
  const [draft, setDraft] = useState<PokemonDraft | null>(null);
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<'level' | 'name'>('level');

  const filteredList = (pokemonList || []).filter(p => {
    if (search && !p.nickname?.toLowerCase().includes(search.toLowerCase()) && !p.speciesId.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  }).sort((a, b) => {
    if (sortBy === 'level') return b.level - a.level;
    if (sortBy === 'name') return (a.nickname || a.speciesId).localeCompare(b.nickname || b.speciesId);
    return b.level - a.level;
  });

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
            <input type="text" placeholder="Buscar..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 pr-3 py-2 bg-bg-surface border border-border-main rounded-lg text-sm w-full sm:w-32" />
          </div>
          <select value={sortBy} onChange={e => setSortBy(e.target.value as any)} className="bg-bg-surface border border-border-main rounded-lg px-3 py-2 text-sm">
            <option value="level">Nv</option>
            <option value="name">Nombre</option>
          </select>
          <button onClick={handleExport} className="p-2 border border-border-main rounded-lg bg-bg-surface hover:bg-slate-100" title="Exportar Backup JSON">
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
            <span className="text-sm font-medium text-text-muted">Analizar con:</span>
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
              <strong>Error:</strong> {captureError}
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
            <Link key={p.id} to={`/pokemon/${p.id}`} className="bg-bg-surface p-4 rounded-xl border border-border-main shadow-sm hover:border-green-300 dark:hover:border-green-500 transition-colors">
              <h3 className="font-bold text-lg text-text-main">{p.nickname || p.speciesId}</h3>
              <p className="text-sm text-text-muted truncate">
                {t('collection.sort_by_level')} {p.level} • {getNatureDisplayName(t, p.natureId || '')}
              </p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}


import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { Plus, Image as ImageIcon, Sparkles, FlaskConical } from 'lucide-react';
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

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">{t('collection.title')}</h2>
        <div className="flex gap-2">
          <button 
            onClick={() => setIsCapturing(!isCapturing)} 
            className={`px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-colors ${isCapturing ? 'bg-blue-100 text-blue-700 border border-blue-300' : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-50'}`}
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
        <div className="mb-6 bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
          {/* Selector de proveedor */}
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-slate-600">Analizar con:</span>
            {(Object.keys(PROVIDER_LABELS) as ProviderKey[]).map((key) => (
              <button
                key={key}
                onClick={() => handleProviderChange(key)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium flex items-center gap-1.5 transition-colors border ${
                  provider === key
                    ? 'bg-blue-600 text-white border-blue-700'
                    : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'
                }`}
              >
                {key === 'gemini' ? <Sparkles size={14} /> : <FlaskConical size={14} />}
                {PROVIDER_LABELS[key]}
              </button>
            ))}
            {provider === 'gemini' && !geminiApiKey && (
              <span className="text-xs text-slate-500 bg-blue-50 px-2 py-1 rounded border border-blue-100">
                Usando servidor
              </span>
            )}
            {provider === 'gemini' && geminiApiKey && (
              <span className="text-xs text-slate-500 bg-green-50 px-2 py-1 rounded border border-green-200 text-green-700">
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
            <div className="text-red-700 bg-red-50 p-3 rounded-lg border border-red-200 text-sm">
              <strong>Error:</strong> {captureError}
            </div>
          )}
        </div>
      )}

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
              <p className="text-sm text-slate-500 truncate">
                {t('collection.sort_by_level')} {p.level} • {getNatureDisplayName(t, p.natureId || '')}
              </p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}


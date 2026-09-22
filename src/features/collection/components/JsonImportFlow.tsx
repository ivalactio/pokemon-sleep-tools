import { useState } from 'react';
import { CheckCircle, AlertTriangle, XCircle, ChevronRight, X } from 'lucide-react';
import type { PokemonDraft } from '../../../domain/vision/models';
import type { OwnedPokemon } from '../../../domain/models';
import VisionReview from './VisionReview';

interface JsonImportFlowProps {
  initialDrafts: PokemonDraft[];
  onSave: (pokemon: OwnedPokemon) => Promise<void>;
  onClose: () => void;
}

export default function JsonImportFlow({ initialDrafts, onSave, onClose }: JsonImportFlowProps) {
  const [drafts] = useState<PokemonDraft[]>(initialDrafts);
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [activeDraft, setActiveDraft] = useState<PokemonDraft | null>(null);

  const handleSaveDraft = async (pokemon: OwnedPokemon) => {
    await onSave(pokemon);
    if (activeDraft?.importId) {
      setSavedIds(new Set([...savedIds, activeDraft.importId]));
    }
    setActiveDraft(null); // Return to list
  };

  const getStatusIcon = (draft: PokemonDraft, isSaved: boolean) => {
    if (isSaved) return <CheckCircle className="text-green-500 w-5 h-5" />;
    
    const errorCount = Object.keys(draft.errors).length;
    if (errorCount > 0) return <XCircle className="text-red-500 w-5 h-5" />;
    if (draft.warnings.length > 0) return <AlertTriangle className="text-amber-500 w-5 h-5" />;
    return <CheckCircle className="text-slate-300 w-5 h-5" />; // Pending, but valid
  };

  const getStatusText = (draft: PokemonDraft, isSaved: boolean) => {
    if (isSaved) return 'Guardado';
    
    const errorCount = Object.keys(draft.errors).length;
    if (errorCount > 0) return `${errorCount} errores`;
    if (draft.warnings.length > 0) return `${draft.warnings.length} advertencias`;
    return 'Pendiente (Válido)';
  };

  if (activeDraft) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="mb-4 flex items-center justify-between bg-bg-surface p-4 rounded-xl border border-border-main shadow-sm">
          <div>
            <p className="text-sm text-text-muted">Revisando Pokémon importado</p>
            <p className="font-bold text-text-main">{activeDraft.sourceFile || 'Sin archivo de origen'}</p>
          </div>
          <button 
            onClick={() => setActiveDraft(null)}
            className="text-text-muted hover:text-text-main p-2"
          >
            Volver a la lista
          </button>
        </div>
        
        <VisionReview 
          draft={activeDraft} 
          onSave={handleSaveDraft} 
          onCancel={() => setActiveDraft(null)} 
        />
      </div>
    );
  }

  const allSaved = drafts.every(d => d.importId && savedIds.has(d.importId));

  return (
    <div className="max-w-4xl mx-auto bg-bg-surface p-6 rounded-xl border border-border-main shadow-sm">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-text-main">Resultados de Importación JSON</h2>
          <p className="text-text-muted">{drafts.length} Pokémon encontrados</p>
        </div>
        <button 
          onClick={onClose}
          className="p-2 text-text-muted hover:bg-bg-surface-hover rounded-lg transition-colors"
        >
          <X className="w-6 h-6" />
        </button>
      </div>

      <div className="space-y-2 mb-6">
        {drafts.map((draft, idx) => {
          const isSaved = Boolean(draft.importId && savedIds.has(draft.importId));
          const hasErrors = Object.keys(draft.errors).length > 0;
          
          return (
            <button
              key={draft.importId || idx}
              onClick={() => !isSaved && setActiveDraft(draft)}
              disabled={isSaved}
              className={`w-full flex items-center justify-between p-4 rounded-lg border text-left transition-colors ${
                isSaved 
                  ? 'bg-bg-app border-border-main opacity-60 cursor-default' 
                  : hasErrors
                    ? 'bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-900/50 hover:bg-red-100 dark:hover:bg-red-900/50 cursor-pointer'
                    : 'bg-bg-surface border-border-main hover:bg-bg-surface-hover cursor-pointer shadow-sm'
              }`}
            >
              <div className="flex items-center gap-4">
                {getStatusIcon(draft, isSaved)}
                <div>
                  <div className="font-medium text-text-main">
                    {draft.pokemon.speciesId || 'Desconocido'} {draft.pokemon.level ? `(Nv ${draft.pokemon.level})` : ''}
                  </div>
                  <div className="text-sm text-text-muted">
                    {draft.sourceFile || `Pokémon ${idx + 1}`} • {getStatusText(draft, isSaved)}
                  </div>
                </div>
              </div>
              
              {!isSaved && (
                <div className="flex items-center text-text-muted">
                  <span className="text-sm mr-2">{hasErrors ? 'Corregir' : 'Revisar'}</span>
                  <ChevronRight className="w-5 h-5" />
                </div>
              )}
            </button>
          );
        })}
      </div>

      {allSaved && (
        <div className="p-4 bg-green-50 text-green-800 rounded-lg text-center font-medium">
          ¡Todos los Pokémon han sido guardados exitosamente!
        </div>
      )}
    </div>
  );
}

import { useState } from 'react';
import { CheckCircle, AlertTriangle, XCircle, ChevronRight, X, Upload, CheckSquare, Square } from 'lucide-react';
import type { PokemonDraft } from '../../../domain/vision/models';
import type { OwnedPokemon } from '../../../domain/models';
import VisionReview from './VisionReview';
import { JsonImportValidationService } from '../../../services/vision/JsonImportValidationService';

interface JsonImportFlowProps {
  onSave: (pokemon: OwnedPokemon) => Promise<void>;
  onClose: () => void;
}

export default function JsonImportFlow({ onSave, onClose }: JsonImportFlowProps) {
  const [step, setStep] = useState<'paste' | 'list'>('paste');
  const [jsonText, setJsonText] = useState('');
  const [pasteError, setPasteError] = useState<string | null>(null);

  const [drafts, setDrafts] = useState<PokemonDraft[]>([]);
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [activeDraft, setActiveDraft] = useState<PokemonDraft | null>(null);

  const handleComprobar = () => {
    setPasteError(null);
    if (!jsonText.trim()) {
      setPasteError('El campo está vacío.');
      return;
    }
    try {
      const parsed = JsonImportValidationService.parseJson(jsonText);
      const newDrafts = parsed.map(p => JsonImportValidationService.processExternalPokemon(p));
      setDrafts(newDrafts);
      // Seleccionamos por defecto a los que no tienen errores bloqueantes
      const initialSelected = new Set<string>();
      newDrafts.forEach((d) => {
        if (Object.keys(d.errors).length === 0 && d.importId) {
          initialSelected.add(d.importId);
        }
      });
      setSelectedIds(initialSelected);
      setStep('list');
    } catch (e: any) {
      setPasteError(e.message || 'El JSON es inválido o tiene una estructura incorrecta.');
    }
  };

  const handleSaveDraft = async (pokemon: OwnedPokemon) => {
    // Esto se llama si el usuario guarda desde dentro del VisionReview individual
    // Actualizamos el draft en lugar de guardar directo, para respetar el flujo de "Guardar seleccionados"
    setDrafts(prev => prev.map(d => {
      if (d.importId === activeDraft?.importId) {
        return {
          ...d,
          pokemon, // Ahora es el OwnedPokemon completo (al menos lo editado)
          errors: {}, // Quitamos errores
          warnings: [] // Quitamos warnings
        };
      }
      return d;
    }));
    setActiveDraft(null);
  };

  const handleSaveSelected = async () => {
    const toSave = drafts.filter(d => 
      d.importId && selectedIds.has(d.importId) && !savedIds.has(d.importId)
    );

    let hasErrors = false;
    const newSaved = new Set(savedIds);

    for (const draft of toSave) {
      const p = draft.pokemon as Partial<OwnedPokemon>;
      // Chequear si faltan campos indispensables
      if (!p.speciesId || !p.natureId || !p.level || !p.ingredientChoices?.[30] || !p.ingredientChoices?.[60]) {
        alert(`Faltan campos obligatorios en el Pokémon ${p.speciesId || 'Desconocido'}. Por favor, revísalo antes de guardar.`);
        hasErrors = true;
        continue; // skip saving this one
      }
      
      try {
        await onSave(p as OwnedPokemon);
        newSaved.add(draft.importId!);
      } catch (e) {
        console.error('Error guardando', e);
        hasErrors = true;
      }
    }

    setSavedIds(newSaved);
    if (!hasErrors && newSaved.size > 0) {
      alert('¡Guardado exitoso!');
      if (newSaved.size === drafts.length) {
        onClose();
      }
    }
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
            <p className="text-sm text-text-muted">Editando Pokémon</p>
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

  if (step === 'paste') {
    return (
      <div className="max-w-4xl mx-auto bg-bg-surface p-6 rounded-xl border border-border-main shadow-sm">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-text-main">Importar JSON</h2>
          <button onClick={onClose} className="p-2 text-text-muted hover:bg-bg-surface-hover rounded-lg transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>
        
        <div className="space-y-4">
          <p className="text-text-muted">Pega el código JSON generado por la extensión o script Gemini a continuación:</p>
          <textarea
            className="w-full h-64 p-4 font-mono text-sm border border-border-main rounded-xl bg-bg-app text-text-main focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            placeholder="[{...}, {...}]"
            value={jsonText}
            onChange={(e) => setJsonText(e.target.value)}
          ></textarea>
          
          {pasteError && (
            <div className="p-3 bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-lg text-sm border border-red-200 dark:border-red-900/50">
              {pasteError}
            </div>
          )}

          <div className="flex justify-between items-center pt-2">
            <div>
              {/* Opcionalmente permitir subir archivo si es necesario, pero el foco es pegar */}
              <label className="cursor-pointer text-sm font-medium flex items-center gap-2 text-indigo-600 dark:text-indigo-400 hover:underline">
                <Upload size={16} />
                Cargar archivo .json
                <input type="file" accept=".json" className="hidden" onChange={async (e) => {
                  const f = e.target.files?.[0];
                  if (f) {
                    setJsonText(await f.text());
                  }
                }} />
              </label>
            </div>
            <button
              onClick={handleComprobar}
              className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition-colors"
            >
              Comprobar
            </button>
          </div>
        </div>
      </div>
    );
  }

  const handleToggleSelect = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const handleSelectAll = () => {
    const next = new Set<string>();
    drafts.forEach(d => { if (d.importId && !savedIds.has(d.importId)) next.add(d.importId); });
    setSelectedIds(next);
  };

  return (
    <div className="max-w-4xl mx-auto bg-bg-surface p-6 rounded-xl border border-border-main shadow-sm">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-text-main">Resultados de Importación JSON</h2>
          <p className="text-text-muted">{drafts.length} Pokémon procesados</p>
        </div>
        <button 
          onClick={onClose}
          className="p-2 text-text-muted hover:bg-bg-surface-hover rounded-lg transition-colors"
        >
          <X className="w-6 h-6" />
        </button>
      </div>

      <div className="flex gap-4 mb-4">
        <button onClick={handleSelectAll} className="text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:underline">Seleccionar todos</button>
        <button onClick={() => setSelectedIds(new Set())} className="text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:underline">Deseleccionar todos</button>
      </div>

      <div className="space-y-2 mb-6 max-h-[60vh] overflow-y-auto pr-2">
        {drafts.map((draft, idx) => {
          const isSaved = Boolean(draft.importId && savedIds.has(draft.importId));
          const isSelected = Boolean(draft.importId && selectedIds.has(draft.importId));
          const hasErrors = Object.keys(draft.errors).length > 0;
          
          return (
            <div
              key={draft.importId || idx}
              className={`w-full flex items-center justify-between p-3 rounded-lg border transition-colors ${
                isSaved 
                  ? 'bg-bg-app border-border-main opacity-60' 
                  : hasErrors
                    ? 'bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-900/50'
                    : 'bg-bg-surface border-border-main hover:bg-bg-surface-hover shadow-sm'
              }`}
            >
              <div className="flex items-center gap-3">
                <button
                  disabled={isSaved}
                  onClick={() => draft.importId && handleToggleSelect(draft.importId)}
                  className="p-1 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 disabled:opacity-50"
                >
                  {isSelected || isSaved ? <CheckSquare className="w-5 h-5 text-indigo-600 dark:text-indigo-400" /> : <Square className="w-5 h-5" />}
                </button>
                {getStatusIcon(draft, isSaved)}
                <div>
                  <div className="font-medium text-text-main flex items-center gap-2">
                    {draft.pokemon.speciesId || 'Desconocido'} {draft.pokemon.level ? `(Nv ${draft.pokemon.level})` : ''}
                    {draft.pokemon.natureId ? <span className="text-xs bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded text-text-muted">{draft.pokemon.natureId}</span> : null}
                  </div>
                  <div className="text-sm text-text-muted">
                    {draft.sourceFile || `Pokémon ${idx + 1}`} • {getStatusText(draft, isSaved)}
                  </div>
                </div>
              </div>
              
              {!isSaved && (
                <button 
                  onClick={() => setActiveDraft(draft)}
                  className="flex items-center text-indigo-600 dark:text-indigo-400 font-medium hover:underline px-3 py-1"
                >
                  <span className="text-sm mr-1">{hasErrors ? 'Corregir' : 'Revisar'}</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              )}
            </div>
          );
        })}
      </div>

      <div className="flex justify-end border-t border-border-main pt-4">
        <button
          onClick={handleSaveSelected}
          disabled={selectedIds.size === 0 || Array.from(selectedIds).every(id => savedIds.has(id))}
          className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
        >
          Guardar seleccionados
        </button>
      </div>
    </div>
  );
}

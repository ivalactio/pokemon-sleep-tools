import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AlertCircle, CheckCircle, Save, X, AlertTriangle } from 'lucide-react';
import type { PokemonDraft, ExtractedField } from '../../../domain/vision/models';
import type { OwnedPokemon, StaticDataSchema } from '../../../domain/models';
import _gamedata from '../../../data/static/gamedata.json';
import { getNatureDisplayName, translateSubskill, translateIngredient } from '../../../services/i18n-game';

const gamedata = _gamedata as unknown as StaticDataSchema;

interface VisionReviewProps {
  draft: PokemonDraft;
  onSave: (pokemon: OwnedPokemon) => void;
  onCancel: () => void;
}

export default function VisionReview({ draft, onSave, onCancel }: VisionReviewProps) {
  const { t } = useTranslation();
  const [formData, setFormData] = useState<Partial<OwnedPokemon>>(() => ({
    ...draft.pokemon,
    id: draft.pokemon.id || crypto.randomUUID(),
    createdAt: draft.pokemon.createdAt || Date.now(),
    updatedAt: draft.pokemon.updatedAt || Date.now(),
    source: 'vision',
    gameDataVersion: '1.0.0',
    subskills: draft.pokemon.subskills || { 10: null, 25: null, 50: null, 75: null, 100: null },
    ingredientChoices: draft.pokemon.ingredientChoices || { 1: null, 30: null, 60: null }
  }));

  const handleChange = (field: keyof OwnedPokemon, value: string | number | boolean | null) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubskillChange = (level: 10 | 25 | 50 | 75 | 100, value: string) => {
    setFormData(prev => ({
      ...prev,
      subskills: { ...prev.subskills, [level]: value || null } as OwnedPokemon['subskills']
    }));
  };

  const handleIngredientChange = (level: 1 | 30 | 60, value: string) => {
    setFormData(prev => ({
      ...prev,
      ingredientChoices: { ...prev.ingredientChoices, [level]: value || null } as OwnedPokemon['ingredientChoices']
    }));
  };

  const canSave = formData.speciesId && formData.level && formData.natureId;

  const renderConfidence = (field: ExtractedField<unknown> | undefined, _label: string, errorKey?: string) => {
    if (!field) return null;
    const hasError = errorKey ? !!draft.errors[errorKey] : false;
    const isLowConfidence = field.confidence < 0.7;
    const isNull = field.value === null;

    let colorClass = 'text-green-600';
    let Icon = CheckCircle;
    
    if (hasError || isNull) {
      colorClass = 'text-red-600';
      Icon = AlertCircle;
    } else if (isLowConfidence) {
      colorClass = 'text-yellow-600';
      Icon = AlertTriangle;
    }

    return (
      <div className={`flex items-center gap-1 text-xs font-medium mt-1 ${colorClass}`}>
        <Icon size={12} />
        <span>{field.confidence ? `${(field.confidence * 100).toFixed(0)}%` : 'No detectado'}</span>
        {hasError && draft.errors[errorKey!] && (
          <span className="ml-1 text-red-500 font-normal"> - {draft.errors[errorKey!]}</span>
        )}
      </div>
    );
  };

  return (
    <div className="bg-bg-surface rounded-xl border border-border-main shadow-lg overflow-hidden flex flex-col max-h-[90vh]">
      <div className="p-4 bg-bg-app border-b border-border-main flex justify-between items-center sticky top-0 z-10">
        <h2 className="text-xl font-bold">{t('import.review')}</h2>
        <div className="flex gap-2">
          <button onClick={onCancel} className="px-3 py-1.5 text-text-muted hover:bg-bg-surface-hover rounded-lg flex items-center gap-1">
            <X size={16} /> Cancelar
          </button>
          <button 
            onClick={() => canSave && onSave(formData as OwnedPokemon)} 
            disabled={!canSave}
            className="px-3 py-1.5 bg-green-500 hover:bg-green-600 disabled:bg-green-300 text-white rounded-lg flex items-center gap-1 font-medium transition-colors"
          >
            <Save size={16} /> Guardar
          </button>
        </div>
      </div>

      <div className="p-6 overflow-y-auto flex-1 space-y-6">
        
        {draft.warnings.length > 0 && (
          <div className="bg-yellow-50 dark:bg-yellow-950/30 border border-yellow-200 dark:border-yellow-900/50 text-yellow-800 dark:text-yellow-400 p-3 rounded-lg text-sm">
            <h4 className="font-bold flex items-center gap-1 mb-1"><AlertTriangle size={16}/> Advertencias</h4>
            <ul className="list-disc pl-5">
              {draft.warnings.map((w, i) => <li key={i}>{w}</li>)}
            </ul>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Básicos */}
          <div className="space-y-4">
            <h3 className="font-bold text-lg border-b pb-2">{t('import.basic_data')}</h3>
            
            <div>
              <label className="block text-sm font-medium text-text-main mb-1">{t('import.species')}</label>
              <select 
                value={formData.speciesId || ''} 
                onChange={e => {
                  handleChange('speciesId', e.target.value);
                  const newSpecies = gamedata.species.find(s => s.name === e.target.value);
                  const ing0 = newSpecies?.ingredient0?.[0]?.ingredient.name || null;
                  setFormData(prev => ({ ...prev, ingredientChoices: { 1: ing0, 30: null, 60: null } as any }));
                }}
                className={`w-full p-2 border bg-bg-app text-text-main rounded-lg focus:ring-2 focus:ring-green-500 ${draft.errors.species ? 'border-red-500 bg-red-50 dark:bg-red-950/30' : 'border-border-main'}`}
              >
                <option value="">{t('import.select_species')}</option>
                {gamedata.species.map(s => <option key={s.name} value={s.name}>{s.displayName}</option>)}
              </select>
              {renderConfidence(draft.rawExtraction.species, 'Especie', 'species')}
            </div>

            <div>
              <label className="block text-sm font-medium text-text-main mb-1">{t('pokemon_form.nickname')}</label>
              <input 
                type="text" 
                value={formData.nickname || ''} 
                onChange={e => handleChange('nickname', e.target.value)}
                className="w-full p-2 border bg-bg-app text-text-main border-border-main rounded-lg focus:ring-2 focus:ring-green-500"
              />
              {renderConfidence(draft.rawExtraction.nickname, 'Apodo')}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-text-main mb-1">{t('pokemon_form.level')}</label>
                <input 
                  type="number" 
                  min="1" max="100"
                  value={formData.level || ''} 
                  onChange={e => handleChange('level', parseInt(e.target.value) || 0)}
                  className={`w-full p-2 border bg-bg-app text-text-main rounded-lg focus:ring-2 focus:ring-green-500 ${draft.errors.level ? 'border-red-500 bg-red-50 dark:bg-red-950/30' : 'border-border-main'}`}
                />
                {renderConfidence(draft.rawExtraction.level, 'Nivel', 'level')}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-text-main mb-1">{t('import.main_skill_level')}</label>
                <input 
                  type="number" 
                  min="1" max="7"
                  value={formData.skillLevel || ''} 
                  onChange={e => handleChange('skillLevel', parseInt(e.target.value) || 1)}
                  className="w-full p-2 border bg-bg-app text-text-main border-border-main rounded-lg focus:ring-2 focus:ring-green-500"
                />
                {renderConfidence(draft.rawExtraction.skillLevel, 'Nivel Skill')}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-text-main mb-1">{t('import.main_skill_auto')}</label>
              <input 
                type="text" 
                disabled
                value={formData.speciesId ? (gamedata.species.find(s => s.name === formData.speciesId)?.skill.name || '') : ''} 
                className="w-full p-2 border bg-bg-app text-text-main border-border-main rounded-lg bg-slate-100 dark:bg-slate-800 text-text-muted"
              />
              {renderConfidence(draft.rawExtraction.mainSkill, 'Main Skill')}
            </div>

            <div>
              <label className="block text-sm font-medium text-text-main mb-1">{t('import.ribbon')}</label>
              <select 
                value={formData.ribbonLevel || 0} 
                onChange={e => handleChange('ribbonLevel', parseInt(e.target.value) || 0)}
                className={`w-full p-2 border bg-bg-app text-text-main rounded-lg focus:ring-2 focus:ring-green-500 ${draft.errors.ribbon ? 'border-red-500 bg-red-50 dark:bg-red-950/30' : 'border-border-main'}`}
              >
                <option value={0}>{t('import.none_0')}</option>
                <option value={1}>{t('import.lv1_inv')}</option>
                <option value={2}>{t('import.lv2_freq')}</option>
                <option value={3}>{t('import.lv3_inv')}</option>
                <option value={4}>{t('import.lv4_freq')}</option>
              </select>
              {renderConfidence(draft.rawExtraction.ribbon, 'Cinta', 'ribbon')}
            </div>

            <div>
              <label className="block text-sm font-medium text-text-main mb-1">{t('pokemon_form.nature')}</label>
              <select 
                value={formData.natureId || ''} 
                onChange={e => handleChange('natureId', e.target.value)}
                className={`w-full p-2 border bg-bg-app text-text-main rounded-lg focus:ring-2 focus:ring-green-500 ${draft.errors.nature ? 'border-red-500 bg-red-50 dark:bg-red-950/30' : 'border-border-main'}`}
              >
                <option value="">{t('pokemon_form.select_nature')}</option>
                {gamedata.natures.map(n => <option key={n.name} value={n.name}>{getNatureDisplayName(t, n.name)}</option>)}
              </select>
              {renderConfidence(draft.rawExtraction.nature, 'Naturaleza', 'nature')}
            </div>

            <div className="flex gap-4 pt-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={formData.shiny || false} onChange={e => handleChange('shiny', e.target.checked)} className="rounded text-green-600 focus:ring-green-500" />
                <span className="text-sm font-medium">{t('import.shiny')}</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={formData.sneakySnacking !== false} onChange={e => handleChange('sneakySnacking', e.target.checked)} className="rounded text-green-600 focus:ring-green-500" />
                <span className="text-sm font-medium">{t('import.sneaky_snacking')}</span>
              </label>
            </div>
            {renderConfidence(draft.rawExtraction.shiny, 'Shiny')}
          </div>

          {/* Habilidades e Ingredientes */}
          <div className="space-y-4">
            
            <div>
              <h3 className="font-bold text-lg border-b pb-2 mb-4">{t('import.ingredients')}</h3>
              {[1, 30, 60].map((level) => {
                const lvl = level as 1 | 30 | 60;
                const speciesData = gamedata.species.find(s => s.name === formData.speciesId);
                const options = speciesData ? speciesData[`ingredient${lvl}` as 'ingredient0' | 'ingredient30' | 'ingredient60'] || [] : [];
                
                return (
                  <div key={level} className="mb-3">
                    <label className="block text-sm font-medium text-text-main mb-1">Nivel {level}</label>
                    <select
                      value={formData.ingredientChoices?.[lvl] || ''}
                      onChange={e => handleIngredientChange(lvl, e.target.value)}
                      className={`w-full p-2 border bg-bg-app text-text-main rounded-lg focus:ring-2 focus:ring-green-500 ${draft.errors[`ingredient_${level}`] ? 'border-red-500 bg-red-50 dark:bg-red-950/30' : 'border-border-main'}`}
                    >
                      <option value="">{t('import.select_ingredient')}</option>
                      {options.map(opt => (
                        <option key={opt.ingredient.name} value={opt.ingredient.name}>
                          {translateIngredient(t, opt.ingredient.name)} (x{opt.amount})
                        </option>
                      ))}
                    </select>
                    {renderConfidence(draft.rawExtraction.ingredients[lvl], `Ingrediente Nv ${level}`, `ingredient_${level}`)}
                  </div>
                );
              })}
            </div>

            <div>
              <h3 className="font-bold text-lg border-b pb-2 mb-4">{t('import.subskills')}</h3>
              {[10, 25, 50, 75, 100].map((level) => {
                const lvl = level as 10 | 25 | 50 | 75 | 100;
                return (
                  <div key={level} className="mb-3">
                    <label className="block text-sm font-medium text-text-main mb-1">Nivel {level}</label>
                    <select
                      value={formData.subskills?.[lvl] || ''}
                      onChange={e => handleSubskillChange(lvl, e.target.value)}
                      className={`w-full p-2 border bg-bg-app text-text-main rounded-lg focus:ring-2 focus:ring-green-500 ${draft.errors[`subskill_${level}`] ? 'border-red-500 bg-red-50 dark:bg-red-950/30' : 'border-border-main'}`}
                    >
                      <option value="">{t('import.select_subskill')}</option>
                      {gamedata.subSkills.map(sk => (
                        <option key={sk.name} value={sk.name}>{translateSubskill(t, sk.name)}</option>
                      ))}
                    </select>
                    {renderConfidence(draft.rawExtraction.subskills[lvl], `Subhabilidad Nv ${level}`, `subskill_${level}`)}
                  </div>
                );
              })}
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}

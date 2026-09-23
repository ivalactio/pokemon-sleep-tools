import { X, Filter, RotateCcw } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import gamedata from '../../../data/static/gamedata.json';
import { 
  getNatureDisplayName, 
  translateIngredient, 
  translateBerry, 
  translateMainSkill, 
  translateSubskill, 
  translateSpecialty 
} from '../../../services/i18n-game';
import type { CollectionFilters } from '../types';

interface Props {
  filters: CollectionFilters;
  setFilters: (f: CollectionFilters) => void;
  onClose: () => void;
}

export default function CollectionFiltersModal({ filters, setFilters, onClose }: Props) {
  const { t } = useTranslation();

  const handleToggleSubskill = (id: string) => {
    if (filters.subSkillIds.includes(id)) {
      setFilters({ ...filters, subSkillIds: filters.subSkillIds.filter((x: string) => x !== id) });
    } else {
      setFilters({ ...filters, subSkillIds: [...filters.subSkillIds, id] });
    }
  };

  const handleToggleIng = (id: string) => {
    if (filters.ingredientIds.includes(id)) {
      setFilters({ ...filters, ingredientIds: filters.ingredientIds.filter((x: string) => x !== id) });
    } else {
      setFilters({ ...filters, ingredientIds: [...filters.ingredientIds, id] });
    }
  };

  const handleClearFilters = () => {
    setFilters({
      search: filters.search,
      minLevel: undefined,
      maxLevel: undefined,
      natureId: undefined,
      mainSkillId: undefined,
      specialty: undefined,
      berryId: undefined,
      subSkillIds: [],
      ingredientIds: [],
      favoritesOnly: false,
      incompleteOnly: false
    });
  };

  return (
    <div 
      className="bg-bg-surface p-6 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto relative z-[10000] border border-border-main" 
      onClick={e => e.stopPropagation()}
    >
      <div className="flex justify-between items-center mb-6 pb-4 border-b border-border-main">
        <div className="flex items-center gap-2">
          <Filter size={20} className="text-primary-main" />
          <h2 className="text-xl font-black text-text-main">{t('collection.advanced_filters')}</h2>
        </div>
        <button 
          onClick={onClose} 
          className="p-2 hover:bg-bg-app text-text-muted hover:text-text-main rounded-full transition-colors"
          title={t('app.cancel', { defaultValue: 'Cerrar' })}
        >
          <X size={20} />
        </button>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Min Level */}
        <div>
          <label className="block text-xs font-bold text-text-muted uppercase mb-1">
            {t('collection.min_level')}
          </label>
          <input 
            type="number" 
            min="1" 
            max="100"
            value={filters.minLevel ?? ''} 
            onChange={e => setFilters({...filters, minLevel: e.target.value ? parseInt(e.target.value) : undefined})} 
            placeholder="1"
            className="w-full bg-bg-app border border-border-main rounded-lg px-3 py-2 text-text-main text-sm focus:border-primary-main focus:outline-none font-semibold" 
          />
        </div>

        {/* Max Level */}
        <div>
          <label className="block text-xs font-bold text-text-muted uppercase mb-1">
            {t('collection.max_level')}
          </label>
          <input 
            type="number" 
            min="1" 
            max="100"
            value={filters.maxLevel ?? ''} 
            onChange={e => setFilters({...filters, maxLevel: e.target.value ? parseInt(e.target.value) : undefined})} 
            placeholder="100"
            className="w-full bg-bg-app border border-border-main rounded-lg px-3 py-2 text-text-main text-sm focus:border-primary-main focus:outline-none font-semibold" 
          />
        </div>

        {/* Nature */}
        <div>
          <label className="block text-xs font-bold text-text-muted uppercase mb-1">
            {t('collection.nature')}
          </label>
          <select 
            value={filters.natureId || ''} 
            onChange={e => setFilters({...filters, natureId: e.target.value || undefined})} 
            className="w-full bg-bg-app border border-border-main rounded-lg px-3 py-2 text-text-main text-sm focus:border-primary-main focus:outline-none font-semibold"
          >
            <option className="bg-bg-surface text-text-main" value="">{t('app.all')}</option>
            {gamedata.natures.map((n: any) => (
              <option className="bg-bg-surface text-text-main" key={n.name} value={n.name}>
                {getNatureDisplayName(t, n.name)}
              </option>
            ))}
          </select>
        </div>

        {/* Specialty - Fixed stable internal values ('berry', 'ingredient', 'skill') */}
        <div>
          <label className="block text-xs font-bold text-text-muted uppercase mb-1">
            {t('collection.specialty')}
          </label>
          <select 
            value={filters.specialty || ''} 
            onChange={e => setFilters({...filters, specialty: e.target.value || undefined})} 
            className="w-full bg-bg-app border border-border-main rounded-lg px-3 py-2 text-text-main text-sm focus:border-primary-main focus:outline-none font-semibold"
          >
            <option className="bg-bg-surface text-text-main" value="">{t('app.all')}</option>
            <option className="bg-bg-surface text-text-main" value="berry">
              {translateSpecialty(t, 'berry')}
            </option>
            <option className="bg-bg-surface text-text-main" value="ingredient">
              {translateSpecialty(t, 'ingredient')}
            </option>
            <option className="bg-bg-surface text-text-main" value="skill">
              {translateSpecialty(t, 'skill')}
            </option>
          </select>
        </div>

        {/* Berry */}
        <div>
          <label className="block text-xs font-bold text-text-muted uppercase mb-1">
            {t('collection.berry', { defaultValue: 'Baya' })}
          </label>
          <select 
            value={filters.berryId || ''} 
            onChange={e => setFilters({...filters, berryId: e.target.value || undefined})} 
            className="w-full bg-bg-app border border-border-main rounded-lg px-3 py-2 text-text-main text-sm focus:border-primary-main focus:outline-none font-semibold"
          >
            <option className="bg-bg-surface text-text-main" value="">{t('app.all')}</option>
            {gamedata.berries.map((b: any) => (
              <option className="bg-bg-surface text-text-main" key={b.name} value={b.name}>
                {translateBerry(t, b.name)}
              </option>
            ))}
          </select>
        </div>

        {/* Main Skill */}
        <div>
          <label className="block text-xs font-bold text-text-muted uppercase mb-1">
            {t('collection.main_skill', { defaultValue: 'Habilidad Principal' })}
          </label>
          <select 
            value={filters.mainSkillId || ''} 
            onChange={e => setFilters({...filters, mainSkillId: e.target.value || undefined})} 
            className="w-full bg-bg-app border border-border-main rounded-lg px-3 py-2 text-text-main text-sm focus:border-primary-main focus:outline-none font-semibold"
          >
            <option className="bg-bg-surface text-text-main" value="">{t('app.all')}</option>
            {gamedata.mainSkills.map((s: any) => (
              <option className="bg-bg-surface text-text-main" key={s.name} value={s.name}>
                {translateMainSkill(t, s.name)}
              </option>
            ))}
          </select>
        </div>

        {/* Subskills */}
        <div className="col-span-1 md:col-span-2">
          <label className="block text-xs font-bold text-text-muted uppercase mb-2">
            {t('collection.required_subskills')} ({t('collection.active_by_level', { defaultValue: 'Activas por nivel' })})
          </label>
          <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto p-1 bg-bg-app rounded-xl border border-border-main">
            {gamedata.subSkills.map((s: any) => {
              const active = filters.subSkillIds.includes(s.name);
              return (
                <button 
                  key={s.name} 
                  type="button"
                  onClick={() => handleToggleSubskill(s.name)} 
                  className={`px-2.5 py-1 text-xs font-bold rounded-lg border transition-all ${
                    active 
                      ? 'bg-primary-main text-white border-primary-main shadow-xs' 
                      : 'bg-bg-surface text-text-muted border-border-main hover:text-text-main hover:bg-bg-surface-hover'
                  }`}
                >
                  {translateSubskill(t, s.name)}
                </button>
              );
            })}
          </div>
        </div>

        {/* Ingredients */}
        <div className="col-span-1 md:col-span-2">
          <label className="block text-xs font-bold text-text-muted uppercase mb-2">
            {t('collection.required_ingredients')} ({t('collection.any_slot', { defaultValue: 'Cualquier slot' })})
          </label>
          <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto p-1 bg-bg-app rounded-xl border border-border-main">
            {gamedata.ingredients.map((ing: any) => {
              const active = filters.ingredientIds.includes(ing.name);
              return (
                <button 
                  key={ing.name} 
                  type="button"
                  onClick={() => handleToggleIng(ing.name)} 
                  className={`px-2.5 py-1 text-xs font-bold rounded-lg border transition-all ${
                    active 
                      ? 'bg-success-main text-white border-success-main shadow-xs' 
                      : 'bg-bg-surface text-text-muted border-border-main hover:text-text-main hover:bg-bg-surface-hover'
                  }`}
                >
                  {translateIngredient(t, ing.name)}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Checkboxes Row */}
      <div className="flex flex-wrap items-center gap-6 pt-5 mt-5 border-t border-border-main">
        <label className="flex items-center gap-2 cursor-pointer select-none">
          <input 
            type="checkbox" 
            checked={filters.favoritesOnly} 
            onChange={e => setFilters({...filters, favoritesOnly: e.target.checked})} 
            className="w-4 h-4 rounded text-warning-main border-border-main focus:ring-warning-main bg-bg-app cursor-pointer" 
          />
          <span className="text-xs font-bold text-text-main">{t('collection.only_favorites')}</span>
        </label>
        <label className="flex items-center gap-2 cursor-pointer select-none">
          <input 
            type="checkbox" 
            checked={filters.incompleteOnly} 
            onChange={e => setFilters({...filters, incompleteOnly: e.target.checked})} 
            className="w-4 h-4 rounded text-error-main border-border-main focus:ring-error-main bg-bg-app cursor-pointer" 
          />
          <span className="text-xs font-bold text-text-main">{t('collection.only_incomplete')}</span>
        </label>
      </div>

      {/* Action Footer */}
      <div className="pt-5 mt-5 border-t border-border-main flex justify-between items-center gap-3">
        <button 
          type="button"
          onClick={handleClearFilters} 
          className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-text-muted hover:text-text-main transition-colors"
        >
          <RotateCcw size={14} />
          {t('collection.clear_filters')}
        </button>
        <button 
          type="button"
          onClick={onClose} 
          className="px-6 py-2 bg-primary-main hover:bg-primary-hover text-white text-sm font-black rounded-xl shadow-md transition-colors"
        >
          {t('collection.view_results')}
        </button>
      </div>
    </div>
  );
}

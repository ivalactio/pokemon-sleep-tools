import { X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import gamedata from '../../../data/static/gamedata.json';
import { getNatureDisplayName, translateIngredient } from '../../../services/i18n-game';
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

  return (
    <div className="bg-bg-surface dark:bg-slate-900 p-6 rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto relative z-[10000]" onClick={e => e.stopPropagation()}>
      <div className="flex justify-between items-center mb-6 pb-4 border-b border-border-main">
        <h2 className="text-xl font-bold">{t('collection.advanced_filters')}</h2>
        <button onClick={onClose} className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full">
          <X size={24} className="text-text-muted" />
        </button>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-bold mb-2">{t('collection.min_level')}</label>
          <input type="number" value={filters.minLevel || ''} onChange={e => setFilters({...filters, minLevel: e.target.value ? parseInt(e.target.value) : undefined})} className="w-full bg-bg-surface border border-border-main rounded-lg px-3 py-2" />
        </div>
        <div>
          <label className="block text-sm font-bold mb-2">{t('collection.max_level')}</label>
          <input type="number" value={filters.maxLevel || ''} onChange={e => setFilters({...filters, maxLevel: e.target.value ? parseInt(e.target.value) : undefined})} className="w-full bg-bg-surface border border-border-main rounded-lg px-3 py-2" />
        </div>

        <div>
          <label className="block text-sm font-bold mb-2">{t('collection.nature')}</label>
          <select value={filters.natureId || ''} onChange={e => setFilters({...filters, natureId: e.target.value || undefined})} className="w-full bg-bg-surface border border-border-main rounded-lg px-3 py-2">
            <option className="dark:bg-gray-800 dark:text-white" value="">{t('app.all')}</option>
            {gamedata.natures.map((n: any) => (
              <option className="dark:bg-gray-800 dark:text-white" key={n.id} value={n.id}>{getNatureDisplayName(t, n.id)}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-bold mb-2">Especialidad</label>
          <select value={filters.specialty || ''} onChange={e => setFilters({...filters, specialty: e.target.value || undefined})} className="w-full bg-bg-surface border border-border-main rounded-lg px-3 py-2 dark:bg-gray-800 dark:text-white">
            <option className="dark:bg-gray-800 dark:text-white" value="">Todas</option>
            <option className="dark:bg-gray-800 dark:text-white" value="Berries">Bayas</option>
            <option className="dark:bg-gray-800 dark:text-white" value="Ingredients">Ingredientes</option>
            <option className="dark:bg-gray-800 dark:text-white" value="Skills">Habilidades</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-bold mb-2">Baya</label>
          <select value={filters.berryId || ''} onChange={e => setFilters({...filters, berryId: e.target.value || undefined})} className="w-full bg-bg-surface border border-border-main rounded-lg px-3 py-2 dark:bg-gray-800 dark:text-white">
            <option className="dark:bg-gray-800 dark:text-white" value="">Todas</option>
            {gamedata.berries.map((b: any) => (
              <option className="dark:bg-gray-800 dark:text-white" key={b.name} value={b.name}>{b.name}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-bold mb-2">Habilidad Principal</label>
          <select value={filters.mainSkillId || ''} onChange={e => setFilters({...filters, mainSkillId: e.target.value || undefined})} className="w-full bg-bg-surface border border-border-main rounded-lg px-3 py-2 dark:bg-gray-800 dark:text-white">
            <option className="dark:bg-gray-800 dark:text-white" value="">Todas</option>
            {gamedata.mainSkills.map((s: any) => (
              <option className="dark:bg-gray-800 dark:text-white" key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>

        <div className="col-span-1 md:col-span-2">
          <label className="block text-sm font-bold mb-2">{t('collection.required_subskills')} (Activas por nivel)</label>
          <div className="flex flex-wrap gap-2">
            {gamedata.subSkills.map((s: any) => {
              const active = filters.subSkillIds.includes(s.id);
              return (
                <button key={s.id} onClick={() => handleToggleSubskill(s.id)} className={`px-3 py-1 text-xs rounded-full border ${active ? 'bg-indigo-600 text-white border-indigo-700' : 'bg-bg-surface border-border-main'}`}>
                  {s.name}
                </button>
              );
            })}
          </div>
        </div>

        <div className="col-span-1 md:col-span-2">
          <label className="block text-sm font-bold mb-2">{t('collection.required_ingredients')} (Cualquier slot)</label>
          <div className="flex flex-wrap gap-2">
            {gamedata.ingredients.map((ing: any) => {
              const active = filters.ingredientIds.includes(ing.name);
              return (
                <button key={ing.name} onClick={() => handleToggleIng(ing.name)} className={`px-3 py-1 text-xs rounded-full border ${active ? 'bg-indigo-600 text-white border-indigo-700' : 'bg-bg-surface border-border-main'}`}>
                  {translateIngredient(t, ing.name)}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="space-y-3 pt-6 mt-6 border-t border-border-main">
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" checked={filters.favoritesOnly} onChange={e => setFilters({...filters, favoritesOnly: e.target.checked})} className="w-5 h-5 rounded" />
          <span className="font-bold text-amber-500">{t('collection.only_favorites')}</span>
        </label>
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" checked={filters.incompleteOnly} onChange={e => setFilters({...filters, incompleteOnly: e.target.checked})} className="w-5 h-5 rounded" />
          <span className="font-bold text-red-500">{t('collection.only_incomplete')}</span>
        </label>
      </div>

      <div className="pt-6 mt-6 border-t border-border-main flex justify-end gap-3">
        <button onClick={() => setFilters({search: filters.search, subSkillIds: [], ingredientIds: [], favoritesOnly: false, incompleteOnly: false})} className="px-4 py-2 font-bold text-text-muted hover:text-text-main">
          Limpiar Filtros
        </button>
        <button onClick={onClose} className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg">
          Ver Resultados
        </button>
      </div>
    </div>
  );
}

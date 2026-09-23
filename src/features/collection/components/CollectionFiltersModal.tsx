// import React from 'react';
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-bg-main rounded-xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center p-6 border-b border-border-main">
          <h2 className="text-xl font-bold">Filtros Avanzados</h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full">
            <X size={24} className="text-text-muted" />
          </button>
        </div>
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold mb-2">Nivel Mínimo</label>
              <input type="number" value={filters.minLevel || ''} onChange={e => setFilters({...filters, minLevel: e.target.value ? parseInt(e.target.value) : undefined})} className="w-full bg-bg-surface border border-border-main rounded-lg px-3 py-2" />
            </div>
            <div>
              <label className="block text-sm font-bold mb-2">Nivel Máximo</label>
              <input type="number" value={filters.maxLevel || ''} onChange={e => setFilters({...filters, maxLevel: e.target.value ? parseInt(e.target.value) : undefined})} className="w-full bg-bg-surface border border-border-main rounded-lg px-3 py-2" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold mb-2">Naturaleza</label>
            <select value={filters.natureId || ''} onChange={e => setFilters({...filters, natureId: e.target.value || undefined})} className="w-full bg-bg-surface border border-border-main rounded-lg px-3 py-2">
              <option value="">Todas</option>
              {gamedata.natures.map((n: any) => (
                <option key={n.id} value={n.id}>{getNatureDisplayName(t, n.id)}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-bold mb-2">Subhabilidades Requeridas</label>
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

          <div>
            <label className="block text-sm font-bold mb-2">Ingredientes Requeridos</label>
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

          <div className="space-y-3 pt-4 border-t border-border-main">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={filters.favoritesOnly} onChange={e => setFilters({...filters, favoritesOnly: e.target.checked})} className="w-5 h-5 rounded" />
              <span className="font-bold text-amber-500">Solo Favoritos</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={filters.incompleteOnly} onChange={e => setFilters({...filters, incompleteOnly: e.target.checked})} className="w-5 h-5 rounded" />
              <span className="font-bold text-red-500">Solo Datos Incompletos</span>
            </label>
          </div>
        </div>
        <div className="p-6 border-t border-border-main bg-bg-surface flex justify-end gap-3">
          <button onClick={() => setFilters({search: filters.search, subSkillIds: [], ingredientIds: [], favoritesOnly: false, incompleteOnly: false})} className="px-4 py-2 font-bold text-text-muted hover:text-text-main">
            Limpiar Filtros
          </button>
          <button onClick={onClose} className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg">
            Ver Resultados
          </button>
        </div>
      </div>
    </div>
  );
}

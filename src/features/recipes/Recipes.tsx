import { useTranslation } from 'react-i18next';
import gamedata from '../../data/static/gamedata.json';
import { useState } from 'react';
import type { Recipe } from '../../domain/models';

export default function Recipes() {
  const { t } = useTranslation();
  const [filter, setFilter] = useState<'ALL' | 'CURRY' | 'SALAD' | 'DESSERT'>('ALL');

  const recipes: Recipe[] = (gamedata.recipes as unknown as Recipe[]) || [];

  const filteredRecipes = recipes.filter(r => filter === 'ALL' || r.type.toUpperCase() === filter);

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">{t('recipes.title')}</h2>

      <div className="flex gap-2 mb-6">
        <button onClick={() => setFilter('ALL')} className={`px-4 py-2 rounded-lg font-medium ${filter === 'ALL' ? 'bg-green-500 text-white' : 'bg-slate-200 text-text-main hover:bg-slate-300'}`}>{t('recipes.all')}</button>
        <button onClick={() => setFilter('CURRY')} className={`px-4 py-2 rounded-lg font-medium ${filter === 'CURRY' ? 'bg-green-500 text-white' : 'bg-slate-200 text-text-main hover:bg-slate-300'}`}>{t('recipes.curry')}</button>
        <button onClick={() => setFilter('SALAD')} className={`px-4 py-2 rounded-lg font-medium ${filter === 'SALAD' ? 'bg-green-500 text-white' : 'bg-slate-200 text-text-main hover:bg-slate-300'}`}>{t('recipes.salad')}</button>
        <button onClick={() => setFilter('DESSERT')} className={`px-4 py-2 rounded-lg font-medium ${filter === 'DESSERT' ? 'bg-green-500 text-white' : 'bg-slate-200 text-text-main hover:bg-slate-300'}`}>{t('recipes.dessert')}</button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredRecipes.map((recipe: Recipe) => (
          <div key={recipe.name} className="bg-bg-surface p-4 rounded-xl border border-border-main shadow-sm flex items-start justify-between">
            <div>
              <h3 className="font-bold text-lg mb-1">{recipe.displayName}</h3>
              <p className="text-sm text-text-muted capitalize">{recipe.type}</p>
            </div>
            <div className="text-right">
              <span className="inline-block px-2 py-1 bg-green-100 text-green-800 text-xs font-bold rounded-full">
                {t('recipes.value')}: {recipe.value}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

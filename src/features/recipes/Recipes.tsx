import { useTranslation } from 'react-i18next';
import gamedata from '../../data/static/gamedata.json';
import { useState } from 'react';
import type { Recipe } from '../../domain/models';
import { translateIngredient, translateRecipe } from '../../services/i18n-game';
import { Utensils, Salad, IceCream, Search, ChefHat } from 'lucide-react';

export default function Recipes() {
  const { t } = useTranslation();
  const [recipeType, setRecipeType] = useState('');
  const [ingredient, setIngredient] = useState('');
  const [sortBy, setSortBy] = useState('strength_desc');
  
  const allIngredients = Array.from(new Set(gamedata.recipes.flatMap(r => r.ingredients.map(i => i.ingredient.name)))).sort();

  const [filter, setFilter] = useState<'ALL' | 'curry' | 'salad' | 'dessert'>('ALL');
  const [search, setSearch] = useState('');

  

  const getCategoryIcon = (type: string) => {
    switch (type) {
      case 'curry': return <Utensils size={18} className="text-orange-500" />;
      case 'salad': return <Salad size={18} className="text-green-500" />;
      case 'dessert': return <IceCream size={18} className="text-pink-500" />;
      default: return null;
    }
  };

  const getCategoryName = (type: string) => {
    switch (type) {
      case 'curry': return 'Guisos y curris';
      case 'salad': return 'Ensaladas';
      case 'dessert': return 'Postres';
      default: return type;
    }
  };

  
  
  const filteredRecipes = (gamedata.recipes as unknown as Recipe[]).filter(r => {
    // Legacy filter
    if (filter !== 'ALL' && r.type !== filter) return false;
    // Legacy search
    if (search) {
      const q = search.toLowerCase();
      const translatedName = translateRecipe(t, r.name).toLowerCase();
      const matchName = translatedName.includes(q) || r.name.toLowerCase().includes(q);
      const matchIng = r.ingredients.some(ing => {
        const ingName = translateIngredient(t, ing.ingredient.name).toLowerCase();
        return ingName.includes(q) || ing.ingredient.name.toLowerCase().includes(q);
      });
      if (!matchName && !matchIng) return false;
    }
    // New filters
    if (recipeType && r.type !== recipeType) return false;
    if (ingredient && !r.ingredients.some(i => i.ingredient.name === ingredient)) return false;
    return true;
  }).sort((a, b) => {
    if (sortBy === 'pot_asc') return a.ingredients.reduce((s, i) => s + i.amount, 0) - b.ingredients.reduce((s, i) => s + i.amount, 0);
    if (sortBy === 'pot_desc') return b.ingredients.reduce((s, i) => s + i.amount, 0) - a.ingredients.reduce((s, i) => s + i.amount, 0);
    return b.value - a.value;
  });


  return (
    <div className="max-w-7xl mx-auto pb-10">
      <h2 className="text-2xl font-bold mb-6 flex items-center gap-3"><ChefHat className="text-indigo-500" /> {t('recipes.title')}</h2>

      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="flex bg-bg-surface p-1 rounded-lg border border-border-main overflow-x-auto">
          <button onClick={() => setFilter('ALL')} className={`px-4 py-2 rounded-md font-medium text-sm whitespace-nowrap ${filter === 'ALL' ? 'bg-indigo-500 text-white shadow-sm' : 'text-text-muted hover:text-text-main'}`}>{t('app.all')}</button>
          <button onClick={() => setFilter('curry')} className={`flex items-center gap-2 px-4 py-2 rounded-md font-medium text-sm whitespace-nowrap ${filter === 'curry' ? 'bg-orange-500 text-white shadow-sm' : 'text-text-muted hover:text-text-main'}`}>
            <Utensils size={16} /> Guisos y curris
          </button>
          <button onClick={() => setFilter('salad')} className={`flex items-center gap-2 px-4 py-2 rounded-md font-medium text-sm whitespace-nowrap ${filter === 'salad' ? 'bg-green-500 text-white shadow-sm' : 'text-text-muted hover:text-text-main'}`}>
            <Salad size={16} /> Ensaladas
          </button>
          <button onClick={() => setFilter('dessert')} className={`flex items-center gap-2 px-4 py-2 rounded-md font-medium text-sm whitespace-nowrap ${filter === 'dessert' ? 'bg-pink-500 text-white shadow-sm' : 'text-text-muted hover:text-text-main'}`}>
            <IceCream size={16} /> Postres
          </button>
        </div>

        <div className="relative flex-1">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search size={18} className="text-text-muted" />
          </div>
          <input
            type="text"
            placeholder="Buscar receta..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-border-main rounded-lg bg-bg-surface text-text-main focus:ring-2 focus:ring-indigo-500"
          />
        </div>
      </div>

            <div className="flex flex-col md:flex-row gap-4 mb-6 p-4 bg-bg-surface border border-border-main rounded-xl">
        <select value={recipeType} onChange={e => setRecipeType(e.target.value)} className="flex-1 p-2 rounded border border-border-main bg-bg-main bg-bg-surface text-text-main">
          <option className="bg-bg-surface text-text-main" value="">Todos los Tipos</option>
          <option className="bg-bg-surface text-text-main" value="curry">Curris</option>
          <option className="bg-bg-surface text-text-main" value="salad">Ensaladas</option>
          <option className="bg-bg-surface text-text-main" value="dessert">Postres</option>
        </select>
        <select value={ingredient} onChange={e => setIngredient(e.target.value)} className="flex-1 p-2 rounded border border-border-main bg-bg-main bg-bg-surface text-text-main">
          <option className="bg-bg-surface text-text-main" value="">Cualquier Ingrediente</option>
          {allIngredients.map(i => (
            <option className="bg-bg-surface text-text-main" key={i} value={i}>{translateIngredient(t, i)}</option>
          ))}
        </select>
        <select value={sortBy} onChange={e => setSortBy(e.target.value)} className="flex-1 p-2 rounded border border-border-main bg-bg-main bg-bg-surface text-text-main">
          <option className="bg-bg-surface text-text-main" value="strength_desc">Fuerza Base DESC</option>
          <option className="bg-bg-surface text-text-main" value="pot_asc">Tamaño Olla ASC</option>
          <option className="bg-bg-surface text-text-main" value="pot_desc">Tamaño Olla DESC</option>
        </select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredRecipes.map((recipe: Recipe) => (
          <div key={recipe.name} className="bg-bg-surface rounded-xl border border-border-main shadow-sm overflow-hidden flex flex-col">
            <div className="p-4 border-b border-border-main bg-slate-50/50 dark:bg-slate-800/30">
              <div className="flex items-start justify-between mb-2">
                <h3 className="font-bold text-lg leading-tight">{translateRecipe(t, recipe.name)}</h3>
                <span className="flex items-center text-xs font-bold px-2 py-1 rounded-full bg-border-main text-text-main">
                  {recipe.nrOfIngredients} ings
                </span>
              </div>
              <div className="flex items-center gap-2 text-sm text-text-muted">
                {getCategoryIcon(recipe.type)}
                <span>{getCategoryName(recipe.type)}</span>
              </div>
            </div>
            
            <div className="p-4 flex-1">
              <div className="space-y-2 mb-4">
                {recipe.ingredients.map(ing => (
                  <div key={ing.ingredient.name} className="flex justify-between items-center text-sm">
                    <span className="font-medium text-text-main">{translateIngredient(t, ing.ingredient.name)}</span>
                    <span className="bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 px-2 py-0.5 rounded text-xs font-bold">
                      x{ing.amount}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-4 border-t border-border-main bg-slate-50/50 dark:bg-slate-800/30 flex justify-between items-center text-sm">
              <div className="flex flex-col">
                <span className="text-text-muted text-xs">{t('recipes.base_power')}</span>
                <span className="font-bold text-success-main">{recipe.value.toLocaleString()}</span>
              </div>
              <div className="flex flex-col text-right">
                <span className="text-text-muted text-xs">{t('recipes.max_power')}</span>
                <span className="font-bold text-primary-main">{recipe.valueMax.toLocaleString()}</span>
              </div>
              <div className="flex flex-col text-right">
                <span className="text-text-muted text-xs">{t('recipes.bonus')}</span>
                <span className="font-bold text-warning-main">+{recipe.bonus}%</span>
              </div>
            </div>
          </div>
        ))}
      </div>
      
      {filteredRecipes.length === 0 && (
        <div className="text-center py-12 text-text-muted">
          <p>{t('recipes.not_found')}</p>
        </div>
      )}
    </div>
  );
}

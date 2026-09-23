import { useTranslation } from 'react-i18next';
import gamedata from '../../data/static/gamedata.json';
import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import type { Recipe } from '../../domain/models';
import { translateIngredient, translateRecipe } from '../../services/i18n-game';
import { Utensils, Salad, IceCream, Search, ChefHat } from 'lucide-react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../data/db';
import { calculateRecipePower, getRecipeLevelBonusPercent, setRecipeLevelInDb } from '../../services/recipes/recipeLevelService';

export default function Recipes() {
  const { t } = useTranslation();
  const location = useLocation();
  const recipeLevelsRecords = useLiveQuery(() => db.recipeLevels.toArray()) || [];

  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const targetId = searchParams.get('recipe') || (location.hash ? location.hash.replace('#recipe-', '') : null);
    if (targetId) {
      setTimeout(() => {
        const el = document.getElementById(`recipe-${targetId}`);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          el.classList.add('ring-4', 'ring-primary-main', 'transition-all');
          setTimeout(() => {
            el.classList.remove('ring-4', 'ring-primary-main');
          }, 3000);
        }
      }, 200);
    }
  }, [location]);
  
  const levelMap: Record<string, number> = {};
  for (const r of recipeLevelsRecords) {
    levelMap[r.recipeId] = r.level;
  }

  const [recipeType, setRecipeType] = useState('');
  const [ingredient, setIngredient] = useState('');
  const [sortBy, setSortBy] = useState('strength_desc');
  const [filter, setFilter] = useState<'ALL' | 'curry' | 'salad' | 'dessert'>('ALL');
  const [search, setSearch] = useState('');

  const allIngredients = Array.from(new Set(gamedata.recipes.flatMap(r => r.ingredients.map(i => i.ingredient.name)))).sort();

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
      case 'curry': return t('game.recipeType.curry', { defaultValue: 'Guisos y curris' });
      case 'salad': return t('game.recipeType.salad', { defaultValue: 'Ensaladas' });
      case 'dessert': return t('game.recipeType.dessert', { defaultValue: 'Postres' });
      default: return type;
    }
  };

  const handleLevelChange = async (recipeName: string, newLevel: number) => {
    await setRecipeLevelInDb(recipeName, newLevel);
  };

  const filteredRecipes = (gamedata.recipes as unknown as Recipe[]).filter(r => {
    if (filter !== 'ALL' && r.type !== filter) return false;
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
    if (recipeType && r.type !== recipeType) return false;
    if (ingredient && !r.ingredients.some(i => i.ingredient.name === ingredient)) return false;
    return true;
  }).sort((a, b) => {
    const lvlA = levelMap[a.name] || 1;
    const lvlB = levelMap[b.name] || 1;
    const pwrA = calculateRecipePower(a.value, lvlA);
    const pwrB = calculateRecipePower(b.value, lvlB);

    if (sortBy === 'pot_asc') return a.ingredients.reduce((s, i) => s + i.amount, 0) - b.ingredients.reduce((s, i) => s + i.amount, 0);
    if (sortBy === 'pot_desc') return b.ingredients.reduce((s, i) => s + i.amount, 0) - a.ingredients.reduce((s, i) => s + i.amount, 0);
    return pwrB - pwrA;
  });

  return (
    <div className="max-w-7xl mx-auto pb-10">
      <h2 className="text-2xl font-bold mb-6 flex items-center gap-3"><ChefHat className="text-primary-main" /> {t('recipes.title')}</h2>

      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="flex bg-bg-surface p-1 rounded-lg border border-border-main overflow-x-auto">
          <button onClick={() => setFilter('ALL')} className={`px-4 py-2 rounded-md font-medium text-sm whitespace-nowrap ${filter === 'ALL' ? 'bg-primary-main text-white shadow-sm' : 'text-text-muted hover:text-text-main'}`}>{t('app.all')}</button>
          <button onClick={() => setFilter('curry')} className={`flex items-center gap-2 px-4 py-2 rounded-md font-medium text-sm whitespace-nowrap ${filter === 'curry' ? 'bg-amber-600 text-white shadow-sm' : 'text-text-muted hover:text-text-main'}`}>
            <Utensils size={16} /> {t('game.recipeType.curry', { defaultValue: 'Guisos y curris' })}
          </button>
          <button onClick={() => setFilter('salad')} className={`flex items-center gap-2 px-4 py-2 rounded-md font-medium text-sm whitespace-nowrap ${filter === 'salad' ? 'bg-emerald-600 text-white shadow-sm' : 'text-text-muted hover:text-text-main'}`}>
            <Salad size={16} /> {t('game.recipeType.salad', { defaultValue: 'Ensaladas' })}
          </button>
          <button onClick={() => setFilter('dessert')} className={`flex items-center gap-2 px-4 py-2 rounded-md font-medium text-sm whitespace-nowrap ${filter === 'dessert' ? 'bg-pink-600 text-white shadow-sm' : 'text-text-muted hover:text-text-main'}`}>
            <IceCream size={16} /> {t('game.recipeType.dessert', { defaultValue: 'Postres' })}
          </button>
        </div>

        <div className="relative flex-1">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search size={18} className="text-text-muted" />
          </div>
          <input
            type="text"
            placeholder={t('recipes.search', { defaultValue: 'Buscar receta...' })}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-border-main rounded-lg bg-bg-surface text-text-main focus:ring-2 focus:ring-primary-main focus:outline-none"
          />
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-4 mb-6 p-4 bg-bg-surface border border-border-main rounded-xl">
        <select value={recipeType} onChange={e => setRecipeType(e.target.value)} className="flex-1 p-2 rounded-lg border border-border-main bg-bg-surface text-text-main font-semibold">
          <option className="bg-bg-surface text-text-main" value="">{t('recipes.all_types', { defaultValue: 'Todos los Tipos' })}</option>
          <option className="bg-bg-surface text-text-main" value="curry">{t('game.recipeType.curry', { defaultValue: 'Guisos y curris' })}</option>
          <option className="bg-bg-surface text-text-main" value="salad">{t('game.recipeType.salad', { defaultValue: 'Ensaladas' })}</option>
          <option className="bg-bg-surface text-text-main" value="dessert">{t('game.recipeType.dessert', { defaultValue: 'Postres' })}</option>
        </select>
        <select value={ingredient} onChange={e => setIngredient(e.target.value)} className="flex-1 p-2 rounded-lg border border-border-main bg-bg-surface text-text-main font-semibold">
          <option className="bg-bg-surface text-text-main" value="">{t('recipes.any_ingredient', { defaultValue: 'Cualquier Ingrediente' })}</option>
          {allIngredients.map(i => (
            <option className="bg-bg-surface text-text-main" key={i} value={i}>{translateIngredient(t, i)}</option>
          ))}
        </select>
        <select value={sortBy} onChange={e => setSortBy(e.target.value)} className="flex-1 p-2 rounded-lg border border-border-main bg-bg-surface text-text-main font-semibold">
          <option className="bg-bg-surface text-text-main" value="strength_desc">{t('recipes.sort_strength_desc', { defaultValue: 'Potencia Resultante DESC' })}</option>
          <option className="bg-bg-surface text-text-main" value="pot_asc">{t('recipes.sort_pot_asc', { defaultValue: 'Tamaño Olla ASC' })}</option>
          <option className="bg-bg-surface text-text-main" value="pot_desc">{t('recipes.sort_pot_desc', { defaultValue: 'Tamaño Olla DESC' })}</option>
        </select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredRecipes.map((recipe: Recipe) => {
          const currentLevel = levelMap[recipe.name] || 1;
          const powerAtLevel = calculateRecipePower(recipe.value, currentLevel);
          const bonusPct = getRecipeLevelBonusPercent(currentLevel);

          return (
            <div key={recipe.name} id={`recipe-${recipe.name}`} className="bg-bg-surface rounded-xl border border-border-main shadow-sm overflow-hidden flex flex-col">
              <div className="p-4 border-b border-border-main bg-bg-app">
                <div className="flex items-start justify-between mb-2">
                  <h3 className="font-bold text-lg leading-tight text-text-main">{translateRecipe(t, recipe.name)}</h3>
                  <span className="flex items-center text-xs font-bold px-2 py-1 rounded-full bg-bg-surface border border-border-main text-text-main shrink-0">
                    {recipe.nrOfIngredients} {t('team.ings', { defaultValue: 'ings' })}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm text-text-muted">
                  <div className="flex items-center gap-2">
                    {getCategoryIcon(recipe.type)}
                    <span>{getCategoryName(recipe.type)}</span>
                  </div>
                  
                  {/* Recipe Level Selector */}
                  <div className="flex items-center gap-1.5 bg-bg-surface px-2 py-1 rounded-lg border border-border-main">
                    <span className="text-xs font-bold text-text-muted">{t('recipes.level_short', { defaultValue: 'Nv.' })}</span>
                    <select
                      value={currentLevel}
                      onChange={(e) => handleLevelChange(recipe.name, Number(e.target.value))}
                      className="bg-transparent text-xs font-extrabold text-primary-main focus:outline-none cursor-pointer"
                    >
                      {Array.from({ length: 60 }, (_, idx) => idx + 1).map(lvl => (
                        <option key={lvl} value={lvl} className="bg-bg-surface text-text-main">
                          {lvl}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
              
              <div className="p-4 flex-1">
                <div className="space-y-2 mb-4">
                  {recipe.ingredients.map(ing => (
                    <div key={ing.ingredient.name} className="flex justify-between items-center text-sm">
                      <span className="font-medium text-text-main">{translateIngredient(t, ing.ingredient.name)}</span>
                      <span className="bg-primary-bg text-primary-main px-2 py-0.5 rounded text-xs font-bold">
                        x{ing.amount}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="p-4 border-t border-border-main bg-bg-app flex justify-between items-center text-sm">
                <div className="flex flex-col">
                  <span className="text-text-muted text-xs">{t('recipes.base_power', { defaultValue: 'Potencia base' })}</span>
                  <span className="font-bold text-text-muted">{recipe.value.toLocaleString()}</span>
                </div>
                <div className="flex flex-col text-center">
                  <span className="text-text-muted text-xs">{t('recipes.power_at_level', { defaultValue: 'Potencia al Nv.' })} {currentLevel}</span>
                  <span className="font-black text-success-main text-base">{powerAtLevel.toLocaleString()}</span>
                </div>
                <div className="flex flex-col text-right">
                  <span className="text-text-muted text-xs">{t('recipes.level_bonus', { defaultValue: 'Bonus Nv.' })}</span>
                  <span className="font-bold text-warning-main">+{bonusPct}%</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      
      {filteredRecipes.length === 0 && (
        <div className="text-center py-12 text-text-muted">
          <p>{t('recipes.not_found')}</p>
        </div>
      )}
    </div>
  );
}

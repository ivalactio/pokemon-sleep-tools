import { useState, useEffect } from 'react';
import { db } from '../../data/db';
import type { WeeklyPlan, DailyPlan, SavedTeam } from '../../domain/persistence';
import type { IslandId } from '../../domain/optimizer/islands';
import { ISLANDS } from '../../domain/optimizer/islands';
import type { OptimizerObjective, RecipeType } from '../../domain/optimizer/core';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, Plus, X } from 'lucide-react';
import gamedata from '../../data/static/gamedata.json';
import { translateRecipe, translateBerry } from '../../services/i18n-game';

interface Props {
  plan?: WeeklyPlan;
  onBack: () => void;
}

const DAYS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

export function WeeklyPlanEditor({ plan, onBack }: Props) {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [savedTeams, setSavedTeams] = useState<SavedTeam[]>([]);
  useEffect(() => {
    db.savedTeams.toArray().then(setSavedTeams);
  }, []);

  const [name, setName] = useState(plan?.name || 'Nueva Semana');
  const [weekStart, setWeekStart] = useState(plan?.weekStart || new Date().toISOString().split('T')[0]);
  const [island, setIsland] = useState<IslandId>(plan?.island || 'greengrass');
  const [areaBonus, setAreaBonus] = useState(plan?.areaBonus || 0);
  const [favoriteBerries, setFavoriteBerries] = useState<string[]>(plan?.favoriteBerries || []);
  const [recipeType, setRecipeType] = useState<RecipeType>(plan?.recipeType || 'curry');
  const [targetRecipeId, setTargetRecipeId] = useState(plan?.targetRecipeId || '');
  const [objective, setObjective] = useState<OptimizerObjective>(plan?.objective || 'berries');
  
  const [mainTeamId, setMainTeamId] = useState(plan?.mainTeamId || '');
  const [alternativeTeamIds, setAlternativeTeamIds] = useState<string[]>(plan?.alternativeTeamIds || []);
  const [dailyPlans, setDailyPlans] = useState<DailyPlan[]>(plan?.dailyPlans || DAYS.map((_, i) => ({ dayOfWeek: i + 1 })));
  const [notes, setNotes] = useState(plan?.notes || '');

  const availableRecipes = gamedata.recipes.filter(r => r.type === recipeType);

  // When recipeType changes, reset target recipe if invalid
  useEffect(() => {
    if (targetRecipeId && !availableRecipes.find(r => r.name === targetRecipeId)) {
      setTargetRecipeId('');
    }
  }, [recipeType, targetRecipeId, availableRecipes]);

  const handleSave = async () => {
    const data: WeeklyPlan = {
      id: plan?.id || crypto.randomUUID(),
      createdAt: plan?.createdAt || Date.now(),
      name,
      weekStart,
      island,
      areaBonus,
      favoriteBerries,
      recipeType,
      targetRecipeId,
      objective,
      mainTeamId,
      alternativeTeamIds,
      dailyPlans,
      notes
    };
    if (plan) {
      await db.weeklyPlans.put(data);
    } else {
      await db.weeklyPlans.add(data);
    }
    onBack();
  };

  const handleOptimize = () => {
    window.localStorage.setItem('opt_island', JSON.stringify(island));
    window.localStorage.setItem('opt_areaBonus', JSON.stringify(areaBonus));
    window.localStorage.setItem('opt_favoriteBerries', JSON.stringify(favoriteBerries));
    window.localStorage.setItem('opt_recipeType', JSON.stringify(recipeType));
    window.localStorage.setItem('opt_targetRecipeId', JSON.stringify(targetRecipeId));
    window.localStorage.setItem('opt_objective', JSON.stringify(objective));
    navigate('/optimizador');
  };

  const handleCompare = () => {
    const tids = [mainTeamId, ...alternativeTeamIds].filter(Boolean);
    if (tids.length === 2) {
      navigate(`/comparador?t1=${tids[0]}&t2=${tids[1]}`);
    } else {
      alert('Para comparar directamente, debes tener exactamente 2 equipos definidos (Principal y 1 Alternativo).');
    }
  };

  const updateDaily = (dayIndex: number, field: keyof DailyPlan, value: any) => {
    const newPlans = [...dailyPlans];
    newPlans[dayIndex] = { ...newPlans[dayIndex], [field]: value };
    setDailyPlans(newPlans);
  };

  const toggleFavBerry = (berryName: string) => {
    setFavoriteBerries(prev => {
      if (prev.includes(berryName)) return prev.filter(b => b !== berryName);
      if (prev.length >= 3) return prev;
      return [...prev, berryName];
    });
  };

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <button onClick={onBack} className="text-text-muted hover:text-text-main flex items-center gap-2">
          <ArrowLeft size={20}/> Volver
        </button>
        <div className="flex gap-2">
          <button onClick={handleOptimize} className="px-4 py-2 border border-indigo-200 text-indigo-700 bg-indigo-50 hover:bg-indigo-100 dark:border-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300 dark:hover:bg-indigo-900/50 rounded font-bold">Optimizar Equipo</button>
          <button onClick={handleCompare} className="px-4 py-2 border border-amber-200 text-amber-700 bg-amber-50 hover:bg-amber-100 dark:border-amber-800 dark:bg-amber-900/30 dark:text-amber-300 dark:hover:bg-amber-900/50 rounded font-bold">Comparar Equipos</button>
          <button onClick={handleSave} className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded font-bold flex items-center gap-2">
            <Save size={18}/> Guardar
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Context Configuration */}
        <div className="col-span-1 space-y-4">
          <div className="bg-bg-surface border border-border-main p-4 rounded-xl shadow-sm space-y-4">
            <h2 className="font-bold text-lg border-b border-border-main pb-2">Contexto</h2>
            
            <div>
              <label className="block text-sm font-medium mb-1">Nombre del Plan</label>
              <input type="text" value={name} onChange={e => setName(e.target.value)} className="w-full px-3 py-2 border border-border-main rounded bg-bg-main text-text-main" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Semana (Fecha inicio)</label>
              <input type="date" value={weekStart} onChange={e => setWeekStart(e.target.value)} className="w-full px-3 py-2 border border-border-main rounded bg-bg-main text-text-main" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Isla</label>
              <select value={island} onChange={e => setIsland(e.target.value as IslandId)} className="w-full px-3 py-2 border border-border-main rounded bg-bg-main text-text-main">
                {ISLANDS.map(i => <option key={i.id} value={i.id}>{t(`islands.${i.id}`)}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Bonus de Área (%)</label>
              <input type="number" min="0" max="60" value={areaBonus} onChange={e => setAreaBonus(Number(e.target.value))} className="w-full px-3 py-2 border border-border-main rounded bg-bg-main text-text-main" />
            </div>
            
            {island === 'greengrass' && (
              <div>
                <label className="block text-sm font-medium mb-1">Bayas Favoritas ({favoriteBerries.length}/3)</label>
                <div className="flex flex-wrap gap-2">
                  {gamedata.berries.map(b => {
                    const isSelected = favoriteBerries.includes(b.name);
                    return (
                      <button
                        key={b.name}
                        onClick={() => toggleFavBerry(b.name)}
                        disabled={!isSelected && favoriteBerries.length >= 3}
                        className={`px-3 py-1 text-sm rounded-full border transition-colors ${
                          isSelected 
                            ? 'bg-amber-500 text-white border-amber-600' 
                            : 'bg-bg-app text-text-main border-border-main hover:bg-bg-surface-hover'
                        } disabled:opacity-50`}
                      >
                        {translateBerry(t, b.name)}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium mb-1">Tipo de Platos</label>
              <select value={recipeType} onChange={e => setRecipeType(e.target.value as RecipeType)} className="w-full px-3 py-2 border border-border-main rounded bg-bg-main text-text-main">
                <option value="curry">{t('game.recipeType.curry', { defaultValue: 'Guisos y curris' })}</option>
                <option value="salad">{t('game.recipeType.salad', { defaultValue: 'Ensaladas' })}</option>
                <option value="dessert">{t('game.recipeType.dessert', { defaultValue: 'Postres' })}</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Receta Principal</label>
              <select value={targetRecipeId} onChange={e => setTargetRecipeId(e.target.value)} className="w-full px-3 py-2 border border-border-main rounded bg-bg-main text-text-main">
                <option value="">{t('app.none', { defaultValue: 'Ninguna / Variable' })}</option>
                {availableRecipes.map(r => (
                  <option key={r.name} value={r.name}>{translateRecipe(t, r.name)}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Objetivo General</label>
              <select value={objective} onChange={e => setObjective(e.target.value as OptimizerObjective)} className="w-full px-3 py-2 border border-border-main rounded bg-bg-main text-text-main">
                <option value="berries">{t('app.berries', { defaultValue: 'Bayas' })}</option>
                <option value="ingredients">{t('app.ingredients', { defaultValue: 'Ingredientes' })}</option>
                <option value="recipe">{t('app.recipes', { defaultValue: 'Recetas' })}</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Notas Semanales</label>
              <textarea value={notes} onChange={e => setNotes(e.target.value)} className="w-full px-3 py-2 border border-border-main rounded bg-bg-main text-text-main h-24" placeholder="Ej: Priorizar subir ingredientes de Miel." />
            </div>

          </div>
        </div>

        {/* Daily & Teams */}
        <div className="col-span-1 lg:col-span-2 space-y-6">
          <div className="bg-bg-surface border border-border-main p-4 rounded-xl shadow-sm space-y-4">
            <h2 className="font-bold text-lg border-b border-border-main pb-2">Equipos Asignados</h2>
            <div>
              <label className="block text-sm font-medium mb-1">Equipo Principal</label>
              <select value={mainTeamId} onChange={e => setMainTeamId(e.target.value)} className="w-full px-3 py-2 border border-border-main rounded bg-bg-main font-bold text-indigo-700 dark:text-indigo-400">
                <option value="">-- Seleccionar Equipo Guardado --</option>
                {savedTeams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Equipos Alternativos (Opcional)</label>
              {alternativeTeamIds.map((tid, idx) => (
                <div key={idx} className="flex items-center gap-2 mb-2">
                  <select value={tid} onChange={e => {
                    const nw = [...alternativeTeamIds];
                    nw[idx] = e.target.value;
                    setAlternativeTeamIds(nw);
                  }} className="flex-1 px-3 py-2 border border-border-main rounded bg-bg-main text-text-main">
                    <option value="">-- Seleccionar Equipo Guardado --</option>
                    {savedTeams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                  </select>
                  <button onClick={() => setAlternativeTeamIds(alternativeTeamIds.filter((_, i) => i !== idx))} className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded">
                    <X size={20}/>
                  </button>
                </div>
              ))}
              <button onClick={() => setAlternativeTeamIds([...alternativeTeamIds, ''])} className="text-sm text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 mt-2">
                <Plus size={16}/> Añadir Alternativo
              </button>
            </div>
          </div>

          <div className="bg-bg-surface border border-border-main p-4 rounded-xl shadow-sm">
            <h2 className="font-bold text-lg border-b border-border-main pb-4 mb-4">Planificación Diaria</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {dailyPlans.map((dp, i) => (
                <div key={i} className="border border-border-main p-3 rounded-lg bg-bg-main flex flex-col gap-2">
                  <h3 className="font-bold text-md mb-1 text-text-main">{DAYS[i]}</h3>
                  
                  <div>
                    <label className="text-xs font-medium text-text-muted">Sobrescribir Equipo</label>
                    <select value={dp.teamId || ''} onChange={e => updateDaily(i, 'teamId', e.target.value)} className="w-full px-2 py-1 border border-border-main rounded bg-bg-surface text-text-main text-sm">
                      <option value="">(Usar Principal)</option>
                      {savedTeams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                    </select>
                  </div>
                  
                  <div>
                    <label className="text-xs font-medium text-text-muted">Receta del Día</label>
                    <select value={dp.recipeId || ''} onChange={e => updateDaily(i, 'recipeId', e.target.value)} className="w-full px-2 py-1 border border-border-main rounded bg-bg-surface text-text-main text-sm">
                      <option value="">(Usar Principal / Variable)</option>
                      {availableRecipes.map(r => (
                        <option key={r.name} value={r.name}>{translateRecipe(t, r.name)}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-medium text-text-muted">Notas del día</label>
                    <input type="text" value={dp.notes || ''} onChange={e => updateDaily(i, 'notes', e.target.value)} placeholder="Ej: Usar pito para energía..." className="w-full px-2 py-1 border border-border-main rounded bg-bg-surface text-text-main text-sm" />
                  </div>
                </div>
              ))}
            </div>
          </div>
          
        </div>
      </div>
    </div>
  );
}

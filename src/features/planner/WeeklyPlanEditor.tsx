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
import { LocalCalculationEngine } from '../../services/optimizer/calculator/LocalCalculationEngine';
import { OptimizerService } from '../../services/optimizer/OptimizerService';
import type { OwnedPokemon } from '../../domain/models';
import { Wand2 } from 'lucide-react';
import { TeamCompareModal } from '../optimizer/components/TeamCompareModal';
import type { TeamResult } from '../../domain/optimizer/core';
import { TeamEvaluator } from '../../services/optimizer/TeamEvaluator';
import { BerryScoringStrategy, IngredientScoringStrategy, RecipeScoringStrategy } from '../../services/optimizer/ScoringStrategies';


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

  const [collection, setCollection] = useState<OwnedPokemon[]>([]);
  useEffect(() => {
    db.ownedPokemon.toArray().then(setCollection);
  }, []);

  const [audit, setAudit] = useState<{ing: string, cost: number, prod: number, diff: number}[]>([]);
  const [projectedStrength, setProjectedStrength] = useState(0);
  const [isSuggesting, setIsSuggesting] = useState(false);

  const [compareTeams, setCompareTeams] = useState<[TeamResult, TeamResult] | null>(null);

  const buildTeamResult = async (teamId: string): Promise<TeamResult> => {
    const saved = savedTeams.find(t => t.id === teamId);
    if (!saved) throw new Error('Not found');
    const members = saved.memberIds.map(id => collection.find(p => p.id === id)).filter(Boolean) as OwnedPokemon[];
    const teamObj = { members };
    const engine = new LocalCalculationEngine(gamedata as any);
    const evaluator = new TeamEvaluator(engine, gamedata as any);
    const ctx = await evaluator.evaluate(teamObj, saved.queryContext.simulation);
    
    const obj = saved.queryContext.objectives[0];
    let strategy;
    if (obj === 'berries') strategy = new BerryScoringStrategy(gamedata as any);
    else if (obj === 'ingredients') strategy = new IngredientScoringStrategy(gamedata as any);
    else strategy = new RecipeScoringStrategy(gamedata as any, saved.queryContext.recipeType || 'curry', saved.queryContext.targetRecipeId);
    
    const score = strategy.score(ctx);
    return { evaluation: ctx, score };
  };

  const handleCompareClick = async () => {
    const tids = [mainTeamId, ...alternativeTeamIds].filter(Boolean);
    if (tids.length === 2) {
      try {
        const t1 = await buildTeamResult(tids[0]);
        const t2 = await buildTeamResult(tids[1]);
        setCompareTeams([t1, t2]);
      } catch (e) {
        console.error("Error al comparar", e);
        alert("Error al preparar comparación.");
      }
    }
  };


  useEffect(() => {
    const recalculateAudit = async () => {
      if (!collection.length) return;
      const engine = new LocalCalculationEngine(gamedata as any);
      
      const costMap = new Map<string, number>();
      for (const dp of dailyPlans) {
        const recId = dp.recipeId || targetRecipeId;
        if (recId) {
          const recipe = gamedata.recipes.find(r => r.name === recId);
          if (recipe) {
            for (const ing of recipe.ingredients) {
              costMap.set(ing.ingredient.name, (costMap.get(ing.ingredient.name) || 0) + ing.amount * 3);
            }
          }
        }
      }

      const prodMap = new Map<string, number>();
      let totalStrength = 0;
      const teamProdCache = new Map<string, any[]>();
      
      const config = {
        camp: false,
        bedtime: '22:00',
        wakeup: '06:00',
        island,
        areaBonus,
        favoriteBerries: island === 'greengrass' ? favoriteBerries : undefined
      };

      for (const dp of dailyPlans) {
        const tId = dp.teamId || mainTeamId;
        if (!tId) continue;
        const team = savedTeams.find(t => t.id === tId);
        if (!team) continue;
        
        let estimates = teamProdCache.get(tId);
        if (!estimates) {
          const members = team.memberIds.map(id => collection.find(p => p.id === id)).filter(Boolean) as OwnedPokemon[];
          if (members.length > 0) {
            estimates = await engine.simulateTeam(members, config as any);
            teamProdCache.set(tId, estimates);
          } else {
            estimates = [];
          }
        }
        
        for (const est of estimates) {
          for (const ing of est.ingredients) {
             prodMap.set(ing.name, (prodMap.get(ing.name) || 0) + ing.amount);
          }
          for (const berry of est.berries) {
             const bData = gamedata.berries.find(b => b.name === berry.name);
             if (bData) {
                totalStrength += berry.amount * bData.value * (1 + areaBonus / 100);
             }
          }
          totalStrength += est.skillProcs * 400 * (1 + areaBonus / 100);
        }
      }
      
      for (const dp of dailyPlans) {
        const recId = dp.recipeId || targetRecipeId;
        if (recId) {
          const recipe = gamedata.recipes.find(r => r.name === recId);
          if (recipe) {
             totalStrength += recipe.value * 3 * (1 + areaBonus / 100);
          }
        }
      }

      const allIngs = new Set([...costMap.keys(), ...prodMap.keys()]);
      const newAudit = Array.from(allIngs).map(ing => {
        const cost = costMap.get(ing) || 0;
        const prod = prodMap.get(ing) || 0;
        return { ing, cost, prod, diff: prod - cost };
      }).sort((a, b) => a.diff - b.diff);
      
      setAudit(newAudit);
      setProjectedStrength(totalStrength);
    };

    recalculateAudit();
  }, [dailyPlans, targetRecipeId, mainTeamId, savedTeams, collection, island, favoriteBerries, areaBonus]);

  const handleSuggestTeam = async () => {
    if (!collection.length) return;
    setIsSuggesting(true);
    await new Promise(r => setTimeout(r, 50));
    
    try {
      const engine = new LocalCalculationEngine(gamedata as any);
      const opt = new OptimizerService(gamedata as any, engine);
      
      const config = {
        simulation: { camp: false, bedtime: '22:00', wakeup: '06:00', island, areaBonus, favoriteBerries: island === 'greengrass' ? favoriteBerries : undefined },
        constraints: { minLevel: 1, uniqueSpecies: false, requiredPokemonIds: [], excludedPokemonIds: [] },
        recipeType,
        targetRecipeId: objective === 'recipe' ? targetRecipeId : undefined,
        objectives: [objective],
        maxResults: 1
      };
      
      const results = await opt.optimize(collection, config as any);
      if (results.length > 0) {
        const bestTeam = results[0].evaluation.team;
        const newTeam = {
          id: crypto.randomUUID(),
          name: `Asistente: ${Math.round(results[0].score.score)} pt`,
          createdAt: Date.now(),
          queryContext: config as any,
          memberIds: bestTeam.members.map(m => m.id)
        };
        await db.savedTeams.add(newTeam);
        setSavedTeams(prev => [...prev, newTeam]);
        setMainTeamId(newTeam.id);
      } else {
        alert('No se pudo encontrar un equipo válido para esta configuración.');
      }
    } catch (e: any) {
      console.error(e);
      alert('Error sugiriendo equipo: ' + e.message);
    }
    setIsSuggesting(false);
  };


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
      handleCompareClick();
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
          <button onClick={handleOptimize} className="px-4 py-2 border border-indigo-200 text-indigo-700 bg-indigo-50 hover:bg-indigo-100 dark:border-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300 dark:hover:bg-indigo-900/50 rounded font-bold">{t('planner.optimize')}</button>
          <button onClick={handleCompare} className="px-4 py-2 border border-amber-200 text-amber-700 bg-amber-50 hover:bg-amber-100 dark:border-amber-800 dark:bg-amber-900/30 dark:text-amber-300 dark:hover:bg-amber-900/50 rounded font-bold">{t('planner.compare')}</button>
          <button onClick={handleSave} className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded font-bold flex items-center gap-2">
            <Save size={18}/> Guardar
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Context Configuration */}
        <div className="col-span-1 space-y-4">
          <div className="bg-bg-surface border border-border-main p-4 rounded-xl shadow-sm space-y-4">
            <h2 className="font-bold text-lg border-b border-border-main pb-2">{t('planner.context')}</h2>
            
            <div>
              <label className="block text-sm font-medium mb-1">{t('planner.plan_name')}</label>
              <input type="text" value={name} onChange={e => setName(e.target.value)} className="w-full px-3 py-2 border border-border-main rounded bg-bg-main text-text-main" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">{t('planner.week_start')}</label>
              <input type="date" value={weekStart} onChange={e => setWeekStart(e.target.value)} className="w-full px-3 py-2 border border-border-main rounded bg-bg-main text-text-main" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">{t('optimizer.island')}</label>
              <select value={island} onChange={e => setIsland(e.target.value as IslandId)} className="w-full px-3 py-2 border border-border-main rounded bg-bg-main text-text-main">
                {ISLANDS.map(i => <option className="dark:bg-gray-800 dark:text-white" key={i.id} value={i.id}>{t(`islands.${i.id}`)}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">{t('optimizer.area_bonus')}</label>
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
              <label className="block text-sm font-medium mb-1">{t('optimizer.dish_type')}</label>
              <select value={recipeType} onChange={e => setRecipeType(e.target.value as RecipeType)} className="w-full px-3 py-2 border border-border-main rounded bg-bg-main text-text-main">
                <option className="dark:bg-gray-800 dark:text-white" value="curry">{t('game.recipeType.curry', { defaultValue: 'Guisos y curris' })}</option>
                <option className="dark:bg-gray-800 dark:text-white" value="salad">{t('game.recipeType.salad', { defaultValue: 'Ensaladas' })}</option>
                <option className="dark:bg-gray-800 dark:text-white" value="dessert">{t('game.recipeType.dessert', { defaultValue: 'Postres' })}</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">{t('optimizer.prioritize_recipe')}</label>
              <select value={targetRecipeId} onChange={e => setTargetRecipeId(e.target.value)} className="w-full px-3 py-2 border border-border-main rounded bg-bg-main text-text-main">
                <option className="dark:bg-gray-800 dark:text-white" value="">{t('app.none', { defaultValue: 'Ninguna / Variable' })}</option>
                {availableRecipes.map(r => (
                  <option className="dark:bg-gray-800 dark:text-white" key={r.name} value={r.name}>{translateRecipe(t, r.name)}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">{t('planner.general_objective')}</label>
              <select value={objective} onChange={e => setObjective(e.target.value as OptimizerObjective)} className="w-full px-3 py-2 border border-border-main rounded bg-bg-main text-text-main">
                <option className="dark:bg-gray-800 dark:text-white" value="berries">{t('app.berries', { defaultValue: 'Bayas' })}</option>
                <option className="dark:bg-gray-800 dark:text-white" value="ingredients">{t('app.ingredients', { defaultValue: 'Ingredientes' })}</option>
                <option className="dark:bg-gray-800 dark:text-white" value="recipe">{t('app.recipes', { defaultValue: 'Recetas' })}</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">{t('planner.weekly_notes')}</label>
              <textarea value={notes} onChange={e => setNotes(e.target.value)} className="w-full px-3 py-2 border border-border-main rounded bg-bg-main text-text-main h-24" placeholder="Ej: Priorizar subir ingredientes de Miel." />
            </div>

            <div className="mt-4 p-4 bg-indigo-50 border border-indigo-200 dark:bg-indigo-900/20 dark:border-indigo-800 rounded-lg">
              <h3 className="font-bold text-indigo-900 dark:text-indigo-300 mb-1">Proyección de Fuerza</h3>
              <p className="text-2xl font-black text-indigo-700 dark:text-indigo-400">{Math.round(projectedStrength).toLocaleString()}</p>
              <p className="text-xs text-indigo-600 dark:text-indigo-500">Fuerza estimada Snorlax (Domingo noche)</p>
            </div>


          </div>
        </div>

        {/* Daily & Teams */}
        <div className="col-span-1 lg:col-span-2 space-y-6">
          <div className="bg-bg-surface border border-border-main p-4 rounded-xl shadow-sm space-y-4">
            <h2 className="font-bold text-lg border-b border-border-main pb-2">{t('planner.assigned_teams')}</h2>
            <div className="mb-2 mt-4">
              <button onClick={handleSuggestTeam} disabled={isSuggesting} className="w-full py-2 bg-indigo-100 hover:bg-indigo-200 text-indigo-800 dark:bg-indigo-900/30 dark:hover:bg-indigo-900/50 dark:text-indigo-300 rounded flex items-center justify-center gap-2 font-bold transition-colors">
                <Wand2 size={18} />
                {isSuggesting ? 'Calculando...' : 'Sugerir Equipo Óptimo'}
              </button>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">{t('planner.main_team')}</label>
              <select value={mainTeamId} onChange={e => setMainTeamId(e.target.value)} className="w-full px-3 py-2 border border-border-main rounded bg-bg-main font-bold text-indigo-700 dark:text-indigo-400">
                <option className="dark:bg-gray-800 dark:text-white" value="">{t('planner.select_team')}</option>
                {savedTeams.map(t => <option className="dark:bg-gray-800 dark:text-white" key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">{t('planner.alt_teams')}</label>
              {alternativeTeamIds.map((tid, idx) => (
                <div key={idx} className="flex items-center gap-2 mb-2">
                  <select value={tid} onChange={e => {
                    const nw = [...alternativeTeamIds];
                    nw[idx] = e.target.value;
                    setAlternativeTeamIds(nw);
                  }} className="flex-1 px-3 py-2 border border-border-main rounded bg-bg-main text-text-main">
                    <option className="dark:bg-gray-800 dark:text-white" value="">{t('planner.select_team')}</option>
                    {savedTeams.map(t => <option className="dark:bg-gray-800 dark:text-white" key={t.id} value={t.id}>{t.name}</option>)}
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
            <h2 className="font-bold text-lg border-b border-border-main pb-4 mb-4">{t('planner.daily_plan')}</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {dailyPlans.map((dp, i) => (
                <div key={i} className="border border-border-main p-3 rounded-lg bg-bg-main flex flex-col gap-2">
                  <h3 className="font-bold text-md mb-1 text-text-main">{DAYS[i]}</h3>
                  
                  <div>
                    <label className="text-xs font-medium text-text-muted">{t('planner.override_team')}</label>
                    <select value={dp.teamId || ''} onChange={e => updateDaily(i, 'teamId', e.target.value)} className="w-full px-2 py-1 border border-border-main rounded bg-bg-surface text-text-main text-sm">
                      <option className="dark:bg-gray-800 dark:text-white" value="">{t('planner.use_main')}</option>
                      {savedTeams.map(t => <option className="dark:bg-gray-800 dark:text-white" key={t.id} value={t.id}>{t.name}</option>)}
                    </select>
                  </div>
                  
                  <div>
                    <label className="text-xs font-medium text-text-muted">{t('planner.recipe_day')}</label>
                    <select value={dp.recipeId || ''} onChange={e => updateDaily(i, 'recipeId', e.target.value)} className="w-full px-2 py-1 border border-border-main rounded bg-bg-surface text-text-main text-sm">
                      <option className="dark:bg-gray-800 dark:text-white" value="">{t('planner.use_main_recipe')}</option>
                      {availableRecipes.map(r => (
                        <option className="dark:bg-gray-800 dark:text-white" key={r.name} value={r.name}>{translateRecipe(t, r.name)}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-medium text-text-muted">{t('planner.daily_notes')}</label>
                    <input type="text" value={dp.notes || ''} onChange={e => updateDaily(i, 'notes', e.target.value)} placeholder="Ej: Usar pito para energía..." className="w-full px-2 py-1 border border-border-main rounded bg-bg-surface text-text-main text-sm" />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-bg-surface border border-border-main p-4 rounded-xl shadow-sm">
            <h2 className="font-bold text-lg border-b border-border-main pb-4 mb-4">Auditoría de Despensa</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-bg-main text-text-muted">
                  <tr>
                    <th className="px-3 py-2 rounded-l-lg">Ingrediente</th>
                    <th className="px-3 py-2 text-right">Coste 7d</th>
                    <th className="px-3 py-2 text-right">Prod 7d</th>
                    <th className="px-3 py-2 text-right rounded-r-lg">Balance</th>
                  </tr>
                </thead>
                <tbody>
                  {audit.map((row, i) => (
                    <tr key={i} className="border-b border-border-main last:border-0">
                      <td className="px-3 py-2 font-medium">{row.ing}</td>
                      <td className="px-3 py-2 text-right text-text-muted">{Math.round(row.cost)}</td>
                      <td className="px-3 py-2 text-right text-text-muted">{Math.round(row.prod)}</td>
                      <td className={`px-3 py-2 text-right font-bold ${row.diff < 0 ? 'text-red-500' : 'text-green-500'}`}>
                        {row.diff > 0 ? '+' : ''}{Math.round(row.diff)}
                      </td>
                    </tr>
                  ))}
                  {audit.length === 0 && (
                    <tr><td colSpan={4} className="px-3 py-4 text-center text-text-muted">No hay ingredientes proyectados.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
          
        </div>
      </div>
      {compareTeams && <TeamCompareModal teams={compareTeams} onClose={() => setCompareTeams(null)} />}
    </div>
  );
}

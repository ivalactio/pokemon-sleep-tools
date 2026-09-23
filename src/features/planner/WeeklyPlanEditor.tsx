import { useState, useEffect } from 'react';
import { db } from '../../data/db';
import type { WeeklyPlan, DailyPlan, SavedTeam } from '../../domain/persistence';
import type { IslandId } from '../../domain/optimizer/islands';
import { ISLANDS } from '../../domain/optimizer/islands';
import type { OptimizerObjective, RecipeType } from '../../domain/optimizer/core';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, Save, Plus, X, Wand2, Calendar, 
  Utensils, Users, TrendingUp, 
  GitCompare, ExternalLink, Package
} from 'lucide-react';
import gamedata from '../../data/static/gamedata.json';
import { translateRecipe, translateBerry, translateIngredient } from '../../services/i18n-game';
import { LocalCalculationEngine } from '../../services/optimizer/calculator/LocalCalculationEngine';
import { OptimizerService } from '../../services/optimizer/OptimizerService';
import type { OwnedPokemon } from '../../domain/models';
import { TeamCompareModal } from '../optimizer/components/TeamCompareModal';
import type { TeamResult } from '../../domain/optimizer/core';
import { TeamEvaluator } from '../../services/optimizer/TeamEvaluator';
import { BerryScoringStrategy, IngredientScoringStrategy, RecipeScoringStrategy } from '../../services/optimizer/ScoringStrategies';
import { PageHeader, Panel, ActionButton, Badge } from '../../components/ui';

interface Props {
  plan?: WeeklyPlan;
  onBack: () => void;
}

const DAY_NAMES: Record<string, string[]> = {
  es: ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'],
  en: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
};

export function WeeklyPlanEditor({ plan, onBack }: Props) {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const days = DAY_NAMES[i18n.language?.startsWith('en') ? 'en' : 'es'];

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
  const [dailyPlans, setDailyPlans] = useState<DailyPlan[]>(plan?.dailyPlans || Array.from({ length: 7 }, (_, i) => ({ dayOfWeek: i + 1 })));
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
          name: `Sugerido: ${Math.round(results[0].score.score)} pts`,
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

  const renderTeamMiniAvatars = (teamId: string) => {
    const team = savedTeams.find(t => t.id === teamId);
    if (!team) return null;

    return (
      <div className="flex items-center gap-1.5 pt-2">
        {team.memberIds.map((mId, idx) => {
          const pkmn = collection.find(c => c.id === mId);
          const sp = gamedata.species.find(s => s.name === pkmn?.speciesId);

          return (
            <div 
              key={`${mId}-${idx}`} 
              className="w-8 h-8 rounded-lg bg-bg-surface border border-border-main p-0.5 flex items-center justify-center shrink-0"
              title={`${pkmn?.nickname || sp?.displayName || 'Pokémon'} (Nv. ${pkmn?.level || '?'})`}
            >
              {sp ? (
                <img 
                  src={`/pokemon/${sp.pokedexNumber}.png`} 
                  alt={sp.displayName}
                  className="w-full h-full object-contain"
                  onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }}
                />
              ) : (
                <Package size={14} className="text-text-muted" />
              )}
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="space-y-6 pb-24 max-w-6xl mx-auto">
      {/* Top Header */}
      <PageHeader 
        title={name || t('planner.title')}
        icon={Calendar}
        description={t('planner.description')}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <ActionButton variant="outline" onClick={onBack} icon={ArrowLeft}>
              {t('app.back')}
            </ActionButton>
            <ActionButton variant="outline" onClick={handleOptimize} icon={ExternalLink}>
              {t('planner.open_optimizer')}
            </ActionButton>
            <ActionButton 
              variant="outline" 
              onClick={handleCompare} 
              icon={GitCompare}
              disabled={[mainTeamId, ...alternativeTeamIds].filter(Boolean).length !== 2}
            >
              {t('planner.compare')}
            </ActionButton>
            <ActionButton variant="primary" onClick={handleSave} icon={Save} className="shadow-sm">
              {t('app.save')}
            </ActionButton>
          </div>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Context, Strength & Teams (4 cols) */}
        <div className="lg:col-span-4 space-y-6">
          {/* Projected Snorlax Strength Card */}
          <Panel className="border-primary-main/40 bg-gradient-to-b from-primary-bg/20 to-bg-surface space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-primary-main uppercase tracking-wider flex items-center gap-1.5">
                <TrendingUp size={16} /> {t('planner.snorlax_projection')}
              </span>
              <Badge variant="primary">{t('planner.sunday_night')}</Badge>
            </div>
            <div className="flex items-baseline gap-2 pt-1">
              <p className="text-3xl font-black text-text-main">
                {Math.round(projectedStrength).toLocaleString()}
              </p>
              <span className="text-xs font-bold text-text-muted">{t('planner.est_strength')}</span>
            </div>
            <p className="text-[11px] text-text-muted">
              Suma estimada de bayas, habilidades y 3 comidas diarias con el bonus de área aplicado.
            </p>
          </Panel>

          {/* Context Configuration Panel */}
          <Panel className="space-y-4">
            <h3 className="font-extrabold text-sm text-text-main uppercase tracking-wider border-b border-border-main pb-2">
              {t('planner.context')}
            </h3>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-text-muted uppercase mb-1">
                  {t('planner.plan_name')}
                </label>
                <input 
                  type="text" 
                  value={name} 
                  onChange={e => setName(e.target.value)} 
                  className="w-full px-3 py-2 border border-border-main rounded-lg bg-bg-app text-text-main font-semibold focus:border-primary-main focus:outline-none" 
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-text-muted uppercase mb-1">
                  {t('planner.week_start')}
                </label>
                <input 
                  type="date" 
                  value={weekStart} 
                  onChange={e => setWeekStart(e.target.value)} 
                  className="w-full px-3 py-2 border border-border-main rounded-lg bg-bg-app text-text-main font-semibold focus:border-primary-main focus:outline-none" 
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-text-muted uppercase mb-1">
                  {t('optimizer.island')}
                </label>
                <select 
                  value={island} 
                  onChange={e => setIsland(e.target.value as IslandId)} 
                  className="w-full px-3 py-2 border border-border-main rounded-lg bg-bg-app text-text-main font-semibold focus:border-primary-main focus:outline-none"
                >
                  {ISLANDS.map(i => (
                    <option className="bg-bg-surface text-text-main" key={i.id} value={i.id}>
                      {t(`islands.${i.id}`)}
                    </option>
                  ))}
                </select>
              </div>

              {island === 'greengrass' && (
                <div className="p-3 bg-warning-bg/20 border border-warning-main/30 rounded-xl space-y-2">
                  <label className="block text-[11px] font-bold text-warning-main uppercase">
                    Bayas Favoritas Verdegal ({favoriteBerries.length}/3)
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {gamedata.berries.map(b => {
                      const isSelected = favoriteBerries.includes(b.name);
                      return (
                        <button
                          key={b.name}
                          onClick={() => toggleFavBerry(b.name)}
                          disabled={!isSelected && favoriteBerries.length >= 3}
                          className={`px-2 py-0.5 text-xs font-bold rounded-md border transition-all ${
                            isSelected 
                              ? 'bg-warning-main text-white border-warning-main shadow-xs' 
                              : 'bg-bg-surface text-text-muted border-border-main hover:text-text-main'
                          } disabled:opacity-40`}
                        >
                          {translateBerry(t, b.name)}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-text-muted uppercase mb-1">
                  {t('optimizer.area_bonus')} (%)
                </label>
                <input 
                  type="number" min="0" max="60" 
                  value={areaBonus} 
                  onChange={e => setAreaBonus(Number(e.target.value))} 
                  className="w-full px-3 py-2 border border-border-main rounded-lg bg-bg-app text-text-main font-bold focus:border-primary-main focus:outline-none" 
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-text-muted uppercase mb-1">
                  {t('optimizer.dish_type')}
                </label>
                <select 
                  value={recipeType} 
                  onChange={e => setRecipeType(e.target.value as RecipeType)} 
                  className="w-full px-3 py-2 border border-border-main rounded-lg bg-bg-app text-text-main font-semibold focus:border-primary-main focus:outline-none"
                >
                  <option className="bg-bg-surface text-text-main" value="curry">{t('game.recipeType.curry', { defaultValue: 'Guisos y curris' })}</option>
                  <option className="bg-bg-surface text-text-main" value="salad">{t('game.recipeType.salad', { defaultValue: 'Ensaladas' })}</option>
                  <option className="bg-bg-surface text-text-main" value="dessert">{t('game.recipeType.dessert', { defaultValue: 'Postres' })}</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-text-muted uppercase mb-1">
                  {t('optimizer.prioritize_recipe')}
                </label>
                <select 
                  value={targetRecipeId} 
                  onChange={e => setTargetRecipeId(e.target.value)} 
                  className="w-full px-3 py-2 border border-border-main rounded-lg bg-bg-app text-text-main text-xs focus:border-primary-main focus:outline-none"
                >
                  <option className="bg-bg-surface text-text-main" value="">{t('app.none', { defaultValue: 'Ninguna / Variable' })}</option>
                  {availableRecipes.map(r => (
                    <option className="bg-bg-surface text-text-main" key={r.name} value={r.name}>{translateRecipe(t, r.name)}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-text-muted uppercase mb-1">
                  {t('planner.general_objective')}
                </label>
                <select 
                  value={objective} 
                  onChange={e => setObjective(e.target.value as OptimizerObjective)} 
                  className="w-full px-3 py-2 border border-border-main rounded-lg bg-bg-app text-text-main font-semibold focus:border-primary-main focus:outline-none"
                >
                  <option className="bg-bg-surface text-text-main" value="berries">{t('app.berries', { defaultValue: 'Bayas' })}</option>
                  <option className="bg-bg-surface text-text-main" value="ingredients">{t('app.ingredients', { defaultValue: 'Ingredientes' })}</option>
                  <option className="bg-bg-surface text-text-main" value="recipe">{t('app.recipes', { defaultValue: 'Recetas' })}</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-text-muted uppercase mb-1">
                  {t('planner.weekly_notes')}
                </label>
                <textarea 
                  value={notes} 
                  onChange={e => setNotes(e.target.value)} 
                  className="w-full px-3 py-2 border border-border-main rounded-lg bg-bg-app text-text-main text-xs h-20 focus:border-primary-main focus:outline-none" 
                  placeholder="Anotaciones estratégicas para la semana..." 
                />
              </div>
            </div>
          </Panel>

          {/* Teams Assignment Panel */}
          <Panel className="space-y-4">
            <div className="flex items-center justify-between border-b border-border-main pb-2">
              <h3 className="font-extrabold text-sm text-text-main uppercase tracking-wider flex items-center gap-1.5">
                <Users size={16} /> {t('planner.assigned_teams')}
              </h3>
            </div>

            <ActionButton 
              variant="outline" 
              onClick={handleSuggestTeam} 
              disabled={isSuggesting}
              icon={Wand2}
              className="w-full py-2.5 text-primary-main font-bold border-primary-main/30 hover:bg-primary-bg"
            >
              {isSuggesting ? 'Calculando sugerencia...' : t('planner.suggest_team')}
            </ActionButton>

            <div className="space-y-3 pt-2">
              <div>
                <label className="block text-xs font-bold text-text-muted uppercase mb-1">
                  {t('planner.main_team')}
                </label>
                <select 
                  value={mainTeamId} 
                  onChange={e => setMainTeamId(e.target.value)} 
                  className="w-full px-3 py-2 border border-border-main rounded-lg bg-bg-app font-bold text-text-main text-sm focus:border-primary-main focus:outline-none"
                >
                  <option className="bg-bg-surface text-text-main" value="">{t('planner.select_team')}</option>
                  {savedTeams.map(t => (
                    <option className="bg-bg-surface text-text-main" key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
                {mainTeamId && renderTeamMiniAvatars(mainTeamId)}
              </div>

              <div>
                <label className="block text-xs font-bold text-text-muted uppercase mb-1">
                  {t('planner.alt_teams')}
                </label>
                {alternativeTeamIds.map((tid, idx) => (
                  <div key={idx} className="space-y-1 mb-2 bg-bg-app p-2 rounded-lg border border-border-main">
                    <div className="flex items-center gap-2">
                      <select 
                        value={tid} 
                        onChange={e => {
                          const nw = [...alternativeTeamIds];
                          nw[idx] = e.target.value;
                          setAlternativeTeamIds(nw);
                        }} 
                        className="flex-1 px-2 py-1.5 border border-border-main rounded-md bg-bg-surface text-text-main text-xs font-semibold focus:outline-none"
                      >
                        <option className="bg-bg-surface text-text-main" value="">{t('planner.select_team')}</option>
                        {savedTeams.map(t => (
                          <option className="bg-bg-surface text-text-main" key={t.id} value={t.id}>{t.name}</option>
                        ))}
                      </select>
                      <button 
                        onClick={() => setAlternativeTeamIds(alternativeTeamIds.filter((_, i) => i !== idx))} 
                        className="p-1 text-error-main hover:bg-error-bg rounded"
                      >
                        <X size={16} />
                      </button>
                    </div>
                    {tid && renderTeamMiniAvatars(tid)}
                  </div>
                ))}
                <button 
                  onClick={() => setAlternativeTeamIds([...alternativeTeamIds, ''])} 
                  className="text-xs font-bold text-primary-main hover:underline flex items-center gap-1 mt-1"
                >
                  <Plus size={14} /> {t('planner.add_alt_team')}
                </button>
              </div>
            </div>
          </Panel>
        </div>

        {/* Right Column: Weekly Schedule & Pantry Audit (8 cols) */}
        <div className="lg:col-span-8 space-y-6">
          {/* Day-by-Day Cards */}
          <Panel className="space-y-4">
            <div className="flex items-center justify-between border-b border-border-main pb-3">
              <div>
                <h3 className="font-extrabold text-base text-text-main">
                  {t('planner.daily_schedule')}
                </h3>
                <p className="text-xs text-text-muted">
                  Personaliza qué equipo y qué receta se cocina cada día de la semana
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {dailyPlans.map((dp, i) => {
                const isWeekend = i >= 5;
                const activeTeamId = dp.teamId || mainTeamId;

                return (
                  <div 
                    key={i} 
                    className={`p-4 rounded-xl border transition-all ${
                      isWeekend 
                        ? 'bg-gradient-to-b from-warning-bg/10 to-bg-app border-warning-main/30' 
                        : 'bg-bg-app border-border-main'
                    } space-y-3`}
                  >
                    {/* Day Header */}
                    <div className="flex items-center justify-between border-b border-border-main pb-2">
                      <div className="flex items-center gap-2">
                        <span className={`text-xs font-black px-2.5 py-1 rounded-md ${
                          isWeekend 
                            ? 'bg-warning-main text-white shadow-xs' 
                            : 'bg-bg-surface border border-border-main text-text-main'
                        }`}>
                          {days[i]}
                        </span>
                        <span className="text-[11px] font-bold text-text-muted">{t('planner.day_num')} {i + 1}</span>
                      </div>
                      {isWeekend && (
                        <span className="text-[10px] font-black text-warning-main uppercase tracking-wider">
                          {t('planner.weekend_pot')}
                        </span>
                      )}
                    </div>

                    {/* Team Selector & Mini Visual Avatars */}
                    <div>
                      <label className="block text-[10px] font-bold text-text-muted uppercase mb-1">
                        {t('planner.team')}
                      </label>
                      <select 
                        value={dp.teamId || ''} 
                        onChange={e => updateDaily(i, 'teamId', e.target.value)} 
                        className="w-full px-2.5 py-1.5 border border-border-main rounded-lg bg-bg-surface text-text-main text-xs font-semibold focus:border-primary-main focus:outline-none"
                      >
                        <option className="bg-bg-surface text-text-main" value="">(Por defecto: Equipo Principal)</option>
                        {savedTeams.map(t => (
                          <option className="bg-bg-surface text-text-main" key={t.id} value={t.id}>{t.name}</option>
                        ))}
                      </select>
                      {activeTeamId && renderTeamMiniAvatars(activeTeamId)}
                    </div>

                    {/* Recipe Override */}
                    <div>
                      <label className="block text-[10px] font-bold text-text-muted uppercase mb-1 flex items-center gap-1">
                        <Utensils size={10} /> {t('planner.recipe_day')}
                      </label>
                      <select 
                        value={dp.recipeId || ''} 
                        onChange={e => updateDaily(i, 'recipeId', e.target.value)} 
                        className="w-full px-2.5 py-1.5 border border-border-main rounded-lg bg-bg-surface text-text-main text-xs focus:border-primary-main focus:outline-none"
                      >
                        <option className="bg-bg-surface text-text-main" value="">{t('planner.use_main_recipe')}</option>
                        {availableRecipes.map(r => (
                          <option className="bg-bg-surface text-text-main" key={r.name} value={r.name}>
                            {translateRecipe(t, r.name)}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Day Notes */}
                    <div>
                      <input 
                        type="text" 
                        value={dp.notes || ''} 
                        onChange={e => updateDaily(i, 'notes', e.target.value)} 
                        placeholder={t('planner.daily_notes', { defaultValue: 'Nota rápida para el día...' })}
                        className="w-full px-2.5 py-1 border border-border-main rounded-md bg-bg-surface text-text-main text-xs focus:outline-none focus:border-primary-main" 
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </Panel>

          {/* Pantry Audit (Auditoría de Despensa) */}
          <Panel className="space-y-4">
            <div className="flex items-center justify-between border-b border-border-main pb-3">
              <div>
                <h3 className="font-extrabold text-base text-text-main">
                  {t('planner.pantry_audit')}
                </h3>
                <p className="text-xs text-text-muted">
                  {t('planner.pantry_audit_desc')}
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-bg-app text-text-muted uppercase font-bold border-b border-border-main">
                  <tr>
                    <th className="px-3 py-2.5 rounded-l-lg">{t('pokemon_detail.ingredient')}</th>
                    <th className="px-3 py-2.5 text-right">{t('planner.recipe_cost')}</th>
                    <th className="px-3 py-2.5 text-right">{t('planner.est_prod')}</th>
                    <th className="px-3 py-2.5 text-right rounded-r-lg">{t('planner.weekly_balance')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-main">
                  {audit.map((row, i) => (
                    <tr key={i} className="hover:bg-bg-app/50 transition-colors">
                      <td className="px-3 py-2.5 font-bold text-text-main">
                        {translateIngredient(t, row.ing) || row.ing}
                      </td>
                      <td className="px-3 py-2.5 text-right text-text-muted font-semibold">
                        {Math.round(row.cost)}
                      </td>
                      <td className="px-3 py-2.5 text-right text-text-muted font-semibold">
                        {Math.round(row.prod)}
                      </td>
                      <td className={`px-3 py-2.5 text-right font-black ${
                        row.diff < 0 ? 'text-error-main' : 'text-success-main'
                      }`}>
                        {row.diff > 0 ? '+' : ''}{Math.round(row.diff)}
                      </td>
                    </tr>
                  ))}
                  {audit.length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-3 py-6 text-center text-text-muted">
                        No hay ingredientes proyectados. Selecciona recetas y equipos asignados para auditar la despensa.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Panel>
        </div>
      </div>

      {compareTeams && (
        <TeamCompareModal 
          teams={compareTeams} 
          onClose={() => setCompareTeams(null)} 
        />
      )}
    </div>
  );
}

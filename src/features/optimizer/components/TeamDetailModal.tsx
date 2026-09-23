import { useState } from 'react';
import { 
  X, Utensils, ChevronDown, ChevronUp, Sparkles, 
  CheckCircle2, AlertTriangle, XCircle, ExternalLink, Lightbulb, Shield
} from 'lucide-react';
import type { TeamResult } from '../../../domain/optimizer/core';
import type { Recipe } from '../../../domain/models';
import gamedata from '../../../data/static/gamedata.json';
import { 
  translateIngredient, translateRecipe, translateBerry, 
  translateNature, translateSubskill, getSpeciesMainSkillDisplayName, translateSpecialty 
} from '../../../services/i18n-game';
import { useTranslation } from 'react-i18next';
import { db } from '../../../data/db';
import { useNavigate } from 'react-router-dom';

import { simulate21Meals } from '../../../services/recipes/recipeSimulationService';

interface TeamDetailModalProps {
  result: TeamResult | null;
  targetRecipeId?: string;
  onClose: () => void;
}

export function TeamDetailModal({ result, targetRecipeId, onClose }: TeamDetailModalProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [expandedMembers, setExpandedMembers] = useState<Set<number>>(new Set());
  const [expandedRecipes, setExpandedRecipes] = useState<Set<string>>(new Set());

  if (!result) return null;

  const toggleMember = (idx: number) => {
    setExpandedMembers(prev => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  };

  const toggleRecipe = (recipeName: string) => {
    setExpandedRecipes(prev => {
      const next = new Set(prev);
      if (next.has(recipeName)) next.delete(recipeName);
      else next.add(recipeName);
      return next;
    });
  };

  const handleSaveTeam = async () => {
    const name = window.prompt('Nombre para este equipo:');
    if (!name) return;
    try {
      await db.savedTeams.add({
        id: crypto.randomUUID(),
        name,
        createdAt: Date.now(),
        queryContext: {} as any,
        memberIds: result.evaluation.memberEstimates.map((m: any) => m.pokemon.id),
        metrics: {
          berries: result.evaluation.memberEstimates.reduce((acc: number, m: any) => acc + m.estimate.berries.reduce((s: number, b: any) => s + b.amount, 0), 0),
          ingredients: result.evaluation.memberEstimates.reduce((acc: number, m: any) => acc + m.estimate.ingredients.reduce((s: number, i: any) => s + i.amount, 0), 0),
          skills: result.evaluation.memberEstimates.reduce((acc: number, m: any) => acc + m.estimate.skillProcs, 0),
          score: result.score.score
        }
      });
      alert('Equipo guardado correctamente.');
    } catch (e) {
      console.error(e);
      alert('Error guardando equipo.');
    }
  };

  const { memberEstimates } = result.evaluation;

  // Consolidar ingredientes totales del equipo
  const teamIngredients = new Map<string, number>();
  for (const m of memberEstimates) {
    for (const ing of m.estimate.ingredients) {
      teamIngredients.set(ing.name, (teamIngredients.get(ing.name) || 0) + ing.amount);
    }
  }

  const targetId = targetRecipeId || (result as any)?.queryContext?.targetRecipeId || result.score.recipeDetails?.recipeName;

  // Evaluar cobertura de recetas utilizando la simulación de 21 comidas semanales como única fuente de verdad
  const recipes = (gamedata.recipes as unknown as Recipe[]).map(recipe => {
    const sim = simulate21Meals(recipe, teamIngredients);
    const missing: { name: string; needed: number; deficit: number }[] = [];
    
    for (const req of recipe.ingredients) {
      const produced = teamIngredients.get(req.ingredient.name) || 0;
      if (produced < req.amount) {
        missing.push({ name: req.ingredient.name, needed: req.amount, deficit: req.amount - produced });
      }
    }
    
    return {
      ...recipe,
      coverage: sim.weeklyCoveragePercent, // Real 21-meal weekly coverage (0 - 100%)
      productionRatio: sim.productionRatioPercent, // Ratio de producción relativa (ej. 215%)
      totalMealsCooked: sim.totalMealsCooked,
      missing,
      sim
    };
  });

  const sortedRecipes = recipes
    .filter(r => r.totalMealsCooked > 0 || r.productionRatio > 0)
    .sort((a, b) => {
      if (b.coverage !== a.coverage) return b.coverage - a.coverage;
      return b.productionRatio - a.productionRatio;
    });

  let topRecipes = sortedRecipes.slice(0, 5);

  if (targetId) {
    const targetItem = recipes.find(r => r.name === targetId || (r as any).id === targetId);
    if (targetItem) {
      const remaining = sortedRecipes.filter(r => r.name !== targetItem.name);
      topRecipes = [targetItem, ...remaining].slice(0, 5);
    }
  }

  // Helper para formato de tiempo en minutos y segundos
  const formatFrequency = (seconds?: number) => {
    if (!seconds) return 'N/A';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs > 0 ? `${secs}s` : ''}`;
  };

  // Generador de justificación por qué está el Pokémon en el equipo
  const getMemberRationale = (m: any) => {
    const totalBerries = m.estimate.berries.reduce((s: number, b: any) => s + b.amount, 0);
    const totalIngs = m.estimate.ingredients.reduce((s: number, i: any) => s + i.amount, 0);

    // Buscar ingrediente principal que aporta
    let topIng: { name: string; amount: number; pct: number } | null = null;
    for (const ing of m.estimate.ingredients) {
      const teamTotal = teamIngredients.get(ing.name) || 1;
      const pct = (ing.amount / teamTotal) * 100;
      if (!topIng || pct > topIng.pct) {
        topIng = { name: ing.name, amount: ing.amount, pct };
      }
    }

    if (topIng && topIng.pct >= 35) {
      return `Proveedor principal de ${translateIngredient(t, topIng.name)} (${Math.round(topIng.amount)}/día • ${Math.round(topIng.pct)}% del equipo)`;
    }

    if (totalBerries > 100) {
      return `Gran especialista en Bayas (${Math.round(totalBerries)} bayas/día para puntuación del mapa)`;
    }

    if (m.estimate.skillProcs >= 1.5) {
      return `Soporte de Habilidad Principal (${m.estimate.skillProcs.toFixed(1)} activaciones esperadas/día)`;
    }

    if (totalIngs > 15) {
      return `Soporte versátil de ingredientes (${Math.round(totalIngs)} ingredientes/día)`;
    }

    return `Equilibrio constante de bayas e ingredientes (${Math.round(totalBerries)} bayas, ${Math.round(totalIngs)} ings/día)`;
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-bg-main w-full max-w-5xl max-h-[92vh] rounded-2xl shadow-2xl overflow-hidden flex flex-col border border-border-main" onClick={e => e.stopPropagation()}>
        
        {/* HEADER */}
        <div className="flex items-center justify-between p-6 border-b border-border-main bg-bg-surface shrink-0">
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-2xl font-black flex items-center gap-2 text-text-main">
                <Sparkles className="text-primary-main" /> {t('team.detail')}
              </h2>
              <button 
                onClick={handleSaveTeam} 
                className="px-4 py-1.5 bg-success-main hover:bg-success-main/90 text-white rounded-lg text-xs font-black shadow-sm transition-all flex items-center gap-1.5"
              >
                {t('team.save')}
              </button>
            </div>
            <p className="text-xs font-semibold text-text-muted mt-1">
              Puntuación Total: <span className="font-extrabold text-text-main">{Math.round(result.score.score).toLocaleString()}</span> ({result.score.objective})
            </p>
          </div>
          <button 
            onClick={onClose} 
            className="p-2 hover:bg-bg-app rounded-full text-text-muted hover:text-text-main transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {/* BODY */}
        <div className="flex-1 overflow-y-auto p-6 space-y-8">
          
          {/* SECCIÓN POKÉMON */}
          <section>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold flex items-center gap-2 text-text-main">
                <Shield size={20} className="text-primary-main" /> {t('team.members_production')} (5)
              </h3>
              <span className="text-xs text-text-muted font-medium">Haz clic en cada tarjeta para desplegar su análisis completo</span>
            </div>

            <div className="space-y-3">
              {memberEstimates.map((m, i) => {
                const pokemonData = gamedata.species.find(s => s.name === m.pokemon.speciesId);
                const pokedexNumber = pokemonData?.pokedexNumber || 1;
                const isExpanded = expandedMembers.has(i);
                const totalBerries = Math.round(m.estimate.berries.reduce((s: number, b: any) => s + b.amount, 0));
                const totalIngs = Math.round(m.estimate.ingredients.reduce((s: number, i: any) => s + i.amount, 0));
                const rationale = getMemberRationale(m);

                const getActiveSubskills = (pokemon: any) => {
                  if (!pokemon || !pokemon.subskills) return [];
                  const lvl = pokemon.level || 1;
                  const active: string[] = [];
                  const slots: (10 | 25 | 50 | 75 | 100)[] = [10, 25, 50, 75, 100];
                  for (const slot of slots) {
                    const val = pokemon.subskills[slot];
                    if (slot <= lvl && val) {
                      active.push(val);
                    }
                  }
                  return active;
                };

                const activeSubskills = getActiveSubskills(m.pokemon);
                const berryName = pokemonData ? (typeof pokemonData.berry === 'string' ? pokemonData.berry : (pokemonData.berry as any)?.name || '') : '';

                return (
                  <div 
                    key={i} 
                    className="bg-bg-surface border border-border-main rounded-xl overflow-hidden shadow-sm transition-all hover:border-primary-main/40"
                  >
                    {/* Tarjeta Compacta */}
                    <div 
                      onClick={() => toggleMember(i)}
                      className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 cursor-pointer hover:bg-bg-app/40"
                    >
                      <div className="flex items-center gap-3 shrink-0">
                        <img 
                          src={`/pokemon/${pokedexNumber}.png`} 
                          alt={pokemonData?.displayName || m.pokemon.speciesId}
                          className="w-12 h-12 object-contain shrink-0"
                          onError={(e) => { e.currentTarget.style.display = 'none'; }}
                        />
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-extrabold text-base text-text-main">
                              {m.pokemon.nickname || pokemonData?.displayName || m.pokemon.speciesId}
                            </span>
                            <span className="bg-bg-app border border-border-main text-text-main text-xs font-bold px-2 py-0.5 rounded">
                              Nv. {m.pokemon.level || 1}
                            </span>
                            {pokemonData?.specialty && (
                              <span className="bg-primary-bg text-primary-main text-xs font-bold px-2 py-0.5 rounded capitalize">
                                {translateSpecialty(t, pokemonData.specialty)}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-text-muted mt-0.5 flex items-center gap-1.5">
                            <span>Baya: {berryName ? translateBerry(t, berryName) : ''}</span>
                            <span>•</span>
                            <span>Hab: {getSpeciesMainSkillDisplayName(t, pokemonData)}</span>
                          </p>
                        </div>
                      </div>

                      {/* Métricas rápidas */}
                      <div className="flex items-center gap-4 text-xs font-bold shrink-0">
                        <div className="flex flex-col text-center px-2 py-1 bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300 rounded-lg border border-amber-200 dark:border-amber-800">
                          <span className="text-[10px] text-amber-600 dark:text-amber-400 font-semibold">Bayas/día</span>
                          <span>{totalBerries}</span>
                        </div>
                        <div className="flex flex-col text-center px-2 py-1 bg-indigo-50 dark:bg-indigo-950/30 text-indigo-700 dark:text-indigo-300 rounded-lg border border-indigo-200 dark:border-indigo-800">
                          <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-semibold">Ings/día</span>
                          <span>{totalIngs}</span>
                        </div>
                        <div className="flex flex-col text-center px-2 py-1 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 rounded-lg border border-emerald-200 dark:border-emerald-800">
                          <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">Skill procs</span>
                          <span>{m.estimate.skillProcs.toFixed(1)}x</span>
                        </div>

                        <button className="p-1.5 rounded-lg bg-bg-app text-text-muted hover:text-text-main ml-2">
                          {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                        </button>
                      </div>
                    </div>

                    {/* Desglose Expandido */}
                    {isExpanded && (
                      <div className="p-4 border-t border-border-main bg-bg-app/50 space-y-4 text-xs">
                        
                        {/* Justificación / Rationale */}
                        <div className="bg-primary-bg/60 border border-primary-main/30 rounded-lg p-3 flex items-start gap-2 text-primary-main">
                          <Lightbulb size={16} className="shrink-0 mt-0.5" />
                          <div>
                            <span className="font-extrabold block">¿Por qué está este Pokémon en el equipo?</span>
                            <span className="text-text-main font-medium">{rationale}</span>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          
                          {/* Ingredientes producidos */}
                          <div className="bg-bg-surface p-3 rounded-lg border border-border-main">
                            <span className="font-bold text-text-main block mb-2">Desglose de Ingredientes</span>
                            {m.estimate.ingredients.length > 0 ? (
                              <div className="space-y-1.5">
                                {m.estimate.ingredients.map((ing: any) => {
                                  const teamTotal = teamIngredients.get(ing.name) || 1;
                                  const pct = Math.round((ing.amount / teamTotal) * 100);
                                  return (
                                    <div key={ing.name} className="flex items-center justify-between text-text-main">
                                      <span>{translateIngredient(t, ing.name)}</span>
                                      <span className="font-bold text-indigo-600 dark:text-indigo-400">
                                        {ing.amount.toFixed(1)}/día <span className="text-[10px] text-text-muted">({pct}%)</span>
                                      </span>
                                    </div>
                                  );
                                })}
                              </div>
                            ) : (
                              <span className="text-text-muted italic">Sin producción de ingredientes</span>
                            )}
                          </div>

                          {/* Bayas y Frecuencia */}
                          <div className="bg-bg-surface p-3 rounded-lg border border-border-main">
                            <span className="font-bold text-text-main block mb-2">Bayas y Ritmo de Ayuda</span>
                            <div className="space-y-1.5 text-text-main">
                              <div className="flex justify-between">
                                <span>Baya producida:</span>
                                <span className="font-bold text-amber-600 dark:text-amber-400">
                                  {berryName ? translateBerry(t, berryName) : ''} ({totalBerries}/día)
                                </span>
                              </div>
                              <div className="flex justify-between">
                                <span>Frecuencia base:</span>
                                <span className="font-bold">{formatFrequency(pokemonData?.frequency)}</span>
                              </div>
                              <div className="flex justify-between">
                                <span>Nivel de Lazo:</span>
                                <span className="font-bold">{m.pokemon.ribbonLevel || 0}</span>
                              </div>
                            </div>
                          </div>

                          {/* Pasivas y Naturaleza */}
                          <div className="bg-bg-surface p-3 rounded-lg border border-border-main">
                            <span className="font-bold text-text-main block mb-2">Pasivas y Naturaleza</span>
                            <div className="space-y-1.5 text-text-main">
                              <div>
                                <span className="text-text-muted block text-[10px]">Naturaleza:</span>
                                <span className="font-bold">{translateNature(t, m.pokemon.natureId || (m.pokemon as any).nature || '')}</span>
                              </div>
                              <div>
                                <span className="text-text-muted block text-[10px]">Subhabilidades Activas:</span>
                                {activeSubskills.length > 0 ? (
                                  <div className="flex flex-wrap gap-1 mt-1">
                                    {activeSubskills.map((sub: string, sIdx: number) => (
                                      <span key={sIdx} className="bg-bg-app border border-border-main px-1.5 py-0.5 rounded text-[10px] font-semibold">
                                        {translateSubskill(t, sub)}
                                      </span>
                                    ))}
                                  </div>
                                ) : (
                                  <span className="text-text-muted italic">Ninguna subhabilidad activa</span>
                                )}
                              </div>
                            </div>
                          </div>

                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>

          <hr className="border-border-main" />

          {/* SECCIÓN COBERTURA DE RECETAS */}
          <section>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-bold flex items-center gap-2 text-text-main">
                  <Utensils className="text-orange-500" /> {t('team.recipe_coverage')}
                </h3>
                <p className="text-xs text-text-muted mt-0.5">{t('team.recipe_coverage_desc')}</p>
              </div>
            </div>
            
            {topRecipes.length > 0 ? (
              <div className="space-y-4">
                {topRecipes.map(recipe => {
                  const isTarget = targetId && (recipe.name === targetId || (recipe as any).id === targetId);
                  const isRecipeExpanded = expandedRecipes.has(recipe.name);
                  const sim = recipe.sim;

                  return (
                    <div 
                      key={recipe.name} 
                      className={`bg-bg-surface border rounded-xl overflow-hidden shadow-sm transition-all ${isTarget ? 'border-amber-500/80 ring-2 ring-amber-500/20' : 'border-border-main'}`}
                    >
                      {/* Cabecera Receta */}
                      <div className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <h4 className="font-extrabold text-base text-text-main">{translateRecipe(t, recipe.name)}</h4>
                            {isTarget && (
                              <span className="text-[10px] bg-amber-500/20 text-amber-600 dark:text-amber-400 font-black px-2 py-0.5 rounded-full">
                                ★ {t('team.target_recipe_badge', { defaultValue: 'Receta Objetivo' })}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-text-muted capitalize mt-0.5">
                            {recipe.type} • {recipe.value.toLocaleString()} poder base • {recipe.nrOfIngredients} ingredientes por plato
                          </p>
                        </div>
                      
                        {/* Cobertura Bar */}
                        <div className="w-full md:w-56 shrink-0">
                          <div className="flex justify-between text-xs font-bold mb-1">
                            <span className="text-text-muted">{t('team.coverage', { defaultValue: 'Cobertura' })}</span>
                            <div className="flex items-center gap-1">
                              <span className="text-primary-main font-black">{Math.round(recipe.coverage)}%</span>
                              <span className="text-[11px] text-text-muted font-normal">({recipe.totalMealsCooked}/21 comidas)</span>
                            </div>
                          </div>
                          <div className="w-full bg-bg-app rounded-full h-2.5 overflow-hidden border border-border-main">
                            <div 
                              className={`h-full rounded-full transition-all ${recipe.coverage >= 100 ? 'bg-success-main' : recipe.coverage >= 50 ? 'bg-warning-main' : 'bg-danger-main'}`}
                              style={{ width: `${Math.min(recipe.coverage, 100)}%` }}
                            />
                          </div>
                          {recipe.productionRatio > 100 && (
                            <div className="text-[10px] text-text-muted mt-0.5 text-right font-medium">
                              Ratio prod/nec: {recipe.productionRatio}%
                            </div>
                          )}
                        </div>

                        {/* Botón Desplegar / Ocultar */}
                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            onClick={() => toggleRecipe(recipe.name)}
                            className="px-3 py-1.5 bg-primary-bg text-primary-main hover:bg-primary-main hover:text-white rounded-lg text-xs font-bold transition-all flex items-center gap-1.5"
                          >
                            {isRecipeExpanded ? (
                              <>Ocultar análisis <ChevronUp size={14} /></>
                            ) : (
                              <>Desplegar receta <ChevronDown size={14} /></>
                            )}
                          </button>
                        </div>
                      </div>

                      {/* Panel de Análisis Desplegable */}
                      {isRecipeExpanded && (
                        <div className="p-4 border-t border-border-main bg-bg-app/40 space-y-6 text-xs">
                          
                          {/* 1. DESGLOSE INGREDIENTE POR INGREDIENTE */}
                          <div>
                            <h5 className="font-extrabold text-text-main text-sm mb-3 flex items-center gap-2">
                              1. Desglose Ingrediente por Ingrediente y Aportación del Equipo
                            </h5>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                              {recipe.ingredients.map(req => {
                                const name = req.ingredient.name;
                                const dailyTeamProd = teamIngredients.get(name) || 0;
                                const isEnough = dailyTeamProd >= req.amount;

                                // Pokémon que aportan este ingrediente
                                const contributors = memberEstimates.map(m => {
                                  const pData = gamedata.species.find(s => s.name === m.pokemon.speciesId);
                                  const ingMatch = m.estimate.ingredients.find((i: any) => i.name === name);
                                  if (!ingMatch || ingMatch.amount <= 0) return null;
                                  return {
                                    name: m.pokemon.nickname || pData?.displayName || m.pokemon.speciesId,
                                    amount: ingMatch.amount,
                                    pct: Math.round((ingMatch.amount / (dailyTeamProd || 1)) * 100),
                                    freq: pData?.frequency
                                  };
                                }).filter(Boolean);

                                return (
                                  <div key={name} className="bg-bg-surface p-3 rounded-xl border border-border-main space-y-2">
                                    <div className="flex items-center justify-between border-b border-border-main pb-2">
                                      <span className="font-bold text-text-main text-sm">{translateIngredient(t, name)}</span>
                                      <div className="flex items-center gap-2 font-bold">
                                        <span>Necesario/plato: <span className="text-text-main">{req.amount}</span></span>
                                        <span>•</span>
                                        <span>Producido/día: <span className={isEnough ? 'text-success-main' : 'text-danger-main'}>{Math.round(dailyTeamProd)}</span></span>
                                      </div>
                                    </div>

                                    {/* Lista de Pokémon aportadores */}
                                    <div className="space-y-1 pt-1">
                                      <span className="text-[10px] text-text-muted font-bold block">Aportación por Pokémon:</span>
                                      {contributors.length > 0 ? (
                                        contributors.map((c: any, cIdx: number) => (
                                          <div key={cIdx} className="flex justify-between items-center text-[11px] text-text-main bg-bg-app px-2 py-1 rounded border border-border-main">
                                            <span className="font-semibold">{c.name}</span>
                                            <span className="font-bold text-indigo-600 dark:text-indigo-400">
                                              +{c.amount.toFixed(1)}/día <span className="text-[10px] text-text-muted">({c.pct}%)</span>
                                            </span>
                                          </div>
                                        ))
                                      ) : (
                                        <span className="text-danger-main font-semibold block text-[11px]">⚠️ Ningún Pokémon del equipo produce este ingrediente</span>
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>

                          {/* 2. MATRIZ SEMANAL DE 21 COMIDAS */}
                          <div className="bg-bg-surface p-4 rounded-xl border border-border-main space-y-4">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border-main pb-3">
                              <div>
                                <h5 className="font-extrabold text-text-main text-sm flex items-center gap-2">
                                  2. Análisis Semanal de 21 Comidas (Lunes a Domingo x 3 Comidas)
                                </h5>
                                <p className="text-text-muted text-[11px] mt-0.5">
                                  Simula si la producción acumulada alcanza para cocinar Desayuno, Comida y Cena durante los 7 días de la semana.
                                </p>
                              </div>
                              <div className="flex items-center gap-2 shrink-0">
                                <span className={`px-3 py-1 rounded-full text-xs font-black border ${sim.totalMealsCooked >= 21 ? 'bg-success-main/10 text-success-main border-success-main/30' : sim.totalMealsCooked >= 14 ? 'bg-warning-main/10 text-warning-main border-warning-main/30' : 'bg-danger-main/10 text-danger-main border-danger-main/30'}`}>
                                  {sim.totalMealsCooked} / 21 comidas completadas
                                </span>
                              </div>
                            </div>

                            {/* Grid 7 días */}
                            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
                              {sim.matrix.map((dayData, dIdx) => (
                                <div key={dIdx} className="bg-bg-app p-2.5 rounded-lg border border-border-main space-y-1.5 text-center">
                                  <span className="font-extrabold text-text-main block text-xs border-b border-border-main pb-1">
                                    {dayData.day}
                                  </span>
                                  <div className="space-y-1">
                                    {dayData.meals.map((m, mIdx) => (
                                      <div 
                                        key={mIdx} 
                                        className={`px-1.5 py-1 rounded text-[10px] font-bold flex items-center justify-between ${
                                          m.status === 'OK' 
                                            ? 'bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800' 
                                            : m.status === 'WARN' 
                                            ? 'bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-800' 
                                            : 'bg-red-100 dark:bg-red-950/40 text-red-700 dark:text-red-300 border border-red-300 dark:border-red-800'
                                        }`}
                                      >
                                        <span>{m.type[0]}</span>
                                        <span>
                                          {m.status === 'OK' && <CheckCircle2 size={12} className="inline text-emerald-600 dark:text-emerald-400" />}
                                          {m.status === 'WARN' && <AlertTriangle size={12} className="inline text-amber-600 dark:text-amber-400" />}
                                          {m.status === 'FAIL' && <XCircle size={12} className="inline text-red-600 dark:text-red-400" />}
                                        </span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              ))}
                            </div>

                            {/* Balance Semanal de Ingredientes */}
                            <div className="border-t border-border-main pt-3">
                              <span className="font-bold text-text-main block mb-2">Balance de Ingredientes al final de la semana (7 días):</span>
                              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                                {sim.balance.map(b => (
                                  <div key={b.name} className="flex justify-between items-center bg-bg-app p-2 rounded border border-border-main">
                                    <span className="font-medium text-text-main">{translateIngredient(t, b.name)}</span>
                                    <span className={`font-bold ${b.balance >= 0 ? 'text-success-main' : 'text-danger-main'}`}>
                                      {b.balance >= 0 ? `+${b.balance}` : b.balance} /semana
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>

                          {/* 3. BOTÓN DE NAVEGACIÓN A SECCIÓN DE RECETAS */}
                          <div className="flex justify-end">
                            <button
                              onClick={() => {
                                onClose();
                                navigate(`/recetas?recipe=${recipe.name}`);
                              }}
                              className="px-4 py-2 bg-primary-main hover:bg-primary-main/90 text-white font-bold rounded-lg text-xs shadow-sm transition-all flex items-center gap-2"
                            >
                              Ver receta completa en Recetas <ExternalLink size={14} />
                            </button>
                          </div>

                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="p-4 bg-bg-surface rounded-lg border border-border-main text-center text-text-muted">
                Este equipo no produce suficientes ingredientes para cubrir ninguna receta conocida.
              </div>
            )}
          </section>

        </div>
      </div>
    </div>
  );
}

import { X, Utensils } from 'lucide-react';
import type { TeamResult } from '../../../domain/optimizer/core';
import type { Recipe } from '../../../domain/models';
import gamedata from '../../../data/static/gamedata.json';
import { translateIngredient, translateRecipe } from '../../../services/i18n-game';
import { useTranslation } from 'react-i18next';
import { db } from '../../../data/db';

interface TeamDetailModalProps {
  result: TeamResult | null;
  onClose: () => void;
}

export function TeamDetailModal({ result, onClose }: TeamDetailModalProps) {
  const { t } = useTranslation();
  if (!result) return null;

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
      alert('Equipo guardado');
    } catch (e) {
      console.error(e);
      alert('Error guardando');
    }
  };


  const { memberEstimates } = result.evaluation;
  
  // Calcular totales
  
  // Consolidar ingredientes del equipo
  const teamIngredients = new Map<string, number>();
  for (const m of memberEstimates) {
    for (const ing of m.estimate.ingredients) {
      teamIngredients.set(ing.name, (teamIngredients.get(ing.name) || 0) + ing.amount);
    }
  }

  // Evaluar cobertura de recetas
  const recipes = (gamedata.recipes as unknown as Recipe[]).map(recipe => {
    let minCoverage = Infinity;
    const missing: { name: string, needed: number, deficit: number }[] = [];
    
    for (const req of recipe.ingredients) {
      const produced = teamIngredients.get(req.ingredient.name) || 0;
      const coverage = produced / req.amount;
      if (coverage < minCoverage) minCoverage = coverage;
      
      if (produced < req.amount) {
        missing.push({ name: req.ingredient.name, needed: req.amount, deficit: req.amount - produced });
      }
    }
    if (recipe.ingredients.length === 0) minCoverage = 0;
    
    return {
      ...recipe,
      coverage: Math.min(minCoverage * 100, 999),
      timesCookable: Math.floor(minCoverage),
      missing
    };
  }).sort((a, b) => b.coverage - a.coverage);

  const topRecipes = recipes.filter(r => r.coverage > 0).slice(0, 5);

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-bg-main w-full max-w-4xl max-h-[90vh] rounded-2xl shadow-2xl overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
        
        {/* HEADER */}
        <div className="flex items-center justify-between p-6 border-b border-border-main bg-bg-surface">
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-2xl font-bold flex items-center gap-2">Detalle del Equipo</h2>
              <button onClick={handleSaveTeam} className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white rounded text-sm font-bold">Guardar Equipo</button>
            </div>
            <p className="text-sm text-text-muted mt-1">Score: {Math.round(result.score.score).toLocaleString()} ({result.score.objective})</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full transition-colors">
            <X size={24} className="text-text-muted" />
          </button>
        </div>

        {/* BODY */}
        <div className="flex-1 overflow-y-auto p-6 space-y-8">
          
          {/* SECCIÓN POKÉMON */}
          <section>
            <h3 className="text-xl font-bold mb-4 flex items-center gap-2">Miembros y Producción Diaria</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
              {memberEstimates.map((m, i) => {
                const pokemonData = gamedata.species.find(s => s.name === m.pokemon.speciesId);
                return (
                  <div key={i} className="bg-bg-surface border border-border-main rounded-xl p-4 shadow-sm text-sm">
                    <div className="font-bold text-center border-b border-border-main pb-2 mb-2 truncate">
                      {m.pokemon.nickname || translateIngredient(t, pokemonData?.name || m.pokemon.speciesId)}
                    </div>
                    <div className="space-y-2 text-text-muted">
                      <div className="flex justify-between">
                        <span className="font-medium text-amber-600 dark:text-amber-400">Bayas:</span>
                        <span>{Math.round(m.estimate.berries.reduce((s, b) => s + b.amount, 0))}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="font-medium text-indigo-600 dark:text-indigo-400">Ings:</span>
                        <span>{Math.round(m.estimate.ingredients.reduce((s, i) => s + i.amount, 0))}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="font-medium text-emerald-600 dark:text-emerald-400">Skill:</span>
                        <span>{m.estimate.skillProcs.toFixed(1)}x</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          <hr className="border-border-main" />

          {/* SECCIÓN COBERTURA RECETAS */}
          <section>
            <h3 className="text-xl font-bold mb-4 flex items-center gap-2"><Utensils className="text-orange-500" /> Cobertura de Recetas</h3>
            <p className="text-sm text-text-muted mb-4">Basado en la producción diaria estimada de ingredientes del equipo completo.</p>
            
            {topRecipes.length > 0 ? (
              <div className="space-y-3">
                {topRecipes.map(recipe => (
                  <div key={recipe.name} className="bg-bg-surface border border-border-main rounded-lg p-4 flex flex-col md:flex-row md:items-center gap-4">
                    <div className="flex-1">
                      <h4 className="font-bold">{translateRecipe(t, recipe.name)}</h4>
                      <p className="text-xs text-text-muted capitalize">{recipe.type} • {recipe.value} poder base</p>
                    </div>
                    
                    <div className="flex-1">
                      <div className="flex justify-between text-sm mb-1">
                        <span>Cobertura</span>
                        <span className="font-bold">{recipe.coverage.toFixed(1)}%</span>
                      </div>
                      <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2">
                        <div 
                          className="bg-indigo-500 h-2 rounded-full" 
                          style={{ width: `${Math.min(recipe.coverage, 100)}%` }}
                        />
                      </div>
                    </div>

                    <div className="flex-1 text-sm text-text-muted">
                      {recipe.missing.length === 0 ? (
                        <span className="text-green-600 dark:text-green-400 font-medium flex items-center gap-1">
                          ✓ 100% cubierto
                        </span>
                      ) : (
                        <div>
                          <span className="text-red-500 font-medium">Falta:</span>
                          <ul className="list-disc list-inside text-xs mt-1">
                            {recipe.missing.map(m => (
                              <li key={m.name}>{translateIngredient(t, m.name)} (-{Math.ceil(m.deficit)})</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
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

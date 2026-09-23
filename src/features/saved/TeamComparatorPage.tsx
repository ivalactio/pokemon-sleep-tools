import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { db } from '../../data/db';
import { LocalCalculationEngine } from '../../services/optimizer/calculator/LocalCalculationEngine';
import { TeamEvaluator } from '../../services/optimizer/TeamEvaluator';


import { BerryScoringStrategy, IngredientScoringStrategy, RecipeScoringStrategy } from '../../services/optimizer/ScoringStrategies';
import gamedata from '../../data/static/gamedata.json';
import { useTranslation } from 'react-i18next';
import type { OptimizerObjective, TeamResult } from '../../domain/optimizer/core';
import type { SimulationConfig } from '../../domain/models';
import type { IslandId } from '../../domain/optimizer/islands';
import { ISLANDS } from '../../domain/optimizer/islands';
import type { SavedTeam } from '../../domain/persistence';
import type { StaticDataSchema, OwnedPokemon } from '../../domain/models';
import { TeamCompareModal } from '../optimizer/components/TeamCompareModal';
import { collectionRepository } from '../../data/repositories/DexieCollectionRepository';

const engine = new LocalCalculationEngine(gamedata as unknown as StaticDataSchema);

export default function TeamComparatorPage() {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const t1Id = searchParams.get('t1');
  const t2Id = searchParams.get('t2');

  const [team1, setTeam1] = useState<SavedTeam | null>(null);
  const [team2, setTeam2] = useState<SavedTeam | null>(null);
  
  const [island, setIsland] = useState<IslandId>('cyan');
  const [areaBonus, setAreaBonus] = useState(0);
  const [favoriteBerries, _setFavoriteBerries] = useState<string[]>([]);
  const [objective, setObjective] = useState<OptimizerObjective>('berries');
  const [recipeType, setRecipeType] = useState<'curry' | 'salad' | 'dessert'>('curry');
  const [targetRecipeId, _setTargetRecipeId] = useState<string>('');

  const [evaluatedT1, setEvaluatedT1] = useState<TeamResult | null>(null);
  const [evaluatedT2, setEvaluatedT2] = useState<TeamResult | null>(null);
  const [isEvaluating, setIsEvaluating] = useState(false);

  useEffect(() => {
    if (t1Id && t2Id) {
      Promise.all([db.savedTeams.get(t1Id), db.savedTeams.get(t2Id)]).then(([t1, t2]) => {
        setTeam1(t1 || null);
        setTeam2(t2 || null);
      });
    }
  }, [t1Id, t2Id]);

  const handleEvaluate = async () => {
    if (!team1 || !team2) return;
    setIsEvaluating(true);
    
    try {
      const allPokemon = await collectionRepository.getAll();
      const pMap = new Map(allPokemon.map(p => [p.id, p]));

      const resolveTeam = (memberIds: string[]) => {
        return memberIds.map(id => pMap.get(id)).filter(Boolean) as OwnedPokemon[];
      };

      const members1 = resolveTeam(team1.memberIds);
      const members2 = resolveTeam(team2.memberIds);

      const simConfig: SimulationConfig = {
        camp: false, bedtime: '23:00', wakeup: '07:00',
        island, areaBonus,
        favoriteBerries: favoriteBerries.length > 0 ? favoriteBerries : undefined
      };

      const evaluator = new TeamEvaluator(engine, gamedata as unknown as StaticDataSchema);
      const r1 = await evaluator.evaluate({ members: members1 }, simConfig);
      const r2 = await evaluator.evaluate({ members: members2 }, simConfig);

      let strategy;
      if (objective === 'berries') strategy = new BerryScoringStrategy(gamedata as unknown as StaticDataSchema);
      else if (objective === 'ingredients') strategy = new IngredientScoringStrategy(gamedata as unknown as StaticDataSchema);
      else strategy = new RecipeScoringStrategy(gamedata as unknown as StaticDataSchema, recipeType, targetRecipeId);

      const score1 = strategy.score(r1);
      const score2 = strategy.score(r2);

      setEvaluatedT1({ evaluation: r1, score: score1 });
      setEvaluatedT2({ evaluation: r2, score: score2 });
    } catch (e) {
      console.error(e);
      alert('Error evaluando equipos');
    } finally {
      setIsEvaluating(false);
    }
  };

  if (!team1 || !team2) {
    return <div className="p-6">Por favor selecciona 2 equipos desde Equipos Guardados.</div>;
  }

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold">Comparador Independiente</h1>
      <p className="text-text-muted">Comparando: <strong>{team1.name}</strong> vs <strong>{team2.name}</strong></p>

      <div className="bg-bg-surface border border-border-main rounded-xl p-6 shadow-sm">
        <h2 className="text-lg font-semibold mb-4 border-b border-border-main pb-2">Contexto de Evaluación</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div>
            <label className="block text-sm font-medium mb-1">Isla</label>
            <select value={island} onChange={e => setIsland(e.target.value as IslandId)} className="w-full bg-bg-main border border-border-main rounded-lg px-3 py-2">
              {ISLANDS.map(i => (
                <option key={i.id} value={i.id}>{t(`island.${i.id}`)}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Bonus de Área (%)</label>
            <input type="number" min="0" max="60" value={areaBonus} onChange={e => setAreaBonus(Number(e.target.value))} className="w-full bg-bg-main border border-border-main rounded-lg px-3 py-2" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Objetivo</label>
            <select value={objective} onChange={e => setObjective(e.target.value as OptimizerObjective)} className="w-full bg-bg-main border border-border-main rounded-lg px-3 py-2">
              <option value="berries">Fuerza de Bayas</option>
              <option value="ingredients">Valor de Ingredientes</option>
              <option value="recipe">Cobertura de Recetas</option>
            </select>
          </div>
          {objective === 'recipe' && (
            <div>
              <label className="block text-sm font-medium mb-1">Tipo de Platos</label>
              <select value={recipeType} onChange={e => setRecipeType(e.target.value as any)} className="w-full bg-bg-main border border-border-main rounded-lg px-3 py-2">
                <option value="curry">Guisos y curris</option>
                <option value="salad">Ensaladas</option>
                <option value="dessert">Postres</option>
              </select>
            </div>
          )}
        </div>
        <div className="mt-6 flex justify-end">
          <button onClick={handleEvaluate} disabled={isEvaluating} className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold">
            {isEvaluating ? 'Evaluando...' : 'Evaluar Equipos'}
          </button>
        </div>
      </div>

      {evaluatedT1 && evaluatedT2 && (
        <div className="bg-bg-surface border border-border-main rounded-xl overflow-hidden shadow-sm">
          {/* We reuse the modal component but just render its contents statically if possible, or render our own diff */}
          <div className="relative">
            <TeamCompareModal inline={true} teams={[evaluatedT1, evaluatedT2]} onClose={() => {}} />
            {/* Overlay the close button of the modal since we are rendering it inline */}
            <div className="absolute top-2 right-2 w-10 h-10 bg-bg-surface z-50 pointer-events-none"></div>
          </div>
        </div>
      )}
    </div>
  );
}

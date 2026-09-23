import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../data/db';
import { useState } from 'react';
import { TeamDetailModal } from '../optimizer/components/TeamDetailModal';
import { TeamCompareModal } from '../optimizer/components/TeamCompareModal';
import { LocalCalculationEngine } from '../../services/optimizer/calculator/LocalCalculationEngine';
import { TeamEvaluator } from '../../services/optimizer/TeamEvaluator';
import { BerryScoringStrategy, IngredientScoringStrategy, RecipeScoringStrategy } from '../../services/optimizer/ScoringStrategies';
import gamedata from '../../data/static/gamedata.json';
import type { TeamResult } from '../../domain/optimizer/core';
import type { OwnedPokemon, StaticDataSchema } from '../../domain/models';

const engine = new LocalCalculationEngine(gamedata as any as StaticDataSchema);

export default function SavedTeamsPage() {
  const teams = useLiveQuery(() => db.savedTeams.toArray()) || [];
  const collection = useLiveQuery(() => db.ownedPokemon.toArray()) || [];
  
  const [isCompareMode, setIsCompareMode] = useState(false);
  const [selectedForCompare, setSelectedForCompare] = useState<string[]>([]);
  
  const [detailTeam, setDetailTeam] = useState<TeamResult | null>(null);
  const [compareTeams, setCompareTeams] = useState<[TeamResult, TeamResult] | null>(null);

  const toggleCompare = (id: string) => {
    if (selectedForCompare.includes(id)) {
      setSelectedForCompare(selectedForCompare.filter(x => x !== id));
    } else {
      if (selectedForCompare.length >= 2) {
        alert('Solo puedes comparar 2 equipos.');
        return;
      }
      setSelectedForCompare([...selectedForCompare, id]);
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('¿Borrar equipo guardado?')) {
      await db.savedTeams.delete(id);
      setSelectedForCompare(selectedForCompare.filter(x => x !== id));
    }
  };

  const buildTeamResult = async (teamId: string): Promise<TeamResult> => {
    const saved = await db.savedTeams.get(teamId);
    if (!saved) throw new Error('Not found');
    const members = saved.memberIds.map(id => collection.find(p => p.id === id)).filter(Boolean) as OwnedPokemon[];
    const teamObj = { members };
    const evaluator = new TeamEvaluator(engine, gamedata as any as StaticDataSchema);
    const ctx = await evaluator.evaluate(teamObj, saved.queryContext.simulation);
    
    const obj = saved.queryContext.objectives[0];
    let strategy;
    if (obj === 'berries') strategy = new BerryScoringStrategy(gamedata as any as StaticDataSchema);
    else if (obj === 'ingredients') strategy = new IngredientScoringStrategy(gamedata as any as StaticDataSchema);
    else strategy = new RecipeScoringStrategy(gamedata as any as StaticDataSchema, saved.queryContext.recipeType || 'curry', saved.queryContext.targetRecipeId);
    
    const score = strategy.score(ctx);
    return { evaluation: ctx, score };
  };

  const handleCompare = async () => {
    if (selectedForCompare.length === 2) {
      const t1 = await buildTeamResult(selectedForCompare[0]);
      const t2 = await buildTeamResult(selectedForCompare[1]);
      setCompareTeams([t1, t2]);
    }
  };

  const handleViewDetail = async (id: string) => {
    const t = await buildTeamResult(id);
    setDetailTeam(t);
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Equipos Guardados</h1>
        <div className="flex gap-2 items-center">
          <label className="flex items-center gap-2 cursor-pointer font-medium text-sm">
            <input type="checkbox" checked={isCompareMode} onChange={e => {
              setIsCompareMode(e.target.checked);
              setSelectedForCompare([]);
            }} className="w-4 h-4" />
            Modo Comparación
          </label>
          
          {isCompareMode && (
            <button 
              onClick={handleCompare}
              disabled={selectedForCompare.length !== 2}
              className={`px-4 py-2 rounded font-bold ${selectedForCompare.length === 2 ? 'bg-amber-500 hover:bg-amber-600 text-white' : 'bg-slate-300 text-slate-500'}`}
            >
              Comparar ({selectedForCompare.length}/2)
            </button>
          )}
        </div>
      </div>

      <div className="space-y-4">
        {teams.map(t => {
          const isSelected = selectedForCompare.includes(t.id);
          return (
            <div key={t.id} className={`p-4 border-2 rounded-xl flex flex-col md:flex-row gap-4 items-center justify-between shadow-sm ${isSelected ? 'border-amber-500 bg-amber-50 dark:bg-amber-900/20' : 'border-border-main bg-bg-surface'}`}>
              <div className="flex-1 flex items-center gap-3">
                {isCompareMode && (
                  <input type="checkbox" checked={isSelected} onChange={() => toggleCompare(t.id)} className="w-5 h-5 rounded cursor-pointer" />
                )}
                <div>
                  <h2 className="text-lg font-bold">
                    {t.name}
                  </h2>
                  <div className="text-sm text-text-muted mt-1">
                    <p>Score Guardado: {Math.round(t.metrics?.score || 0).toLocaleString()}</p>
                  </div>
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={() => handleViewDetail(t.id)} className="px-4 py-2 bg-indigo-50 text-indigo-600 border border-indigo-200 hover:bg-indigo-100 rounded font-bold dark:bg-indigo-900/30 dark:text-indigo-400 dark:border-indigo-800">Detalles</button>
                <button onClick={() => handleDelete(t.id)} className="px-4 py-2 border border-red-200 text-red-600 hover:bg-red-50 rounded font-bold dark:hover:bg-red-900/30">Eliminar</button>
              </div>
            </div>
          );
        })}
        {teams.length === 0 && <p className="text-text-muted text-center py-12">No hay equipos guardados.</p>}
      </div>

      {detailTeam && <TeamDetailModal result={detailTeam} onClose={() => setDetailTeam(null)} />}
      {compareTeams && <TeamCompareModal teams={compareTeams} onClose={() => setCompareTeams(null)} />}
    </div>
  );
}

import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../data/db';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { TeamDetailModal } from '../optimizer/components/TeamDetailModal';
import { TeamCompareModal } from '../optimizer/components/TeamCompareModal';
import { LocalCalculationEngine } from '../../services/optimizer/calculator/LocalCalculationEngine';
import { TeamEvaluator } from '../../services/optimizer/TeamEvaluator';
import { BerryScoringStrategy, IngredientScoringStrategy, RecipeScoringStrategy } from '../../services/optimizer/ScoringStrategies';
import gamedata from '../../data/static/gamedata.json';
import type { TeamResult } from '../../domain/optimizer/core';
import type { OwnedPokemon, StaticDataSchema } from '../../domain/models';
import { ISLANDS } from '../../domain/optimizer/islands';

const engine = new LocalCalculationEngine(gamedata as any as StaticDataSchema);

export default function SavedTeamsPage() {
  const { t } = useTranslation();
  const teams = useLiveQuery(() => db.savedTeams.toArray()) || [];
  const collection = useLiveQuery(() => db.ownedPokemon.toArray()) || [];
  
  const [search, setSearch] = useState('');
  const [filterIsland, setFilterIsland] = useState('');
  const [sortBy, setSortBy] = useState('score');

  const [isCompareMode, setIsCompareMode] = useState(false);
  const [selectedForCompare, setSelectedForCompare] = useState<string[]>([]);
  
  const [detailTeam, setDetailTeam] = useState<TeamResult | null>(null);
  const [compareTeams, setCompareTeams] = useState<[TeamResult, TeamResult] | null>(null);

  const toggleCompare = (id: string) => {
    if (selectedForCompare.includes(id)) {
      setSelectedForCompare(selectedForCompare.filter(x => x !== id));
    } else {
      if (selectedForCompare.length >= 2) {
        alert(t('saved.select_two', { defaultValue: 'Solo puedes comparar 2 equipos.' }));
        return;
      }
      setSelectedForCompare([...selectedForCompare, id]);
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm(t('app.delete') + '?')) {
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
      try {
        const t1 = await buildTeamResult(selectedForCompare[0]);
        const t2 = await buildTeamResult(selectedForCompare[1]);
        setCompareTeams([t1, t2]);
      } catch (e) {
        console.error("Error comparando", e);
        alert(t('saved.comparator_title'));
      }
    }
  };

  const filteredTeams = teams.filter(t => {
    if (search && !t.name.toLowerCase().includes(search.toLowerCase())) return false;
    if (filterIsland && t.queryContext?.simulation?.island !== filterIsland) return false;
    return true;
  }).sort((a, b) => {
    if (sortBy === 'score') return (b.metrics?.score || 0) - (a.metrics?.score || 0);
    return (b.createdAt || 0) - (a.createdAt || 0);
  });

  const handleViewDetail = async (id: string) => {
    const t = await buildTeamResult(id);
    setDetailTeam(t);
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">{t('saved.teams_title')}</h1>
        <div className="flex gap-2 items-center">
          <label className="flex items-center gap-2 cursor-pointer font-medium text-sm">
            <input type="checkbox" checked={isCompareMode} onChange={e => {
              setIsCompareMode(e.target.checked);
              setSelectedForCompare([]);
            }} className="w-4 h-4 rounded text-primary-main" />
            {t('optimizer.compare_status', { defaultValue: 'Modo Comparación' })}
          </label>
          
          {isCompareMode && (
            <button 
              onClick={handleCompare}
              disabled={selectedForCompare.length !== 2}
              className={`px-4 py-2 rounded-lg font-bold transition-colors ${selectedForCompare.length === 2 ? 'bg-primary-main hover:bg-primary-hover text-white' : 'bg-bg-app text-text-muted border border-border-main'}`}
            >
              {t('optimizer.compare_action', { defaultValue: 'Comparar' })} ({selectedForCompare.length}/2)
            </button>
          )}
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-4 p-4 bg-bg-surface border border-border-main rounded-xl">
        <input 
          type="text" 
          placeholder={t('collection.search', { defaultValue: 'Buscar por nombre...' })} 
          value={search} 
          onChange={e => setSearch(e.target.value)} 
          className="flex-1 p-2 rounded-lg border border-border-main bg-bg-surface text-text-main focus:outline-none focus:border-primary-main"
        />
        <select 
          value={filterIsland} 
          onChange={e => setFilterIsland(e.target.value)}
          className="p-2 rounded-lg border border-border-main bg-bg-surface text-text-main font-semibold focus:outline-none"
        >
          <option className="bg-bg-surface text-text-main" value="">{t('app.all', { defaultValue: 'Todas las islas' })}</option>
          {ISLANDS.map(i => (
            <option className="bg-bg-surface text-text-main" key={i.id} value={i.id}>
              {t(`islands.${i.id}`)}
            </option>
          ))}
        </select>
        <select 
          value={sortBy} 
          onChange={e => setSortBy(e.target.value)}
          className="p-2 rounded-lg border border-border-main bg-bg-surface text-text-main font-semibold focus:outline-none"
        >
          <option className="bg-bg-surface text-text-main" value="score">Score DESC</option>
          <option className="bg-bg-surface text-text-main" value="recent">Recientes</option>
        </select>
      </div>

      <div className="space-y-4">
        {filteredTeams.map(item => {
          const isSelected = selectedForCompare.includes(item.id);
          return (
            <div key={item.id} className={`p-4 border rounded-xl flex flex-col md:flex-row gap-4 items-center justify-between shadow-xs transition-colors ${isSelected ? 'border-primary-main bg-primary-bg/20' : 'border-border-main bg-bg-surface'}`}>
              <div className="flex-1 flex items-center gap-3">
                {isCompareMode && (
                  <input type="checkbox" checked={isSelected} onChange={() => toggleCompare(item.id)} className="w-5 h-5 rounded cursor-pointer text-primary-main" />
                )}
                <div>
                  <h2 className="text-lg font-bold text-text-main">
                    {item.name}
                  </h2>
                  <div className="text-sm text-text-muted mt-1">
                    <p>Score: {Math.round(item.metrics?.score || 0).toLocaleString()}</p>
                  </div>
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={() => handleViewDetail(item.id)} className="px-4 py-2 bg-primary-bg text-primary-main hover:bg-primary-main hover:text-white border border-primary-main/30 rounded-lg font-bold transition-colors">
                  {t('team.detail')}
                </button>
                <button onClick={() => handleDelete(item.id)} className="px-4 py-2 border border-error-main/30 text-error-main hover:bg-error-bg rounded-lg font-bold transition-colors">
                  {t('app.delete')}
                </button>
              </div>
            </div>
          );
        })}
        {filteredTeams.length === 0 && <p className="text-text-muted text-center py-12">{t('saved.empty_teams')}</p>}
      </div>

      {detailTeam && <TeamDetailModal result={detailTeam} onClose={() => setDetailTeam(null)} />}
      {compareTeams && <TeamCompareModal teams={compareTeams} onClose={() => setCompareTeams(null)} />}
    </div>
  );
}

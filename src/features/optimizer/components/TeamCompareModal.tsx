import { X, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import type { TeamResult } from '../../../domain/optimizer/core';
import gamedata from '../../../data/static/gamedata.json';
import { translateIngredient } from '../../../services/i18n-game';
import { useTranslation } from 'react-i18next';

interface TeamCompareModalProps {
  teams: [TeamResult, TeamResult];
  onClose: () => void;
  inline?: boolean;
}

export function TeamCompareModal({ teams, onClose, inline }: TeamCompareModalProps) {
  const { t } = useTranslation();
  const [t1, t2] = teams;

  const t1Berries = t1.evaluation.memberEstimates.reduce((acc, m) => acc + m.estimate.berries.reduce((s, b) => s + b.amount, 0), 0);
  const t2Berries = t2.evaluation.memberEstimates.reduce((acc, m) => acc + m.estimate.berries.reduce((s, b) => s + b.amount, 0), 0);

  const t1Ings = t1.evaluation.memberEstimates.reduce((acc, m) => acc + m.estimate.ingredients.reduce((s, i) => s + i.amount, 0), 0);
  const t2Ings = t2.evaluation.memberEstimates.reduce((acc, m) => acc + m.estimate.ingredients.reduce((s, i) => s + i.amount, 0), 0);

  const t1Skills = t1.evaluation.memberEstimates.reduce((acc, m) => acc + m.estimate.skillProcs, 0);
  const t2Skills = t2.evaluation.memberEstimates.reduce((acc, m) => acc + m.estimate.skillProcs, 0);

  const diffScore = t2.score.score - t1.score.score;
  const diffBerries = t2Berries - t1Berries;
  const diffIngs = t2Ings - t1Ings;

  const renderDiff = (diff: number, isPercent = false) => {
    if (Math.abs(diff) < 0.1) return <span className="text-text-muted flex items-center gap-1"><Minus size={14}/> 0</span>;
    if (diff > 0) return <span className="text-green-500 font-bold flex items-center gap-1"><TrendingUp size={14}/> +{diff.toLocaleString(undefined, {maximumFractionDigits: 1})}{isPercent ? '%' : ''}</span>;
    return <span className="text-red-500 font-bold flex items-center gap-1"><TrendingDown size={14}/> {diff.toLocaleString(undefined, {maximumFractionDigits: 1})}{isPercent ? '%' : ''}</span>;
  };

  const pctDiff = (v1: number, v2: number) => {
    if (v1 === 0) return v2 > 0 ? 100 : 0;
    return ((v2 - v1) / v1) * 100;
  };

  return (
    <div className={inline ? "w-full" : "fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 backdrop-blur-sm"} onClick={inline ? undefined : onClose}>
      <div className={`bg-bg-main w-full overflow-hidden flex flex-col ${inline ? "" : "max-w-4xl max-h-[90vh] rounded-2xl shadow-2xl"}`} onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-6 border-b border-border-main bg-bg-surface">
          <h2 className="text-2xl font-bold">{t('team.compare')}</h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full">
            <X size={24} className="text-text-muted" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-8">
          <div className="grid grid-cols-3 gap-4 font-medium text-sm">
            <div className="text-text-muted font-bold pb-2 border-b border-border-main">{t('team.metric')}</div>
            <div className="pb-2 border-b border-border-main font-bold">{t('team.team_a')}</div>
            <div className="pb-2 border-b border-border-main font-bold">{t('team.team_b')}</div>

            <div className="py-2 text-text-muted">Puntuación ({t1.score.objective})</div>
            <div className="py-2">{Math.round(t1.score.score).toLocaleString()}</div>
            <div className="py-2 flex items-center gap-2">
              {Math.round(t2.score.score).toLocaleString()}
              <span className="text-xs bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded">{renderDiff(diffScore)}</span>
              <span className="text-xs bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded">{renderDiff(pctDiff(t1.score.score, t2.score.score), true)}</span>
            </div>

            <div className="py-2 text-amber-600 dark:text-amber-400">{t('team.berries_day')}</div>
            <div className="py-2">{t1Berries.toFixed(1)}</div>
            <div className="py-2 flex items-center gap-2">
              {t2Berries.toFixed(1)}
              <span className="text-xs bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded">{renderDiff(diffBerries)}</span>
              <span className="text-xs bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded">{renderDiff(pctDiff(t1Berries, t2Berries), true)}</span>
            </div>

            <div className="py-2 text-indigo-600 dark:text-indigo-400">{t('team.ings_day')}</div>
            <div className="py-2">{t1Ings.toFixed(1)}</div>
            <div className="py-2 flex items-center gap-2">
              {t2Ings.toFixed(1)}
              <span className="text-xs bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded">{renderDiff(diffIngs)}</span>
              <span className="text-xs bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded">{renderDiff(pctDiff(t1Ings, t2Ings), true)}</span>
            </div>
            
            <div className="py-2 text-emerald-600 dark:text-emerald-400">{t('team.skills_day')}</div>
            <div className="py-2">{t1Skills.toFixed(1)}</div>
            <div className="py-2 flex items-center gap-2">
              {t2Skills.toFixed(1)}
              <span className="text-xs bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded">{renderDiff(t2Skills - t1Skills)}</span>
              <span className="text-xs bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded">{renderDiff(pctDiff(t1Skills, t2Skills), true)}</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-8 mt-8">
            <div>
              <h3 className="font-bold text-lg mb-4 text-center">{t('team.team_a')}</h3>
              <div className="space-y-2">
                {t1.evaluation.memberEstimates.map((m, i) => {
                  const sp = gamedata.species.find(s => s.name === m.pokemon.speciesId);
                  return (
                    <div key={i} className="flex justify-between p-3 bg-bg-surface border border-border-main rounded-lg text-sm">
                      <span className="font-bold">{m.pokemon.nickname || translateIngredient(t, sp?.name || m.pokemon.speciesId)} (Nv {m.pokemon.level})</span>
                      <span className="text-text-muted">{Math.round(m.estimate.berries.reduce((s,b)=>s+b.amount,0))} bayas, {Math.round(m.estimate.ingredients.reduce((s,i)=>s+i.amount,0))} ings</span>
                    </div>
                  );
                })}
              </div>
            </div>
            <div>
              <h3 className="font-bold text-lg mb-4 text-center">{t('team.team_b')}</h3>
              <div className="space-y-2">
                {t2.evaluation.memberEstimates.map((m, i) => {
                  const sp = gamedata.species.find(s => s.name === m.pokemon.speciesId);
                  return (
                    <div key={i} className="flex justify-between p-3 bg-bg-surface border border-border-main rounded-lg text-sm">
                      <span className="font-bold">{m.pokemon.nickname || translateIngredient(t, sp?.name || m.pokemon.speciesId)} (Nv {m.pokemon.level})</span>
                      <span className="text-text-muted">{Math.round(m.estimate.berries.reduce((s,b)=>s+b.amount,0))} bayas, {Math.round(m.estimate.ingredients.reduce((s,i)=>s+i.amount,0))} ings</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
          
        </div>
      </div>
    </div>
  );
}

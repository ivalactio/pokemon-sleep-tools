import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { collectionRepository } from '../../data/repositories/DexieCollectionRepository';
import { ArrowLeft, Trash2, Calculator, AlertCircle } from 'lucide-react';
import gamedata from '../../data/static/gamedata.json';
import { useTranslation } from 'react-i18next';
import { translateSubskill, translateMainSkill, translateIngredient, translateBerry, getNatureDisplayName } from '../../services/i18n-game';
import { SleepApiEngine } from '../../services/sleepapi/sleepapi-engine';
import type { ProductionEstimate, SimulationConfig, StaticDataSchema } from '../../domain/models';
import { ISLANDS } from '../../domain/optimizer/islands';

const engine = new SleepApiEngine(gamedata as unknown as StaticDataSchema);

export default function PokemonDetail() {
  const { t } = useTranslation();
  const { id } = useParams();
  const navigate = useNavigate();

  const pokemon = useLiveQuery(() => id ? collectionRepository.getById(id) : undefined, [id]);

  const [config, setConfig] = useState<SimulationConfig>({
    camp: false,
    bedtime: '22:00',
    wakeup: '06:00',
    island: 'greengrass',
    areaBonus: 0
  });

  const [estimate, setEstimate] = useState<ProductionEstimate | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!pokemon) return <div className="p-8 text-center text-text-muted">{t('app.loading')}</div>;

  const handleDelete = async () => {
    if (window.confirm("¿Seguro que quieres eliminar este Pokémon?")) {
      await collectionRepository.delete(pokemon.id);
      navigate('/coleccion');
    }
  };

  const handleCalculate = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await engine.estimateProduction(pokemon, config);
      setEstimate(res);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <button onClick={() => navigate(-1)} className="mb-4 flex items-center gap-2 text-text-muted hover:text-text-main font-medium">
        <ArrowLeft size={20} /> Volver
      </button>

      <div className="bg-bg-surface p-6 rounded-xl border border-border-main shadow-sm relative">
        <button onClick={handleDelete} className="absolute top-6 right-6 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 dark:bg-red-950/30 p-2 rounded-lg">
          <Trash2 size={20} />
        </button>
        <div className="flex justify-between items-start mb-6">
          <div>
            <h2 className="text-3xl font-bold mb-1">
              <input type="text" value={pokemon.nickname || ''} placeholder={pokemon.speciesId} onChange={e => collectionRepository.update({ ...pokemon, nickname: e.target.value })} className="bg-transparent border-b border-dashed border-border-main focus:border-indigo-500 focus:outline-none" />
            </h2>
            <div className="flex items-center gap-2 mt-2">
              <select value={pokemon.speciesId} onChange={e => {
                const newSpecies = gamedata.species.find(s => s.name === e.target.value);
                const ing0 = newSpecies?.ingredient0?.[0]?.ingredient.name || null;
                collectionRepository.update({
                  ...pokemon,
                  speciesId: e.target.value,
                  ingredientChoices: { 1: ing0, 30: null, 60: null }
                });
              }} className="p-1 border border-border-main rounded text-sm bg-bg-app">
                {gamedata.species.map(s => <option key={s.name} value={s.name}>{s.displayName}</option>)}
              </select>
              <span className="text-text-muted">•</span>
              <span className="text-sm font-medium text-text-muted">{t('app.level')}</span>
              <input type="number" min="1" max="100" value={pokemon.level} onChange={e => collectionRepository.update({ ...pokemon, level: parseInt(e.target.value) || 1 })} className="w-16 p-1 border border-border-main rounded text-sm bg-bg-app" />
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm font-medium text-text-main bg-bg-app px-3 py-1.5 rounded-lg border border-border-main cursor-pointer">
            <input type="checkbox" checked={pokemon.shiny} onChange={e => collectionRepository.update({ ...pokemon, shiny: e.target.checked })} className="rounded text-indigo-600" />
            {t('pokemon_detail.shiny')}
          </label>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="space-y-4">
            <div className="bg-bg-app p-4 rounded-lg border border-border-main">
              <h3 className="font-bold text-text-main mb-3 text-sm uppercase tracking-wide">{t('pokemon_detail.base_stats')}</h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-text-muted">{t('pokemon_detail.nature')}</span>
                  <select value={pokemon.natureId} onChange={e => collectionRepository.update({ ...pokemon, natureId: e.target.value })} className="p-1.5 border border-border-main rounded text-sm bg-bg-surface min-w-[120px] max-w-[200px] truncate">
                    <option value="">{t('pokemon_detail.none')}</option>
                    {gamedata.natures.map(n => <option key={n.name} value={n.name}>{getNatureDisplayName(t, n.name)}</option>)}
                  </select>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-text-muted">{t('pokemon_detail.ribbon_level')}</span>
                  <select value={pokemon.ribbonLevel || 0} onChange={e => collectionRepository.update({ ...pokemon, ribbonLevel: parseInt(e.target.value) as 0|1|2|3|4 })} className="p-1.5 border border-border-main rounded text-sm bg-bg-surface min-w-[120px]">
                    {[0, 1, 2, 3, 4].map(r => <option key={r} value={r}>{t('pokemon_detail.level_short')} {r}</option>)}
                  </select>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-text-muted">{t('pokemon_detail.sneaky_snacking')}</span>
                  <input type="checkbox" checked={pokemon.sneakySnacking} onChange={e => collectionRepository.update({ ...pokemon, sneakySnacking: e.target.checked })} className="rounded text-indigo-600" />
                </div>
              </div>
            </div>

            <div className="bg-blue-50 dark:bg-blue-950/30 p-4 rounded-lg border border-blue-200 dark:border-blue-900/50">
              <h3 className="font-bold text-blue-900 dark:text-blue-300 mb-3 text-sm uppercase tracking-wide">{t('pokemon_detail.main_skill')}</h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-blue-800">{t('pokemon_detail.skill')}</span>
                  <span className="text-sm font-medium bg-blue-100 dark:bg-blue-900/50 text-blue-900 dark:text-blue-300 px-2 py-1 rounded">
                    {translateMainSkill(t, gamedata.species.find(s => s.name === pokemon.speciesId)?.skill?.name || '') || t('pokemon_detail.unknown')}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-blue-800">{t('pokemon_detail.skill_level')}</span>
                  <select value={pokemon.skillLevel} onChange={e => collectionRepository.update({ ...pokemon, skillLevel: parseInt(e.target.value) || 1 })} className="p-1.5 border border-blue-300 dark:border-blue-800 rounded text-sm bg-bg-surface min-w-[120px]">
                    {[1, 2, 3, 4, 5, 6, 7].map(l => <option key={l} value={l}>{t('pokemon_detail.level_short')} {l}</option>)}
                  </select>
                </div>
              </div>
            </div>

            <div className="bg-amber-50 dark:bg-amber-950/30 p-4 rounded-lg border border-amber-200 dark:border-amber-900/50">
              <h3 className="font-bold text-amber-900 mb-3 text-sm uppercase tracking-wide">{t('pokemon_detail.ingredients')}</h3>
              <div className="space-y-3">
                {[1, 30, 60].map(lvl => {
                  const species = gamedata.species.find(s => s.name === pokemon.speciesId);
                  const options = species ? (lvl === 1 ? species.ingredient0 : lvl === 30 ? species.ingredient30 : species.ingredient60) : [];
                  return (
                    <div key={lvl} className="flex justify-between items-center">
                      <span className={`text-sm ${pokemon.level >= lvl ? 'text-amber-900 font-medium' : 'text-amber-700/60'}`}>{t('pokemon_detail.level_short')} {lvl}</span>
                      <select
                        value={pokemon.ingredientChoices[lvl as 1|30|60] || ''}
                        onChange={e => collectionRepository.update({ ...pokemon, ingredientChoices: { ...pokemon.ingredientChoices, [lvl]: e.target.value || null } })}
                        className={`p-1.5 border border-amber-300 dark:border-amber-800 rounded text-sm bg-bg-surface min-w-[120px] ${pokemon.level >= lvl ? '' : 'opacity-70'}`}
                      >
                        <option value="">{t('pokemon_detail.select')}</option>
                        {options?.map(opt => (
                          <option key={opt.ingredient.name} value={opt.ingredient.name}>{translateIngredient(t, opt.ingredient.name)} (x{opt.amount})</option>
                        ))}
                      </select>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="bg-purple-50 dark:bg-purple-950/30 p-4 rounded-lg border border-purple-200 dark:border-purple-900/50 h-full">
              <h3 className="font-bold text-purple-900 mb-3 text-sm uppercase tracking-wide">{t('pokemon_detail.subskills')}</h3>
              <div className="space-y-3">
                {[10, 25, 50, 75, 100].map(lvl => (
                  <div key={lvl} className="flex justify-between items-center">
                    <span className={`text-sm w-12 ${pokemon.level >= lvl ? 'text-purple-900 font-medium' : 'text-purple-700/60'}`}>{t('pokemon_detail.level_short')} {lvl}</span>
                    <select
                      value={pokemon.subskills[lvl as 10|25|50|75|100] || ''}
                      onChange={e => collectionRepository.update({ ...pokemon, subskills: { ...pokemon.subskills, [lvl]: e.target.value || null } })}
                      className={`flex-1 p-1.5 border border-purple-300 dark:border-purple-800 rounded text-sm bg-bg-surface ${pokemon.level >= lvl ? '' : 'opacity-70'}`}
                    >
                      <option value="">{t('pokemon_detail.empty')}</option>
                      {gamedata.subSkills
                        .filter(sk => {
                          const isSelectedElsewhere = Object.entries(pokemon.subskills).some(([otherLvl, subskillName]) =>
                            Number(otherLvl) !== lvl && subskillName === sk.name
                          );
                          return !isSelectedElsewhere;
                        })
                        .map(sk => (
                          <option key={sk.name} value={sk.name}>{translateSubskill(t, sk.name)}</option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="bg-bg-app p-6 rounded-xl border border-border-main">
          <h3 className="font-bold text-text-main mb-4 flex items-center gap-2">
            <Calculator size={20} className="text-indigo-600" />
            {t('pokemon_detail.calc_production')}
          </h3>

          <div className="flex flex-wrap gap-4 mb-4 items-end">
            <label className="flex flex-col gap-1 text-sm font-medium text-text-main">
              {t('pokemon_detail.camp')}
              <input type="checkbox" checked={config.camp} onChange={e => setConfig({...config, camp: e.target.checked})} className="w-5 h-5 rounded border-border-main text-indigo-600 focus:ring-indigo-500" />
            </label>
            <label className="flex flex-col gap-1 text-sm font-medium text-text-main">
              {t('pokemon_detail.bedtime')}
              <input type="time" value={config.bedtime} onChange={e => setConfig({...config, bedtime: e.target.value})} className="border border-border-main rounded px-2 py-1" />
            </label>
            <label className="flex flex-col gap-1 text-sm font-medium text-text-main">
              {t('pokemon_detail.wakeup')}
              <input type="time" value={config.wakeup} onChange={e => setConfig({...config, wakeup: e.target.value})} className="border border-border-main rounded px-2 py-1" />
            </label>
            <label className="flex flex-col gap-1 text-sm font-medium text-text-main">
              {t('pokemon_detail.island')}
              <select value={config.island} onChange={e => setConfig({...config, island: e.target.value as any})} className="border border-border-main rounded px-2 py-1 bg-bg-surface">
                {ISLANDS.map(island => <option key={island.id} value={island.id}>{island.name}</option>)}
              </select>
            </label>
            <label className="flex flex-col gap-1 text-sm font-medium text-text-main">
              {t('pokemon_detail.area_bonus')}
              <input type="number" min="0" max="100" value={config.areaBonus} onChange={e => setConfig({...config, areaBonus: parseInt(e.target.value) || 0})} className="border border-border-main rounded px-2 py-1 w-20" />
            </label>
            <button
              onClick={handleCalculate}
              disabled={loading}
              className="ml-auto bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2 px-4 rounded-lg disabled:opacity-50"
            >
              {loading ? t('pokemon_detail.calculating') : t('pokemon_detail.calculate')}
            </button>
          </div>

          {error && (
            <div className="bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-400 p-3 rounded-lg flex items-center gap-2 text-sm mb-4">
              <AlertCircle size={16} /> {error}
            </div>
          )}

          {estimate && (
            <div className="bg-bg-surface p-4 rounded-lg border border-indigo-100 dark:border-indigo-900/50 shadow-sm mt-4">
              <div className="flex justify-between items-center mb-4">
                <h4 className="font-bold text-text-main">{t('pokemon_detail.estimated_result')}</h4>
                <span className="text-xs text-text-muted bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded">{t('pokemon_detail.period')}: {estimate.period}</span>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div className="bg-orange-50 dark:bg-orange-950/30 p-3 rounded-lg border border-orange-100 dark:border-orange-900/50">
                  <div className="text-xs font-bold text-orange-800 uppercase mb-1">{t('pokemon_detail.berries')}</div>
                  {estimate.berries.map((b, i) => (
                    <div key={i} className="flex justify-between font-medium text-orange-900">
                      <span>{translateBerry(t, b.name)}</span>
                      <span>{b.amount.toFixed(1)}</span>
                    </div>
                  ))}
                </div>

                <div className="bg-amber-50 dark:bg-amber-950/30 p-3 rounded-lg border border-amber-100 dark:border-amber-900/50">
                  <div className="text-xs font-bold text-amber-800 uppercase mb-1">{t('pokemon_detail.ingredients')}</div>
                  {estimate.ingredients.map((ing, i) => (
                    <div key={i} className="flex justify-between font-medium text-amber-900">
                      <span>{translateIngredient(t, ing.name)}</span>
                      <span>{ing.amount.toFixed(1)}</span>
                    </div>
                  ))}
                </div>

                <div className="bg-blue-50 dark:bg-blue-950/30 p-3 rounded-lg border border-blue-100 dark:border-blue-900/50">
                  <div className="text-xs font-bold text-blue-800 uppercase mb-1">{t('pokemon_detail.skill')}</div>
                  <div className="font-medium text-blue-900 dark:text-blue-300 text-xl">{estimate.skillProcs.toFixed(2)} <span className="text-sm">{t('pokemon_detail.procs')}</span></div>
                </div>
              </div>
              <div className="mt-3 text-xs text-text-muted text-right">
                {t('pokemon_detail.calculated_at')} {new Date(estimate.calculatedAt).toLocaleTimeString()}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}


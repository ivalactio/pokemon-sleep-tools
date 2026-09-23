import { useState, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../data/db';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { 
  GitCompare, ArrowRightLeft, Sparkles, Zap, 
  Package, Plus, TrendingUp, TrendingDown, Minus, Compass, AlertCircle
} from 'lucide-react';
import gamedata from '../../data/static/gamedata.json';
import { SleepApiEngine } from '../../services/sleepapi/sleepapi-engine';
import { translateBerry, translateIngredient, getNatureDisplayName, getSpeciesMainSkillDisplayName, translateSpecialty } from '../../services/i18n-game';
import type { ProductionEstimate, SimulationConfig, StaticDataSchema } from '../../domain/models';
import { ISLANDS } from '../../domain/optimizer/islands';
import { Badge, Panel, ActionButton } from '../../components/ui';

const engine = new SleepApiEngine(gamedata as unknown as StaticDataSchema);

export default function ComparatorPage() {
  const { t } = useTranslation();
  const pokemonList = useLiveQuery(() => db.ownedPokemon.toArray()) || [];

  const [id1, setId1] = useState<string>('');
  const [id2, setId2] = useState<string>('');

  const [config, setConfig] = useState<SimulationConfig>({
    camp: false,
    bedtime: '22:00',
    wakeup: '06:00',
    island: 'greengrass',
    areaBonus: 0
  });

  const [estimate1, setEstimate1] = useState<ProductionEstimate | null>(null);
  const [estimate2, setEstimate2] = useState<ProductionEstimate | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const p1 = pokemonList.find(p => p.id === id1);
  const p2 = pokemonList.find(p => p.id === id2);

  const species1 = p1 ? gamedata.species.find(s => s.name === p1.speciesId) : null;
  const species2 = p2 ? gamedata.species.find(s => s.name === p2.speciesId) : null;

  // Auto-run evaluation when 2 pokemon are selected or config changes
  useEffect(() => {
    let isCancelled = false;

    async function evaluate() {
      if (!p1 || !p2) {
        setEstimate1(null);
        setEstimate2(null);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const [est1, est2] = await Promise.all([
          engine.estimateProduction(p1, config),
          engine.estimateProduction(p2, config)
        ]);

        if (!isCancelled) {
          setEstimate1(est1);
          setEstimate2(est2);
        }
      } catch (err: unknown) {
        if (!isCancelled) {
          setError(err instanceof Error ? err.message : 'Error al comparar Pokémon');
        }
      } finally {
        if (!isCancelled) {
          setLoading(false);
        }
      }
    }

    evaluate();

    return () => {
      isCancelled = true;
    };
  }, [id1, id2, config, pokemonList]);

  const handleSwap = () => {
    setId1(id2);
    setId2(id1);
  };

  const getSpecialtyBadge = (spec?: string) => {
    if (!spec) return null;
    if (spec === 'berry') return <Badge variant="warning">🍓 {translateSpecialty(t, 'berry')}</Badge>;
    if (spec === 'ingredient') return <Badge variant="success">🥗 {translateSpecialty(t, 'ingredient')}</Badge>;
    if (spec === 'skill') return <Badge variant="primary">⚡ {translateSpecialty(t, 'skill')}</Badge>;
    return <Badge variant="info">✨ {translateSpecialty(t, spec)}</Badge>;
  };

  const renderDiff = (v1: number, v2: number, unit = '') => {
    const diff = v2 - v1;
    if (Math.abs(diff) < 0.1) {
      return <span className="text-text-muted text-xs flex items-center gap-1"><Minus size={12}/> 0{unit}</span>;
    }
    if (diff > 0) {
      return <span className="text-success-main font-bold text-xs flex items-center gap-1"><TrendingUp size={12}/> +{diff.toFixed(1)}{unit}</span>;
    }
    return <span className="text-error-main font-bold text-xs flex items-center gap-1"><TrendingDown size={12}/> {diff.toFixed(1)}{unit}</span>;
  };

  const totBerries = (est: ProductionEstimate | null) => est ? est.berries.reduce((s, b) => s + b.amount, 0) : 0;
  const totIngs = (est: ProductionEstimate | null) => est ? est.ingredients.reduce((s, i) => s + i.amount, 0) : 0;
  const totSkills = (est: ProductionEstimate | null) => est ? est.skillProcs : 0;

  return (
    <div className="space-y-6 pb-20 max-w-6xl mx-auto">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border-main pb-4">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-primary-bg text-primary-main">
            <GitCompare size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-black text-text-main">
              {t('team.compare', { defaultValue: 'Comparador de Pokémon' })}
            </h1>
            <p className="text-xs text-text-muted">
              {t('saved.comparator_desc', { defaultValue: 'Selecciona dos Pokémon de tu caja para comparar su producción y habilidades cara a cara.' })}
            </p>
          </div>
        </div>

        {p1 && p2 && (
          <ActionButton 
            variant="outline" 
            onClick={handleSwap} 
            icon={ArrowRightLeft}
            className="self-start sm:self-center"
          >
            {t('app.swap', { defaultValue: 'Intercambiar' })}
          </ActionButton>
        )}
      </div>

      {/* Empty Collection State */}
      {pokemonList.length === 0 ? (
        <Panel className="p-12 text-center space-y-4">
          <Package size={48} className="mx-auto text-text-muted opacity-50" />
          <h2 className="text-xl font-bold text-text-main">{t('collection.empty')}</h2>
          <p className="text-sm text-text-muted max-w-md mx-auto">
            {t('collection.add_first', { defaultValue: 'Añade Pokémon a tu colección para poder compararlos cara a cara.' })}
          </p>
          <Link to="/coleccion/nuevo" className="inline-flex items-center gap-2 px-4 py-2 bg-primary-main text-white font-bold rounded-xl hover:bg-primary-main/90 transition-colors">
            <Plus size={18} /> {t('pokemon_form.title_add')}
          </Link>
        </Panel>
      ) : (
        <>
          {/* Selector Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Pokemon 1 Selector */}
            <div className={`bg-bg-surface border rounded-2xl p-5 shadow-sm space-y-4 transition-colors ${id1 ? 'border-primary-main/40' : 'border-border-main'}`}>
              <div className="flex justify-between items-center">
                <span className="text-xs font-extrabold text-primary-main uppercase tracking-wider">
                  {t('team.team_a', { defaultValue: 'Pokémon A' })}
                </span>
                {id1 && (
                  <button onClick={() => setId1('')} className="text-xs font-bold text-text-muted hover:text-error-main">
                    {t('app.clear', { defaultValue: 'Limpiar' })}
                  </button>
                )}
              </div>

              <select 
                value={id1} 
                onChange={e => setId1(e.target.value)} 
                className="w-full p-2.5 bg-bg-app border border-border-main rounded-xl text-text-main font-bold text-sm focus:border-primary-main focus:outline-none"
              >
                <option className="bg-bg-surface text-text-main" value="">{t('pokemon_detail.select', { defaultValue: '-- Seleccionar Pokémon --' })}</option>
                {pokemonList.map(p => {
                  const sp = gamedata.species.find(s => s.name === p.speciesId);
                  return (
                    <option className="bg-bg-surface text-text-main" key={p.id} value={p.id} disabled={p.id === id2}>
                      {p.nickname ? `${p.nickname} (${sp?.displayName || p.speciesId})` : (sp?.displayName || p.speciesId)} - Nv.{p.level}
                    </option>
                  );
                })}
              </select>

              {/* Pokemon 1 Preview Frame */}
              {p1 && species1 ? (
                <div className="bg-bg-app border border-border-main rounded-xl p-4 flex items-center gap-4">
                  <div className="w-16 h-16 shrink-0 bg-bg-surface rounded-xl border border-border-main p-1 flex items-center justify-center">
                    <img 
                      src={`/pokemon/${species1.pokedexNumber}.png`} 
                      alt={species1.displayName} 
                      className="w-full h-full object-contain filter drop-shadow" 
                    />
                  </div>
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-extrabold text-base text-text-main truncate">{p1.nickname || species1.displayName}</h3>
                      <Badge variant="primary">{t('app.level')} {p1.level}</Badge>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      {getSpecialtyBadge(species1.specialty)}
                      {p1.natureId && <span className="text-xs text-text-muted font-semibold">{getNatureDisplayName(t, p1.natureId)}</span>}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-8 text-center border border-dashed border-border-main rounded-xl text-text-muted text-sm">
                  {t('comparator.select_a', { defaultValue: 'Selecciona el primer Pokémon' })}
                </div>
              )}
            </div>

            {/* Pokemon 2 Selector */}
            <div className={`bg-bg-surface border rounded-2xl p-5 shadow-sm space-y-4 transition-colors ${id2 ? 'border-primary-main/40' : 'border-border-main'}`}>
              <div className="flex justify-between items-center">
                <span className="text-xs font-extrabold text-primary-main uppercase tracking-wider">
                  {t('team.team_b', { defaultValue: 'Pokémon B' })}
                </span>
                {id2 && (
                  <button onClick={() => setId2('')} className="text-xs font-bold text-text-muted hover:text-error-main">
                    {t('app.clear', { defaultValue: 'Limpiar' })}
                  </button>
                )}
              </div>

              <select 
                value={id2} 
                onChange={e => setId2(e.target.value)} 
                className="w-full p-2.5 bg-bg-app border border-border-main rounded-xl text-text-main font-bold text-sm focus:border-primary-main focus:outline-none"
              >
                <option className="bg-bg-surface text-text-main" value="">{t('pokemon_detail.select', { defaultValue: '-- Seleccionar Pokémon --' })}</option>
                {pokemonList.map(p => {
                  const sp = gamedata.species.find(s => s.name === p.speciesId);
                  return (
                    <option className="bg-bg-surface text-text-main" key={p.id} value={p.id} disabled={p.id === id1}>
                      {p.nickname ? `${p.nickname} (${sp?.displayName || p.speciesId})` : (sp?.displayName || p.speciesId)} - Nv.{p.level}
                    </option>
                  );
                })}
              </select>

              {/* Pokemon 2 Preview Frame */}
              {p2 && species2 ? (
                <div className="bg-bg-app border border-border-main rounded-xl p-4 flex items-center gap-4">
                  <div className="w-16 h-16 shrink-0 bg-bg-surface rounded-xl border border-border-main p-1 flex items-center justify-center">
                    <img 
                      src={`/pokemon/${species2.pokedexNumber}.png`} 
                      alt={species2.displayName} 
                      className="w-full h-full object-contain filter drop-shadow" 
                    />
                  </div>
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-extrabold text-base text-text-main truncate">{p2.nickname || species2.displayName}</h3>
                      <Badge variant="primary">{t('app.level')} {p2.level}</Badge>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      {getSpecialtyBadge(species2.specialty)}
                      {p2.natureId && <span className="text-xs text-text-muted font-semibold">{getNatureDisplayName(t, p2.natureId)}</span>}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-8 text-center border border-dashed border-border-main rounded-xl text-text-muted text-sm">
                  {t('comparator.select_b', { defaultValue: 'Selecciona el segundo Pokémon' })}
                </div>
              )}
            </div>
          </div>

          {/* Simulator Config Bar */}
          <Panel className="space-y-4">
            <div className="flex items-center gap-2 border-b border-border-main pb-2">
              <Compass size={18} className="text-primary-main" />
              <h3 className="font-extrabold text-sm uppercase tracking-wide text-text-main">
                {t('pokemon_detail.calc_production')}
              </h3>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="bg-bg-app p-2.5 rounded-xl border border-border-main">
                <label className="block text-[10px] font-bold text-text-muted uppercase mb-1">{t('pokemon_detail.island')}</label>
                <select 
                  value={config.island} 
                  onChange={e => setConfig({...config, island: e.target.value as any})} 
                  className="w-full p-1 border border-border-main rounded-lg text-xs bg-bg-surface text-text-main font-semibold focus:outline-none"
                >
                  {ISLANDS.map(i => (
                    <option className="bg-bg-surface text-text-main" key={i.id} value={i.id}>{i.name}</option>
                  ))}
                </select>
              </div>

              <div className="bg-bg-app p-2.5 rounded-xl border border-border-main">
                <label className="block text-[10px] font-bold text-text-muted uppercase mb-1">{t('pokemon_detail.area_bonus')} (%)</label>
                <input 
                  type="number" 
                  min="0" 
                  max="100" 
                  value={config.areaBonus} 
                  onChange={e => setConfig({...config, areaBonus: parseInt(e.target.value) || 0})} 
                  className="w-full p-1 border border-border-main rounded-lg text-xs bg-bg-surface text-text-main font-bold focus:outline-none" 
                />
              </div>

              <div className="bg-bg-app p-2.5 rounded-xl border border-border-main">
                <label className="block text-[10px] font-bold text-text-muted uppercase mb-1">{t('pokemon_detail.bedtime')}</label>
                <input 
                  type="time" 
                  value={config.bedtime} 
                  onChange={e => setConfig({...config, bedtime: e.target.value})} 
                  className="w-full p-1 border border-border-main rounded-lg text-xs bg-bg-surface text-text-main font-semibold focus:outline-none" 
                />
              </div>

              <div className="bg-bg-app p-2.5 rounded-xl border border-border-main flex items-center justify-between">
                <div>
                  <span className="block text-[10px] font-bold text-text-muted uppercase">{t('pokemon_detail.camp')}</span>
                  <span className="text-[10px] text-text-muted">x1.2</span>
                </div>
                <input 
                  type="checkbox" 
                  checked={config.camp} 
                  onChange={e => setConfig({...config, camp: e.target.checked})} 
                  className="w-4 h-4 rounded border-border-main text-primary-main focus:ring-primary-main bg-bg-surface cursor-pointer" 
                />
              </div>
            </div>
          </Panel>

          {/* Error Banner */}
          {error && (
            <div className="bg-error-bg/20 text-error-text p-4 rounded-xl border border-error-main/30 flex items-center gap-3 text-sm">
              <AlertCircle size={18} className="shrink-0" /> {error}
            </div>
          )}

          {/* Comparison Results Card */}
          {p1 && p2 && species1 && species2 && (
            <Panel className="space-y-6">
              <div className="flex items-center justify-between border-b border-border-main pb-4">
                <h3 className="text-lg font-black text-text-main flex items-center gap-2">
                  <Sparkles size={20} className="text-primary-main" />
                  {t('team.compare', { defaultValue: 'Resultado de la Comparación' })}
                </h3>
                {loading && <span className="text-xs text-text-muted font-bold">{t('app.loading')}</span>}
              </div>

              {/* Side-by-side Production Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-border-main text-xs font-bold text-text-muted uppercase bg-bg-app">
                      <th className="p-3">{t('team.metric', { defaultValue: 'Característica' })}</th>
                      <th className="p-3 text-primary-main font-black">{p1.nickname || species1.displayName}</th>
                      <th className="p-3 text-primary-main font-black">{p2.nickname || species2.displayName}</th>
                      <th className="p-3 text-right">{t('team.differentiator', { defaultValue: 'Diferencia (B vs A)' })}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border-main text-sm">
                    {/* Species & Level */}
                    <tr>
                      <td className="p-3 font-semibold text-text-muted">{t('pokemon_form.species')}</td>
                      <td className="p-3 font-bold">{species1.displayName} (#{species1.pokedexNumber})</td>
                      <td className="p-3 font-bold">{species2.displayName} (#{species2.pokedexNumber})</td>
                      <td className="p-3 text-right text-xs text-text-muted">-</td>
                    </tr>
                    <tr>
                      <td className="p-3 font-semibold text-text-muted">{t('pokemon_form.level')}</td>
                      <td className="p-3 font-bold">{p1.level}</td>
                      <td className="p-3 font-bold">{p2.level}</td>
                      <td className="p-3 text-right">{renderDiff(p1.level, p2.level, ' Nv.')}</td>
                    </tr>

                    {/* Specialty */}
                    <tr>
                      <td className="p-3 font-semibold text-text-muted">{t('collection.specialty')}</td>
                      <td className="p-3">{getSpecialtyBadge(species1.specialty)}</td>
                      <td className="p-3">{getSpecialtyBadge(species2.specialty)}</td>
                      <td className="p-3 text-right text-xs text-text-muted">-</td>
                    </tr>

                    {/* Berry Production */}
                    <tr>
                      <td className="p-3 font-semibold text-text-muted flex items-center gap-1.5">
                        <span>🍓</span> {t('team.berries_day', { defaultValue: 'Bayas / Día' })}
                      </td>
                      <td className="p-3 font-black text-warning-main">
                        {totBerries(estimate1).toFixed(1)} <span className="text-xs font-normal text-text-muted">({translateBerry(t, species1.berry.name)})</span>
                      </td>
                      <td className="p-3 font-black text-warning-main">
                        {totBerries(estimate2).toFixed(1)} <span className="text-xs font-normal text-text-muted">({translateBerry(t, species2.berry.name)})</span>
                      </td>
                      <td className="p-3 text-right">{renderDiff(totBerries(estimate1), totBerries(estimate2))}</td>
                    </tr>

                    {/* Ingredient Production */}
                    <tr>
                      <td className="p-3 font-semibold text-text-muted flex items-center gap-1.5">
                        <span>🥗</span> {t('team.ings_day', { defaultValue: 'Ingredientes / Día' })}
                      </td>
                      <td className="p-3 font-black text-success-main">{totIngs(estimate1).toFixed(1)}</td>
                      <td className="p-3 font-black text-success-main">{totIngs(estimate2).toFixed(1)}</td>
                      <td className="p-3 text-right">{renderDiff(totIngs(estimate1), totIngs(estimate2))}</td>
                    </tr>

                    {/* Skill Procs */}
                    <tr>
                      <td className="p-3 font-semibold text-text-muted flex items-center gap-1.5">
                        <Zap size={14} className="text-primary-main" /> {t('team.skills_day', { defaultValue: 'Procs Habilidad / Día' })}
                      </td>
                      <td className="p-3 font-black text-primary-main">
                        {totSkills(estimate1).toFixed(2)} <span className="text-xs font-normal text-text-muted">({getSpeciesMainSkillDisplayName(t, species1)})</span>
                      </td>
                      <td className="p-3 font-black text-primary-main">
                        {totSkills(estimate2).toFixed(2)} <span className="text-xs font-normal text-text-muted">({getSpeciesMainSkillDisplayName(t, species2)})</span>
                      </td>
                      <td className="p-3 text-right">{renderDiff(totSkills(estimate1), totSkills(estimate2))}</td>
                    </tr>

                    {/* Nature */}
                    <tr>
                      <td className="p-3 font-semibold text-text-muted">{t('pokemon_form.nature')}</td>
                      <td className="p-3 font-medium">{p1.natureId ? getNatureDisplayName(t, p1.natureId) : '-'}</td>
                      <td className="p-3 font-medium">{p2.natureId ? getNatureDisplayName(t, p2.natureId) : '-'}</td>
                      <td className="p-3 text-right text-xs text-text-muted">-</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Detailed Breakdown Sub-cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-border-main">
                {/* Pokemon 1 Detail Box */}
                <div className="bg-bg-app p-4 rounded-xl border border-border-main space-y-3">
                  <h4 className="font-extrabold text-sm text-text-main border-b border-border-main pb-2">
                    {p1.nickname || species1.displayName} - {t('pokemon_detail.ingredients')}
                  </h4>
                  <div className="space-y-1">
                    {estimate1?.ingredients.map((ing, i) => (
                      <div key={i} className="flex justify-between text-xs">
                        <span className="font-medium text-text-main">{translateIngredient(t, ing.name)}</span>
                        <span className="font-bold text-success-main">{ing.amount.toFixed(1)} / día</span>
                      </div>
                    ))}
                    {(!estimate1 || estimate1.ingredients.length === 0) && (
                      <span className="text-xs text-text-muted">{t('pokemon_detail.no_production')}</span>
                    )}
                  </div>
                </div>

                {/* Pokemon 2 Detail Box */}
                <div className="bg-bg-app p-4 rounded-xl border border-border-main space-y-3">
                  <h4 className="font-extrabold text-sm text-text-main border-b border-border-main pb-2">
                    {p2.nickname || species2.displayName} - {t('pokemon_detail.ingredients')}
                  </h4>
                  <div className="space-y-1">
                    {estimate2?.ingredients.map((ing, i) => (
                      <div key={i} className="flex justify-between text-xs">
                        <span className="font-medium text-text-main">{translateIngredient(t, ing.name)}</span>
                        <span className="font-bold text-success-main">{ing.amount.toFixed(1)} / día</span>
                      </div>
                    ))}
                    {(!estimate2 || estimate2.ingredients.length === 0) && (
                      <span className="text-xs text-text-muted">{t('pokemon_detail.no_production')}</span>
                    )}
                  </div>
                </div>
              </div>
            </Panel>
          )}
        </>
      )}
    </div>
  );
}

import { useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { translateRecipe, translateBerry } from '../../services/i18n-game';
import { useLiveQuery } from 'dexie-react-hooks';
import { collectionRepository } from '../../data/repositories/DexieCollectionRepository';
import { LocalCalculationEngine } from '../../services/optimizer/calculator/LocalCalculationEngine';
import { OptimizerService } from '../../services/optimizer/OptimizerService';
import type { OptimizerProgress } from '../../services/optimizer/OptimizerService';
import { getIsland, ISLANDS } from '../../domain/optimizer/islands';
import type { IslandId } from '../../domain/optimizer/islands';
import gamedata from '../../data/static/gamedata.json';
import type { StaticDataSchema } from '../../domain/models';
import type { OptimizerConfig, TeamResult, OptimizerObjective } from '../../domain/optimizer/core';
import { 
  Play, Square, AlertCircle, ChevronDown, ChevronUp, 
  Cpu, RotateCcw, Bookmark, GitCompare, Trophy, 
  Sparkles, Sliders, Package
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { TeamDetailModal } from './components/TeamDetailModal';
import { TeamCompareModal } from './components/TeamCompareModal';
import { PageHeader, Panel, ActionButton, Badge } from '../../components/ui';

function useLocalStorage<T>(key: string, initialValue: T) {
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      return initialValue;
    }
  });
  const setValue = (value: T | ((val: T) => T)) => {
    try {
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      setStoredValue(valueToStore);
      window.localStorage.setItem(key, JSON.stringify(valueToStore));
    } catch (error) {}
  };
  return [storedValue, setValue] as const;
}

const engine = new LocalCalculationEngine(gamedata as unknown as StaticDataSchema);
const optimizer = new OptimizerService(gamedata as unknown as StaticDataSchema, engine);

export default function OptimizerPage() {
  const { t } = useTranslation();
  const collection = useLiveQuery(() => collectionRepository.getAll()) || [];

  const [island, setIsland] = useLocalStorage<IslandId>('opt_island', 'cyan');
  const [areaBonus, setAreaBonus] = useLocalStorage('opt_areaBonus', 0);
  const [favoriteBerries, setFavoriteBerries] = useLocalStorage<string[]>('opt_favoriteBerries', []);
  const [minLevel, setMinLevel] = useLocalStorage('opt_minLevel', 1);
  const [requiredPokemonIds, setRequiredPokemonIds] = useLocalStorage<string[]>('opt_requiredPokemonIds', []);
  const [excludedPokemonIds, setExcludedPokemonIds] = useLocalStorage<string[]>('opt_excludedPokemonIds', []);
  const [uniqueSpecies, setUniqueSpecies] = useLocalStorage('opt_uniqueSpecies', false);
  const [objective, setObjective] = useLocalStorage<OptimizerObjective>('opt_objective', 'berries');
  const [recipeType, setRecipeType] = useLocalStorage<'curry' | 'salad' | 'dessert'>('opt_recipeType', 'curry');
  const [targetRecipeId, setTargetRecipeId] = useLocalStorage<string>('opt_targetRecipeId', '');
  const [topN, setTopN] = useLocalStorage('opt_topN', 10);

  const [isOptimizing, setIsOptimizing] = useState(false);
  const [progress, setProgress] = useState<OptimizerProgress | null>(null);
  const [results, setResults] = useState<TeamResult[] | null>(null);
  const [selectedResult, setSelectedResult] = useState<TeamResult | null>(null);
  const [compareList, setCompareList] = useState<TeamResult[]>([]);
  const [showCompare, setShowCompare] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showFiltersDrawer, setShowFiltersDrawer] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  const handleReset = () => {
    setIsland('cyan');
    setAreaBonus(0);
    setFavoriteBerries([]);
    setMinLevel(1);
    setRequiredPokemonIds([]);
    setExcludedPokemonIds([]);
    setUniqueSpecies(false);
    setObjective('berries');
    setRecipeType('curry');
    setTargetRecipeId('');
    setTopN(10);
  };

  const isGreengrass = getIsland(island).id === 'greengrass';
  const greengrassReady = !isGreengrass || favoriteBerries.length === 3;

  const handleSaveQuery = async () => {
    const name = window.prompt('Nombre de la consulta:');
    if (!name) return;
    const config = {
      simulation: { camp: false, bedtime: '22:00', wakeup: '06:00', island, areaBonus, favoriteBerries: isGreengrass ? favoriteBerries : undefined },
      constraints: { minLevel, uniqueSpecies, requiredPokemonIds, excludedPokemonIds },
      recipeType,
      objectives: [objective],
      targetRecipeId: objective === 'recipe' && targetRecipeId ? targetRecipeId : undefined,
      maxResults: topN
    };
    try {
      const { db } = await import('../../data/db');
      await db.savedQueries.add({
        id: crypto.randomUUID(),
        name,
        createdAt: Date.now(),
        config: config as any
      });
      alert('Consulta guardada con éxito.');
    } catch (e) {
      console.error(e);
      alert('Error al guardar consulta.');
    }
  };

  const handleStart = async () => {
    if (!greengrassReady) {
      setError('Debes configurar exactamente 3 bayas favoritas para Isla Verdegal.');
      return;
    }
    if (requiredPokemonIds.length > 5) {
      setError('No puedes requerir más de 5 Pokémon.');
      return;
    }

    setError(null);
    setResults(null);
    setIsOptimizing(true);
    setProgress({ processedTeams: 0, totalTeams: 0, percentage: 0 });

    const config: OptimizerConfig = {
      simulation: {
        camp: false,
        bedtime: '22:00',
        wakeup: '06:00',
        island,
        areaBonus,
        favoriteBerries: isGreengrass ? favoriteBerries : undefined
      },
      constraints: {
        minLevel,
        uniqueSpecies,
        requiredPokemonIds,
        excludedPokemonIds
      },
      recipeType,
      objectives: [objective],
      targetRecipeId: objective === 'recipe' && targetRecipeId ? targetRecipeId : undefined,
      maxResults: topN
    };

    abortControllerRef.current = new AbortController();

    try {
      const res = await optimizer.optimize(
        collection,
        config,
        (p) => setProgress(p),
        abortControllerRef.current.signal
      );
      setResults(res);
    } catch (err: any) {
      if (err.message !== 'Cancelado por el usuario') {
        setError(err.message || 'Error inesperado durante la optimización.');
      } else {
        setError('Optimización cancelada por el usuario.');
      }
    } finally {
      setIsOptimizing(false);
      abortControllerRef.current = null;
    }
  };

  const handleCancel = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  };

  const toggleRequired = (id: string) => {
    if (requiredPokemonIds.includes(id)) {
      setRequiredPokemonIds(prev => prev.filter(x => x !== id));
    } else {
      if (requiredPokemonIds.length >= 5) return;
      setRequiredPokemonIds(prev => [...prev, id]);
      setExcludedPokemonIds(prev => prev.filter(x => x !== id));
    }
  };

  const toggleExcluded = (id: string) => {
    if (excludedPokemonIds.includes(id)) {
      setExcludedPokemonIds(prev => prev.filter(x => x !== id));
    } else {
      setExcludedPokemonIds(prev => [...prev, id]);
      setRequiredPokemonIds(prev => prev.filter(x => x !== id));
    }
  };

  const toggleFavBerry = (berryName: string) => {
    setFavoriteBerries(prev => {
      if (prev.includes(berryName)) return prev.filter(b => b !== berryName);
      if (prev.length >= 3) return prev;
      return [...prev, berryName];
    });
  };

  const recipesForType = gamedata.recipes.filter(r => r.type === recipeType);

  return (
    <div className="space-y-8 pb-24 max-w-6xl mx-auto">
      {/* Header */}
      <PageHeader 
        title="Optimizador de Equipos"
        icon={Cpu}
        description="Analiza y simula millones de combinaciones de tu colección para hallar el equipo de máxima producción."
        actions={
          <div className="flex items-center gap-2">
            <ActionButton 
              variant="outline" 
              onClick={handleReset} 
              icon={RotateCcw}
              disabled={isOptimizing}
              title="Restablecer filtros"
            >
              Reiniciar
            </ActionButton>
            <ActionButton 
              variant="outline" 
              onClick={handleSaveQuery} 
              icon={Bookmark}
              disabled={isOptimizing}
            >
              Guardar Consulta
            </ActionButton>
          </div>
        }
      />

      {/* Analysis Configuration Dashboard */}
      <Panel className="space-y-6">
        <div className="flex items-center justify-between border-b border-border-main pb-4">
          <div className="flex items-center gap-2">
            <Sliders size={20} className="text-primary-main" />
            <h3 className="font-extrabold text-base text-text-main">
              Configuración del Análisis
            </h3>
          </div>
          <span className="text-xs font-semibold text-text-muted bg-bg-app px-2.5 py-1 rounded-full border border-border-main">
            {collection.length} Pokémon en tu caja
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Group 1: Island Context */}
          <div className="space-y-4 bg-bg-app p-4 rounded-xl border border-border-main">
            <h4 className="text-xs font-black text-text-muted uppercase tracking-wider">
              1. Entorno e Isla
            </h4>

            <div>
              <label className="block text-xs font-bold text-text-muted uppercase mb-1">
                {t('optimizer.island')}
              </label>
              <select 
                value={island}
                onChange={e => setIsland(e.target.value as IslandId)}
                className="w-full p-2.5 border border-border-main rounded-lg bg-bg-surface text-text-main font-semibold focus:border-primary-main focus:outline-none"
                disabled={isOptimizing}
              >
                {ISLANDS.map(i => (
                  <option className="bg-bg-surface text-text-main" key={i.id} value={i.id}>
                    {t(`islands.${i.id}`)}
                  </option>
                ))}
              </select>
            </div>

            {isGreengrass && (
              <div className="p-3 bg-warning-bg/20 border border-warning-main/30 rounded-xl space-y-2">
                <label className="block text-[11px] font-bold text-warning-main uppercase">
                  Bayas Verdegal ({favoriteBerries.length}/3)
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {gamedata.berries.map(b => {
                    const isSelected = favoriteBerries.includes(b.name);
                    return (
                      <button
                        key={b.name}
                        onClick={() => toggleFavBerry(b.name)}
                        disabled={isOptimizing || (!isSelected && favoriteBerries.length >= 3)}
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
                type="number" min="0" max="60" step="5"
                value={areaBonus}
                onChange={e => setAreaBonus(parseInt(e.target.value) || 0)}
                className="w-full p-2.5 border border-border-main rounded-lg bg-bg-surface text-text-main font-bold focus:border-primary-main focus:outline-none"
                disabled={isOptimizing}
              />
            </div>
          </div>

          {/* Group 2: Strategy & Objective */}
          <div className="space-y-4 bg-bg-app p-4 rounded-xl border border-border-main">
            <h4 className="text-xs font-black text-text-muted uppercase tracking-wider">
              2. Objetivo Estratégico
            </h4>

            <div>
              <label className="block text-xs font-bold text-text-muted uppercase mb-1">
                {t('optimizer.objective')}
              </label>
              <select 
                value={objective}
                onChange={e => setObjective(e.target.value as OptimizerObjective)}
                className="w-full p-2.5 border border-border-main rounded-lg bg-bg-surface text-text-main font-semibold focus:border-primary-main focus:outline-none"
                disabled={isOptimizing}
              >
                <option className="bg-bg-surface text-text-main" value="berries">{t('optimizer.objective_berries')}</option>
                <option className="bg-bg-surface text-text-main" value="ingredients">{t('optimizer.objective_ingredients')}</option>
                <option className="bg-bg-surface text-text-main" value="recipe">Cobertura de Recetas ({recipeType === 'curry' ? 'Curris' : recipeType === 'salad' ? 'Ensaladas' : 'Postres'})</option>
              </select>
            </div>

            {objective === 'recipe' && (
              <div className="space-y-3 pt-1 border-t border-border-main">
                <div>
                  <label className="block text-xs font-bold text-text-muted uppercase mb-1">
                    {t('optimizer.dish_type')}
                  </label>
                  <select 
                    value={recipeType}
                    onChange={e => {
                      setRecipeType(e.target.value as 'curry' | 'salad' | 'dessert');
                      setTargetRecipeId('');
                    }}
                    className="w-full p-2.5 border border-border-main rounded-lg bg-bg-surface text-text-main font-semibold focus:border-primary-main focus:outline-none"
                    disabled={isOptimizing}
                  >
                    <option className="bg-bg-surface text-text-main" value="curry">{t('game.recipeType.curry')}</option>
                    <option className="bg-bg-surface text-text-main" value="salad">{t('game.recipeType.salad')}</option>
                    <option className="bg-bg-surface text-text-main" value="dessert">{t('game.recipeType.dessert')}</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-text-muted uppercase mb-1">
                    {t('optimizer.prioritize_recipe')}
                  </label>
                  <select 
                    value={targetRecipeId}
                    onChange={e => setTargetRecipeId(e.target.value)}
                    className="w-full p-2 border border-border-main rounded-lg bg-bg-surface text-text-main text-xs focus:border-primary-main focus:outline-none"
                    disabled={isOptimizing}
                  >
                    <option className="bg-bg-surface text-text-main" value="">Categoría completa ({recipesForType.length} recetas)</option>
                    {recipesForType.map(r => (
                      <option className="bg-bg-surface text-text-main" key={r.name} value={r.name}>{translateRecipe(t, r.name)}</option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-text-muted uppercase mb-1">
                {t('optimizer.top_n')} (Resultados)
              </label>
              <input 
                type="number" min="1" max="20"
                value={topN}
                onChange={e => setTopN(parseInt(e.target.value) || 10)}
                className="w-full p-2.5 border border-border-main rounded-lg bg-bg-surface text-text-main font-bold focus:border-primary-main focus:outline-none"
                disabled={isOptimizing}
              />
            </div>
          </div>

          {/* Group 3: Constraints */}
          <div className="space-y-4 bg-bg-app p-4 rounded-xl border border-border-main">
            <h4 className="text-xs font-black text-text-muted uppercase tracking-wider">
              3. Restricciones
            </h4>

            <div>
              <label className="block text-xs font-bold text-text-muted uppercase mb-1">
                {t('optimizer.min_level_allowed')}
              </label>
              <input 
                type="number" min="1" max="100"
                value={minLevel}
                onChange={e => setMinLevel(parseInt(e.target.value) || 1)}
                className="w-full p-2.5 border border-border-main rounded-lg bg-bg-surface text-text-main font-bold focus:border-primary-main focus:outline-none"
                disabled={isOptimizing}
              />
            </div>

            <div className="bg-bg-surface p-3 rounded-lg border border-border-main flex items-center justify-between">
              <div>
                <label htmlFor="uniqueSpecies" className="text-xs font-bold text-text-main block cursor-pointer">
                  {t('optimizer.force_unique')}
                </label>
                <span className="text-[10px] text-text-muted">No repetir la misma especie</span>
              </div>
              <input 
                type="checkbox" id="uniqueSpecies"
                checked={uniqueSpecies}
                onChange={e => setUniqueSpecies(e.target.checked)}
                className="w-5 h-5 rounded border-border-main text-primary-main focus:ring-primary-main bg-bg-app cursor-pointer"
                disabled={isOptimizing}
              />
            </div>

            <div className="bg-bg-surface p-3 rounded-lg border border-border-main">
              <button 
                onClick={() => setShowFiltersDrawer(!showFiltersDrawer)}
                className="w-full flex items-center justify-between text-xs font-bold text-primary-main select-none"
              >
                <span>Pokémon Req / Exc ({requiredPokemonIds.length}/{excludedPokemonIds.length})</span>
                {showFiltersDrawer ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </button>
            </div>
          </div>
        </div>

        {/* Collapsible Drawer for Required / Excluded */}
        {showFiltersDrawer && (
          <div className="bg-bg-app p-4 rounded-xl border border-border-main space-y-3">
            <div className="flex items-center justify-between">
              <h5 className="text-xs font-bold text-text-muted uppercase">
                Seleccionar Requeridos (máx 5) y Excluidos
              </h5>
              <span className="text-xs text-text-muted">
                {requiredPokemonIds.length} requeridos · {excludedPokemonIds.length} excluidos
              </span>
            </div>

            <div className="max-h-60 overflow-y-auto space-y-2 pr-1">
              {collection.length === 0 ? (
                <div className="p-4 text-center text-sm text-text-muted">{t('optimizer.empty_collection')}</div>
              ) : [...collection].sort((a, b) => (b.isFavorite ? 1 : 0) - (a.isFavorite ? 1 : 0)).map(p => {
                const isReq = requiredPokemonIds.includes(p.id);
                const isExc = excludedPokemonIds.includes(p.id);
                const pSpecies = gamedata.species.find(s => s.name === p.speciesId);

                return (
                  <div key={p.id} className="flex items-center justify-between p-2.5 bg-bg-surface rounded-lg border border-border-main text-xs">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-text-main">{p.nickname || pSpecies?.displayName || p.speciesId}</span>
                      <span className="text-text-muted">Nv. {p.level}</span>
                      {p.natureId && <Badge variant="default">{p.natureId}</Badge>}
                    </div>

                    <div className="flex items-center gap-2">
                      <button 
                        onClick={() => toggleRequired(p.id)}
                        disabled={isOptimizing || (!isReq && requiredPokemonIds.length >= 5)}
                        className={`px-2.5 py-1 rounded font-bold border transition-colors ${
                          isReq 
                            ? 'bg-success-main text-white border-success-main' 
                            : 'bg-bg-app border-border-main text-text-muted hover:text-text-main'
                        }`}
                      >
                        Req
                      </button>
                      <button 
                        onClick={() => toggleExcluded(p.id)}
                        disabled={isOptimizing}
                        className={`px-2.5 py-1 rounded font-bold border transition-colors ${
                          isExc 
                            ? 'bg-error-main text-white border-error-main' 
                            : 'bg-bg-app border-border-main text-text-muted hover:text-text-main'
                        }`}
                      >
                        Exc
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Primary Action Button Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-border-main">
          <div className="text-xs text-text-muted">
            {collection.length < 5 && (
              <span className="text-warning-main font-semibold">
                ⚠️ Necesitas al menos 5 Pokémon en tu colección para optimizar.
              </span>
            )}
            {!greengrassReady && isGreengrass && (
              <span className="text-warning-main font-semibold">
                ⚠️ Selecciona 3 bayas favoritas para Verdegal.
              </span>
            )}
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            {isOptimizing ? (
              <ActionButton 
                variant="outline" 
                onClick={handleCancel}
                icon={Square}
                className="w-full sm:w-auto text-error-main border-error-main/30 hover:bg-error-bg hover:text-error-main"
              >
                Cancelar Optimización
              </ActionButton>
            ) : (
              <ActionButton 
                variant="primary" 
                onClick={handleStart}
                disabled={!greengrassReady || (objective === 'recipe' && !targetRecipeId && recipesForType.length === 0) || collection.length < 5}
                icon={Play}
                className="w-full sm:w-auto px-8 py-3 text-base shadow-md"
              >
                Iniciar Optimización
              </ActionButton>
            )}
          </div>
        </div>
      </Panel>

      {/* Progress State */}
      {isOptimizing && progress && (
        <Panel className="border-primary-main/40 shadow-md">
          <div className="flex flex-col items-center justify-center space-y-4 py-4">
            <div className="p-3 rounded-full bg-primary-bg text-primary-main animate-pulse">
              <Cpu size={36} />
            </div>
            <div className="text-center">
              <h3 className="font-extrabold text-xl text-text-main">{t('optimizer.analyzing')}</h3>
              <p className="text-xs text-text-muted mt-1">Explorando combinaciones de equipo deterministas</p>
            </div>

            <div className="w-full max-w-lg bg-bg-app rounded-full h-4 overflow-hidden border border-border-main p-0.5">
              <div 
                className="bg-primary-main h-full rounded-full transition-all duration-300 shadow-sm"
                style={{ width: `${progress.percentage}%` }}
              />
            </div>

            <p className="text-sm font-bold text-text-main">
              {progress.processedTeams.toLocaleString()} / {progress.totalTeams.toLocaleString()} equipos procesados ({progress.percentage.toFixed(1)}%)
            </p>
          </div>
        </Panel>
      )}

      {/* Error state */}
      {error && (
        <div className="bg-error-bg/20 text-error-text p-4 rounded-xl border border-error-main/30 flex items-start gap-3">
          <AlertCircle className="shrink-0 mt-0.5" />
          <p className="font-semibold text-sm">{error}</p>
        </div>
      )}

      {/* Empty Initial State */}
      {!isOptimizing && !results && !error && (
        <div className="p-12 text-center bg-bg-surface border border-dashed border-border-main rounded-2xl space-y-3">
          <div className="inline-flex p-4 rounded-2xl bg-bg-app text-primary-main mb-2">
            <Sparkles size={32} />
          </div>
          <h3 className="text-lg font-bold text-text-main">Listo para optimizar</h3>
          <p className="text-sm text-text-muted max-w-md mx-auto">
            Configura tus preferencias arriba y pulsa "Iniciar Optimización" para calcular las mejores sinergias de tu caja.
          </p>
        </div>
      )}

      {/* Results Protagonist Section */}
      {!isOptimizing && results && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border-main pb-4">
            <div>
              <h2 className="text-2xl font-black text-text-main flex items-center gap-2">
                <Trophy size={24} className="text-amber-500" />
                Mejores Equipos Encontrados ({results.length})
              </h2>
              <p className="text-xs text-text-muted mt-0.5">
                Ordenados por puntuación de simulación según el objetivo seleccionado
              </p>
            </div>

            {compareList.length > 0 && (
              <div className="flex items-center gap-3 bg-bg-surface px-4 py-2 rounded-xl border border-border-main shadow-xs">
                <span className="text-xs font-bold text-text-muted">
                  Comparador: <span className="text-primary-main font-black">{compareList.length}/2</span>
                </span>
                <ActionButton 
                  variant="primary" 
                  onClick={() => setShowCompare(true)}
                  disabled={compareList.length !== 2}
                  icon={GitCompare}
                  className="text-xs py-1.5"
                >
                  Comparar
                </ActionButton>
              </div>
            )}
          </div>

          {results.length === 0 ? (
            <div className="p-12 text-center bg-bg-surface rounded-2xl border border-border-main text-text-muted">
              No se encontraron equipos válidos con los filtros aplicados. Prueba reduciendo el nivel mínimo o retirando exclusiones.
            </div>
          ) : (
            <div className="space-y-4">
              {results.map((res, i) => {
                const totalBerries = res.evaluation.memberEstimates.reduce(
                  (acc, m) => acc + m.estimate.berries.reduce((sum, b) => sum + b.amount, 0), 0
                );
                const totalIngredients = res.evaluation.memberEstimates.reduce(
                  (acc, m) => acc + m.estimate.ingredients.reduce((sum, ing) => sum + ing.amount, 0), 0
                );
                const isSelectedForCompare = compareList.includes(res);

                return (
                  <div 
                    key={i} 
                    className={`bg-bg-surface border rounded-2xl p-6 shadow-sm transition-all hover:shadow-md cursor-pointer ${
                      i === 0 
                        ? 'border-amber-400/80 ring-2 ring-amber-400/10' 
                        : 'border-border-main hover:border-primary-main/50'
                    }`}
                    onClick={() => setSelectedResult(res)}
                  >
                    {/* Header Row: Rank, Score, Metrics, Compare Checkbox */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border-main pb-4 mb-4">
                      <div className="flex items-center gap-3">
                        <input 
                          type="checkbox" 
                          checked={isSelectedForCompare}
                          onClick={e => e.stopPropagation()}
                          onChange={(e) => {
                            if (e.target.checked) {
                              if (compareList.length < 2) setCompareList([...compareList, res]);
                            } else {
                              setCompareList(compareList.filter(c => c !== res));
                            }
                          }}
                          className="w-5 h-5 rounded border-border-main bg-bg-app text-primary-main focus:ring-primary-main cursor-pointer"
                        />
                        <div className="flex items-center gap-2">
                          {i === 0 ? (
                            <span className="flex items-center gap-1 bg-amber-500 text-white text-xs font-black px-2.5 py-1 rounded-full shadow-xs">
                              <Trophy size={12} /> #1 MEJOR
                            </span>
                          ) : (
                            <span className="bg-bg-app text-text-muted border border-border-main text-xs font-black px-2.5 py-1 rounded-full">
                              #{i + 1}
                            </span>
                          )}
                          <div className="flex items-baseline gap-2">
                            <span className="text-xl md:text-2xl font-black text-text-main">
                              {Math.round(res.score.score).toLocaleString()}
                            </span>
                            <span className="text-xs font-bold text-text-muted">pts</span>
                          </div>
                        </div>
                      </div>

                      {/* Score metrics badges */}
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="warning">
                          🍓 {Math.round(totalBerries).toLocaleString()} bayas/d
                        </Badge>
                        <Badge variant="success">
                          🥗 {Math.round(totalIngredients).toLocaleString()} ing/d
                        </Badge>
                        {res.score.objective === 'recipe' && res.score.recipeDetails && (
                          <Badge variant="primary">
                            🎯 Cobertura: {Math.round(res.score.recipeDetails.coveragePercent)}%
                          </Badge>
                        )}
                        <span className="text-xs font-bold text-primary-main hover:underline ml-2">
                          Ver detalle →
                        </span>
                      </div>
                    </div>

                    {/* Member Pokémon Grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
                      {res.evaluation.team.members.map((member, idx) => {
                        const mSpecies = gamedata.species.find(s => s.name === member.speciesId);

                        return (
                          <Link 
                            to={`/pokemon/${member.id}`} 
                            key={`${member.id}-${idx}`}
                            onClick={e => e.stopPropagation()}
                            className="bg-bg-app border border-border-main hover:border-primary-main hover:bg-bg-surface p-3 rounded-xl transition-all flex flex-col items-center text-center group"
                          >
                            <div className="w-14 h-14 mb-2 flex items-center justify-center">
                              {mSpecies ? (
                                <img 
                                  src={`/pokemon/${mSpecies.pokedexNumber}.png`} 
                                  alt={mSpecies.displayName}
                                  className="w-full h-full object-contain filter drop-shadow group-hover:scale-110 transition-transform"
                                  onError={(e) => { (e.target as HTMLImageElement).src = '/favicon.ico' }}
                                />
                              ) : (
                                <Package size={24} className="text-text-muted" />
                              )}
                            </div>
                            <span className="font-extrabold text-xs text-text-main truncate w-full">
                              {member.nickname || mSpecies?.displayName || member.speciesId}
                            </span>
                            <div className="flex items-center gap-1 mt-1">
                              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-bg-surface border border-border-main text-text-muted">
                                Nv. {member.level}
                              </span>
                              {member.natureId && (
                                <span className="text-[10px] text-text-muted truncate max-w-[60px]" title={member.natureId}>
                                  {member.natureId}
                                </span>
                              )}
                            </div>
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Floating compare action button */}
      {compareList.length === 2 && (
        <div className="fixed bottom-8 left-1/2 transform -translate-x-1/2 z-40">
          <button 
            onClick={() => setShowCompare(true)} 
            className="bg-primary-main hover:bg-primary-hover text-white px-8 py-3.5 rounded-full font-black shadow-xl flex items-center gap-2 transition-all transform hover:scale-105"
          >
            <GitCompare size={20} /> Comparar Equipos Seleccionados (2)
          </button>
        </div>
      )}

      {showCompare && compareList.length === 2 && (
        <TeamCompareModal 
          teams={compareList as [TeamResult, TeamResult]} 
          onClose={() => setShowCompare(false)} 
        />
      )}

      {selectedResult && (
        <TeamDetailModal 
          result={selectedResult} 
          onClose={() => setSelectedResult(null)} 
        />
      )}
    </div>
  );
}

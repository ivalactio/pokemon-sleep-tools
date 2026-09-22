import { useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { translateRecipe } from '../../services/i18n-game';
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
import { Play, Square, AlertCircle, ChevronRight, Calculator } from 'lucide-react';
import { Link } from 'react-router-dom';
import { TeamDetailModal } from './components/TeamDetailModal';
import { TeamCompareModal } from './components/TeamCompareModal';

const engine = new LocalCalculationEngine(gamedata as unknown as StaticDataSchema);
const optimizer = new OptimizerService(gamedata as unknown as StaticDataSchema, engine);

export default function OptimizerPage() {
  const { t } = useTranslation();
  const collection = useLiveQuery(() => collectionRepository.getAll()) || [];

  const [island, setIsland] = useState<IslandId>('cyan');
  const [areaBonus, setAreaBonus] = useState(0);
  const [favoriteBerries, setFavoriteBerries] = useState<string[]>([]);
  const [minLevel, setMinLevel] = useState(1);
  const [requiredPokemonIds, setRequiredPokemonIds] = useState<string[]>([]);
  const [excludedPokemonIds, setExcludedPokemonIds] = useState<string[]>([]);
  const [uniqueSpecies, setUniqueSpecies] = useState(false);
  const [objective, setObjective] = useState<OptimizerObjective>('berries');
  const [recipeType, setRecipeType] = useState<'curry' | 'salad' | 'dessert'>('curry');
  const [targetRecipeId, setTargetRecipeId] = useState<string>('');
  const [topN, setTopN] = useState(10);

  const [isOptimizing, setIsOptimizing] = useState(false);
  const [progress, setProgress] = useState<OptimizerProgress | null>(null);
  const [results, setResults] = useState<TeamResult[] | null>(null);
  const [selectedResult, setSelectedResult] = useState<TeamResult | null>(null);
  const [compareList, setCompareList] = useState<TeamResult[]>([]);
  const [showCompare, setShowCompare] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Validate greengrass berries
  const isGreengrass = getIsland(island).id === 'greengrass';
  const greengrassReady = !isGreengrass || favoriteBerries.length === 3;

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
        camp: false, // Por ahora fijo en false, se podría añadir
        bedtime: '22:00', // Valores por defecto, el usuario los cambia globalmente en Config
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
      const start = performance.now();
      const res = await optimizer.optimize(
        collection,
        config,
        (p) => setProgress(p),
        abortControllerRef.current.signal
      );
      setResults(res);
      console.log(`Optimización completada en ${((performance.now() - start) / 1000).toFixed(2)}s`);
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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Calculator className="text-indigo-500" /> Optimizador de Equipos
        </h1>
      </div>

      <div className="bg-bg-surface border border-border-main rounded-xl p-6 shadow-sm">
        <h2 className="text-lg font-semibold mb-4 border-b border-border-main pb-2">Configuración</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Isla</label>
              <select 
                value={island}
                onChange={e => setIsland(e.target.value as IslandId)}
                className="w-full p-2 border border-border-main rounded bg-bg-app"
                disabled={isOptimizing}
              >
                {ISLANDS.map(i => (
                  <option key={i.id} value={i.id}>{t(`islands.${i.id}`)}</option>
                ))}
              </select>
            </div>

            {isGreengrass && (
              <div className="p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded">
                <label className="block text-sm font-medium mb-2 text-amber-900 dark:text-amber-200">
                  Bayas Favoritas de Verdegal (Elige 3)
                </label>
                <div className="flex flex-wrap gap-2">
                  {gamedata.berries.map(b => {
                    const isSelected = favoriteBerries.includes(b.name);
                    return (
                      <button
                        key={b.name}
                        onClick={() => toggleFavBerry(b.name)}
                        disabled={isOptimizing || (!isSelected && favoriteBerries.length >= 3)}
                        className={`px-3 py-1 text-sm rounded-full border transition-colors ${
                          isSelected 
                            ? 'bg-amber-500 text-white border-amber-600' 
                            : 'bg-bg-app border-border-main hover:bg-bg-surface-hover'
                        } disabled:opacity-50`}
                      >
                        {b.name}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium mb-1">Bonus de Área (%)</label>
              <input 
                type="number" min="0" max="60" step="5"
                value={areaBonus}
                onChange={e => setAreaBonus(parseInt(e.target.value) || 0)}
                className="w-full p-2 border border-border-main rounded bg-bg-app"
                disabled={isOptimizing}
              />
            </div>

            <div className="flex items-center gap-2 mt-6">
              <input 
                type="checkbox" id="uniqueSpecies"
                checked={uniqueSpecies}
                onChange={e => setUniqueSpecies(e.target.checked)}
                className="w-4 h-4 rounded text-indigo-600"
                disabled={isOptimizing}
              />
              <label htmlFor="uniqueSpecies" className="text-sm font-medium">Forzar 5 especies distintas (Evitar duplicados)</label>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Objetivo de Optimización</label>
              <select 
                value={objective}
                onChange={e => setObjective(e.target.value as OptimizerObjective)}
                className="w-full p-2 border border-border-main rounded bg-bg-app"
                disabled={isOptimizing}
              >
                <option value="berries">Fuerza Máxima (Producción de Bayas)</option>
                <option value="ingredients">Fuerza Máxima (Producción de Ingredientes base)</option>
                <option value="recipe">Cobertura de Recetas ({recipeType === 'curry' ? 'Curris' : recipeType === 'salad' ? 'Ensaladas' : 'Postres'})</option>
              </select>
            </div>

            {objective === 'recipe' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Tipo de Platos de la Semana</label>
                  <select 
                    value={recipeType}
                    onChange={e => {
                      setRecipeType(e.target.value as 'curry' | 'salad' | 'dessert');
                      setTargetRecipeId('');
                    }}
                    className="w-full p-2 border border-border-main rounded bg-bg-app"
                    disabled={isOptimizing}
                  >
                    <option value="curry">Guisos y Curris</option>
                    <option value="salad">Ensaladas</option>
                    <option value="dessert">Postres</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1 text-text-muted">Priorizar Receta Específica (Opcional)</label>
                  <select 
                    value={targetRecipeId}
                    onChange={e => setTargetRecipeId(e.target.value)}
                    className="w-full p-2 border border-border-main rounded bg-bg-app text-sm"
                    disabled={isOptimizing}
                  >
                    <option value="">Optimizar para TODA la categoría ({recipesForType.length} recetas)</option>
                    {recipesForType.map(r => (
                      <option key={r.name} value={r.name}>{translateRecipe(t, r.name)}</option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium mb-1">Nivel Mínimo Permitido</label>
              <input 
                type="number" min="1" max="100"
                value={minLevel}
                onChange={e => setMinLevel(parseInt(e.target.value) || 1)}
                className="w-full p-2 border border-border-main rounded bg-bg-app"
                disabled={isOptimizing}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Cantidad de Resultados (Top N)</label>
              <input 
                type="number" min="1" max="20"
                value={topN}
                onChange={e => setTopN(parseInt(e.target.value) || 10)}
                className="w-full p-2 border border-border-main rounded bg-bg-app"
                disabled={isOptimizing}
              />
            </div>
          </div>
        </div>

        <div className="mt-8 border-t border-border-main pt-4">
          <details className="group">
            <summary className="flex items-center cursor-pointer font-medium text-indigo-600 dark:text-indigo-400 select-none">
              <ChevronRight className="w-5 h-5 transition-transform group-open:rotate-90" />
              Seleccionar Requeridos / Excluidos ({requiredPokemonIds.length} req, {excludedPokemonIds.length} exc)
            </summary>
            <div className="mt-4 max-h-64 overflow-y-auto border border-border-main rounded bg-bg-app p-2 space-y-2">
              {collection.length === 0 ? (
                <div className="p-4 text-center text-sm text-text-muted">Tu colección está vacía.</div>
              ) : collection.map(p => {
                const isReq = requiredPokemonIds.includes(p.id);
                const isExc = excludedPokemonIds.includes(p.id);
                return (
                  <div key={p.id} className="flex items-center justify-between p-2 hover:bg-bg-surface rounded text-sm">
                    <span>
                      <strong>{p.nickname || p.speciesId}</strong> (Nv. {p.level}) - {p.natureId || 'Sin natu'}
                    </span>
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={() => toggleRequired(p.id)}
                        disabled={isOptimizing || (!isReq && requiredPokemonIds.length >= 5)}
                        className={`px-2 py-1 rounded border text-xs ${isReq ? 'bg-green-500 text-white border-green-600' : 'bg-bg-surface border-border-main hover:bg-green-50'}`}
                      >
                        Req
                      </button>
                      <button 
                        onClick={() => toggleExcluded(p.id)}
                        disabled={isOptimizing}
                        className={`px-2 py-1 rounded border text-xs ${isExc ? 'bg-red-500 text-white border-red-600' : 'bg-bg-surface border-border-main hover:bg-red-50'}`}
                      >
                        Exc
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          </details>
        </div>

        <div className="mt-6 flex justify-end gap-3">
          {isOptimizing ? (
            <button 
              onClick={handleCancel}
              className="flex items-center gap-2 px-6 py-2 bg-red-600 text-white font-medium rounded hover:bg-red-700 transition-colors"
            >
              <Square size={20} /> Cancelar Optimización
            </button>
          ) : (
            <button 
              onClick={handleStart}
              disabled={!greengrassReady || (objective === 'recipe' && !targetRecipeId) || collection.length < 5}
              className="flex items-center gap-2 px-6 py-2 bg-indigo-600 text-white font-medium rounded hover:bg-indigo-700 disabled:opacity-50 transition-colors"
            >
              <Play size={20} /> Iniciar Optimizador
            </button>
          )}
        </div>
      </div>

      {/* Progress Section */}
      {isOptimizing && progress && (
        <div className="bg-bg-surface border border-indigo-200 dark:border-indigo-900 rounded-xl p-6 shadow-sm flex flex-col items-center justify-center space-y-4">
          <div className="animate-spin text-indigo-600"><Calculator size={32} /></div>
          <h3 className="font-semibold text-lg text-indigo-700 dark:text-indigo-400">Analizando Equipos...</h3>
          <div className="w-full max-w-md bg-gray-200 dark:bg-gray-700 rounded-full h-4 overflow-hidden">
            <div 
              className="bg-indigo-600 h-4 transition-all duration-300"
              style={{ width: `${progress.percentage}%` }}
            ></div>
          </div>
          <p className="text-sm font-medium">
            {progress.processedTeams.toLocaleString()} / {progress.totalTeams.toLocaleString()} equipos procesados ({progress.percentage.toFixed(1)}%)
          </p>
        </div>
      )}

      {/* Error / Messages */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 p-4 rounded-xl border border-red-200 flex items-start gap-3">
          <AlertCircle className="shrink-0 mt-0.5" />
          <p className="font-medium">{error}</p>
        </div>
      )}

      {/* Results Section */}
      {!isOptimizing && results && (
        <div className="space-y-4">
          <h2 className="text-xl font-bold border-b border-border-main pb-2">Resultados Top {results.length}</h2>
          
          {results.length === 0 ? (
            <div className="p-8 text-center text-text-muted bg-bg-surface rounded-xl border border-border-main">
              No se encontraron equipos válidos con los filtros aplicados.
            </div>
          ) : (
            results.map((res, i) => {
              // Calcular info secundaria básica
              const totalBerries = res.evaluation.memberEstimates.reduce((acc, m) => acc + m.estimate.berries.reduce((sum, b) => sum + b.amount, 0), 0);
              const totalIngredients = res.evaluation.memberEstimates.reduce((acc, m) => acc + m.estimate.ingredients.reduce((sum, ing) => sum + ing.amount, 0), 0);
              
              return (
                <div key={i} className="bg-bg-surface border border-border-main rounded-xl p-5 shadow-sm space-y-4 cursor-pointer hover:border-indigo-400 transition-colors" onClick={() => setSelectedResult(res)}>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-border-main pb-3 gap-2">
                      <div className="flex items-center gap-3">
                        <input type="checkbox" className="w-5 h-5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer" checked={compareList.includes(res)} onChange={(e) => {
                          e.stopPropagation();
                          if (e.target.checked) {
                            if (compareList.length < 2) setCompareList([...compareList, res]);
                          } else {
                            setCompareList(compareList.filter(c => c !== res));
                          }
                        }} />
                      </div>
                  <div>
                    <h3 className="text-lg font-bold">#{i + 1} - Puntuación: {Math.round(res.score.score).toLocaleString()}</h3>
                    <div className="flex gap-3 mt-1 text-sm text-text-muted">
                      <span>Bayas producidas: {Math.round(totalBerries).toLocaleString()}</span>
                      <span>Ingredientes: {Math.round(totalIngredients).toLocaleString()}</span>
                    </div>
                  </div>
                  {res.score.objective === 'recipe' && res.score.recipeDetails && (
                    <div className="text-left sm:text-right">
                      <span className="text-sm font-medium text-amber-600 dark:text-amber-400">
                        Cobertura: {Math.round(res.score.recipeDetails.coveragePercent)}%
                      </span>
                      <p className="text-xs text-text-muted mt-1 max-w-xs leading-tight">
                        * Estimación aproximada de ingredientes cubiertos. No representa el número real de comidas cocinadas por día.
                      </p>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                  {res.evaluation.team.members.map((member, idx) => (
                    <Link 
                      to={`/pokemon/${member.id}`} 
                      key={`${member.id}-${idx}`}
                      className="block p-3 border border-border-main rounded-lg hover:border-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors"
                    >
                      <div className="font-semibold text-sm truncate">{member.nickname || member.speciesId}</div>
                      <div className="text-xs text-text-muted">Nv. {member.level}</div>
                      <div className="text-xs text-text-muted mt-1 truncate">{member.natureId || 'Sin natu'}</div>
                    </Link>
                  ))}
                </div>
              </div>
            )})
          )}
        </div>
      )}

      {compareList.length === 2 && (
          <div className="fixed bottom-8 left-1/2 transform -translate-x-1/2 z-40">
            <button onClick={() => setShowCompare(true)} className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-full font-bold shadow-lg flex items-center gap-2">
              Comparar Equipos
            </button>
          </div>
        )}

        {showCompare && compareList.length === 2 && <TeamCompareModal teams={compareList as [TeamResult, TeamResult]} onClose={() => setShowCompare(false)} />}

        <TeamDetailModal result={selectedResult} onClose={() => setSelectedResult(null)} />
    </div>
  );
}

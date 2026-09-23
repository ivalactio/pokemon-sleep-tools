import { useTranslation } from 'react-i18next';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../data/db';
import { collectionRepository } from '../../data/repositories/DexieCollectionRepository';
import { Download, Upload, AlertCircle, Package, Star, CalendarDays, Search, Zap, GitCompare, ArrowRight, Edit, Plus } from 'lucide-react';
import { z } from 'zod';
import { useRef, useState } from 'react';
import { isComplete } from '../../utils/pokemonUtils';
import { PageHeader, SectionHeader, StatCard, Panel, ActionButton, Badge } from '../../components/ui';
import { useNavigate, Link } from 'react-router-dom';
import gamedata from '../../data/static/gamedata.json';
import { plannerStore } from '../planner/plannerStore';

const exportSchema = z.object({
  schemaVersion: z.literal(1),
  gameDataVersion: z.string(),
  pokemon: z.array(z.any())
});

export default function Dashboard() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  
  const pokemonList = useLiveQuery(() => collectionRepository.getAll()) || [];
  const savedQueriesCount = useLiveQuery(() => db.savedQueries.count()) || 0;
  const recentQueries = useLiveQuery(() => db.savedQueries.reverse().limit(4).toArray()) || [];
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importStatus, setImportStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [importMessage, setImportMessage] = useState<string | null>(null);

  const stats = {
    total: pokemonList.length,
    favorites: pokemonList.filter(p => p.isFavorite).length,
    incomplete: pokemonList.filter(p => !isComplete(p)).length,
  };

  const favoritePokemon = pokemonList.filter(p => p.isFavorite).slice(0, 6);
  const incompletePokemon = pokemonList.filter(p => !isComplete(p)).slice(0, 6);

  const handleExport = () => {
    try {
      const data = {
        schemaVersion: 1,
        gameDataVersion: '1.0.0',
        pokemon: pokemonList
      };
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `pokesleep-backup-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error(e);
      alert('Error exportando datos');
    }
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportStatus('idle');
    setImportMessage(null);

    try {
      const text = await file.text();
      const rawData = JSON.parse(text);
      const parsed = exportSchema.safeParse(rawData);
      
      if (!parsed.success) {
        throw new Error(t('dashboard.import_error_format'));
      }
      
      if (window.confirm(t('dashboard.import_confirm').replace('{count}', parsed.data.pokemon.length.toString()))) {
        await collectionRepository.import(parsed.data.pokemon);
        setImportStatus('success');
        setImportMessage(t('dashboard.import_success'));
      }
    } catch (err: any) {
      console.error(err);
      setImportStatus('error');
      setImportMessage(err.message || t('dashboard.import_error_read'));
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleLoadQuery = (q: any) => {
    const qType = q.type || 'organizer';
    if (qType === 'planner' && q.plannerContext) {
      plannerStore.setDraft(q.plannerContext);
      plannerStore.setSelectedPlanId(q.plannerContext.id || 'new');
      navigate('/planificador');
      return;
    }

    if (q.config) {
      window.localStorage.setItem('opt_island', JSON.stringify(q.config.simulation.island));
      window.localStorage.setItem('opt_areaBonus', JSON.stringify(q.config.simulation.areaBonus));
      window.localStorage.setItem('opt_favoriteBerries', JSON.stringify(q.config.simulation.favoriteBerries || []));
      window.localStorage.setItem('opt_minLevel', JSON.stringify(q.config.constraints.minLevel));
      window.localStorage.setItem('opt_requiredPokemonIds', JSON.stringify(q.config.constraints.requiredPokemonIds || []));
      window.localStorage.setItem('opt_excludedPokemonIds', JSON.stringify(q.config.constraints.excludedPokemonIds || []));
      window.localStorage.setItem('opt_uniqueSpecies', JSON.stringify(q.config.constraints.uniqueSpecies));
      window.localStorage.setItem('opt_objective', JSON.stringify(q.config.objectives[0]));
      window.localStorage.setItem('opt_recipeType', JSON.stringify(q.config.recipeType));
      window.localStorage.setItem('opt_targetRecipeId', JSON.stringify(q.config.targetRecipeId || ''));
      window.localStorage.setItem('opt_topN', JSON.stringify(q.config.maxResults));
    }
    navigate('/optimizador');
  };

  return (
    <div className="space-y-8 pb-16">
      <PageHeader 
        title={t('dashboard.title')} 
        description={t('dashboard.description', { defaultValue: 'Resumen del estado de tu colección y herramientas de optimización.' })} 
      />

      {/* Empty Collection Callout */}
      {pokemonList.length === 0 && (
        <Panel className="border-2 border-dashed border-primary-main/40 bg-primary-bg/20 text-center py-8 space-y-4">
          <Package size={40} className="mx-auto text-primary-main" />
          <div>
            <h2 className="text-lg font-bold text-text-main">{t('collection.empty', { defaultValue: 'No tienes Pokémon en tu colección.' })}</h2>
            <p className="text-xs text-text-muted mt-1 max-w-md mx-auto">
              {t('dashboard.empty_box_desc', { defaultValue: 'Comienza añadiendo tu primer Pokémon o importando tu colección en JSON.' })}
            </p>
          </div>
          <div className="flex justify-center gap-3">
            <ActionButton icon={Plus} variant="primary" onClick={() => navigate('/coleccion/nuevo')}>
              {t('pokemon_form.title_add')}
            </ActionButton>
            <ActionButton icon={Upload} variant="outline" onClick={() => fileInputRef.current?.click()}>
              {t('dashboard.import')}
            </ActionButton>
          </div>
        </Panel>
      )}

      {/* Quick Action Bar */}
      <Panel className="flex flex-wrap items-center justify-between gap-4 bg-gradient-to-r from-bg-surface to-bg-app border-border-main">
        <span className="text-xs font-black uppercase text-text-muted tracking-wider">
          {t('dashboard.quick_actions', { defaultValue: 'Acciones Rápidas' })}
        </span>
        <div className="flex flex-wrap gap-2">
          <ActionButton icon={Package} variant="outline" onClick={() => navigate('/coleccion')}>
            Caja Pokémon
          </ActionButton>
          <ActionButton icon={Zap} variant="primary" onClick={() => navigate('/optimizador')}>
            Optimizador
          </ActionButton>
          <ActionButton icon={CalendarDays} variant="outline" onClick={() => navigate('/planificador')}>
            Planificador
          </ActionButton>
          <ActionButton icon={GitCompare} variant="outline" onClick={() => navigate('/comparador')}>
            {t('nav.comparator', { defaultValue: 'Comparador de Pokémon' })}
          </ActionButton>
        </div>
      </Panel>

      {/* Collection Stats */}
      <section className="space-y-4">
        <SectionHeader title={t('dashboard.box_status', { defaultValue: 'Estado de la Caja Pokémon' })} icon={Package} />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <StatCard 
            title={t('dashboard.total_pokemon')} 
            value={stats.total} 
            icon={Package} 
            colorClass="text-info-main" 
          />
          <StatCard 
            title={t('collection.only_favorites', { defaultValue: 'Favoritos' })} 
            value={stats.favorites} 
            icon={Star} 
            colorClass="text-warning-main" 
          />
          <StatCard 
            title={t('dashboard.incomplete', { defaultValue: 'Datos Incompletos' })} 
            value={stats.incomplete} 
            icon={AlertCircle} 
            colorClass={stats.incomplete > 0 ? "text-error-main" : "text-success-main"} 
          />
        </div>
      </section>

      {/* Incomplete Pokémon Warning Block */}
      {stats.incomplete > 0 && (
        <section className="space-y-4">
          <SectionHeader 
            title={t('dashboard.incomplete_warning_title', { defaultValue: 'Pokémon con Datos Incompletos' })} 
            icon={AlertCircle} 
          />
          <Panel className="border-error-main/30 bg-error-bg/10 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-text-muted">
                {t('dashboard.incomplete_warning_desc', { defaultValue: 'Estos Pokémon necesitan completar su naturaleza, ingredientes o subhabilidades para simulaciones precisas.' })}
              </p>
              <Link to="/coleccion" className="text-xs font-bold text-primary-main hover:underline flex items-center gap-1">
                Ver todos <ArrowRight size={14} />
              </Link>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {incompletePokemon.map(p => {
                const sp = gamedata.species.find(s => s.name === p.speciesId);
                return (
                  <div key={p.id} className="p-3 bg-bg-surface border border-error-main/20 rounded-xl flex items-center justify-between">
                    <div className="flex items-center gap-2.5 overflow-hidden">
                      {sp ? (
                        <img 
                          src={`/pokemon/${sp.pokedexNumber}.png`} 
                          alt={sp.displayName}
                          className="w-8 h-8 object-contain shrink-0"
                          onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }}
                        />
                      ) : (
                        <Package size={18} className="text-text-muted shrink-0" />
                      )}
                      <div className="truncate">
                        <span className="font-bold text-sm text-text-main truncate block">
                          {p.nickname || sp?.displayName || p.speciesId}
                        </span>
                        <span className="text-xs text-error-main font-semibold">Nv. {p.level} • Datos incompletos</span>
                      </div>
                    </div>
                    <Link to={`/coleccion/editar/${p.id}`} className="p-1.5 hover:bg-bg-app rounded-lg text-primary-main shrink-0" title="Completar datos">
                      <Edit size={16} />
                    </Link>
                  </div>
                );
              })}
            </div>
          </Panel>
        </section>
      )}

      {/* Favorite Pokémon Section */}
      {favoritePokemon.length > 0 && (
        <section className="space-y-4">
          <SectionHeader 
            title={t('dashboard.favorites_title', { defaultValue: 'Pokémon Favoritos' })} 
            icon={Star} 
          />
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
            {favoritePokemon.map(p => {
              const sp = gamedata.species.find(s => s.name === p.speciesId);
              return (
                <Panel key={p.id} className="p-3 text-center space-y-2 hover:border-warning-main/50 transition-colors">
                  <div className="relative w-12 h-12 mx-auto flex items-center justify-center">
                    {sp ? (
                      <img 
                        src={`/pokemon/${sp.pokedexNumber}.png`} 
                        alt={sp.displayName}
                        className="w-full h-full object-contain"
                        onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }}
                      />
                    ) : (
                      <Package size={24} className="text-text-muted" />
                    )}
                    <Star size={12} className="absolute -top-1 -right-1 text-warning-main fill-warning-main" />
                  </div>
                  <div>
                    <h4 className="font-extrabold text-xs text-text-main truncate" title={p.nickname || sp?.displayName}>
                      {p.nickname || sp?.displayName || p.speciesId}
                    </h4>
                    <span className="text-[10px] font-bold text-text-muted">Nv. {p.level}</span>
                  </div>
                  <Link to={`/coleccion/editar/${p.id}`} className="block text-[10px] text-primary-main font-bold hover:underline">
                    Editar
                  </Link>
                </Panel>
              );
            })}
          </div>
        </section>
      )}

      {/* Recent Saved Queries */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <SectionHeader title={t('saved.queries_title')} icon={Search} />
          {recentQueries.length > 0 && (
            <Link to="/consultas-guardadas" className="text-xs font-bold text-primary-main hover:underline flex items-center gap-1">
              {t('app.all', { defaultValue: 'Ver todas' })} ({savedQueriesCount}) <ArrowRight size={14} />
            </Link>
          )}
        </div>

        {recentQueries.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {recentQueries.map(q => {
              const isPlanner = (q.type || 'organizer') === 'planner';
              const Icon = isPlanner ? CalendarDays : Zap;
              return (
                <Panel key={q.id} className="flex items-center justify-between p-4 hover:border-primary-main/40 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                      isPlanner ? 'bg-indigo-500/10 text-indigo-500' : 'bg-amber-500/10 text-amber-500'
                    }`}>
                      <Icon size={18} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-bold text-sm text-text-main">{q.name}</h4>
                        <Badge variant={isPlanner ? 'info' : 'warning'}>
                          {isPlanner ? 'Planificador' : 'Organizador'}
                        </Badge>
                      </div>
                      <span className="text-xs text-text-muted">{new Date(q.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                  <ActionButton variant="outline" onClick={() => handleLoadQuery(q)} className="text-xs py-1 px-3">
                    {t('saved.load')}
                  </ActionButton>
                </Panel>
              );
            })}
          </div>
        ) : (
          <Panel className="text-center py-6 text-xs text-text-muted">
            {t('saved.empty_queries', { defaultValue: 'No hay consultas guardadas.' })}
          </Panel>
        )}
      </section>

      {/* Data Backup & Import */}
      <section className="space-y-4">
        <SectionHeader title={t('dashboard.backup')} icon={Download} />
        <Panel>
          <div className="flex flex-wrap items-center gap-4">
            <ActionButton icon={Download} variant="default" onClick={handleExport}>
              {t('dashboard.export')}
            </ActionButton>
            
            <input
              type="file"
              accept=".json"
              ref={fileInputRef}
              onChange={handleImport}
              className="hidden"
            />
            <ActionButton icon={Upload} variant="outline" onClick={() => fileInputRef.current?.click()}>
              {t('dashboard.import')}
            </ActionButton>
          </div>

          {importStatus === 'error' && (
            <div className="mt-4 p-3 bg-error-bg text-error-text rounded-lg text-sm flex items-start gap-2 border border-error-main/20">
              <AlertCircle size={18} className="shrink-0 mt-0.5" />
              {importMessage}
            </div>
          )}
          
          {importStatus === 'success' && (
            <div className="mt-4 p-3 bg-success-bg text-success-text rounded-lg text-sm border border-success-main/20">
              {importMessage}
            </div>
          )}
        </Panel>
      </section>
    </div>
  );
}

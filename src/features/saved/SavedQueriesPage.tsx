import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../data/db';
import { useNavigate } from 'react-router-dom';
import { Zap, CalendarDays, Search, Trash, Play } from 'lucide-react';
import type { SavedQuery } from '../../domain/persistence';
import { PageHeader, Panel, ActionButton, Badge, EmptyState } from '../../components/ui';
import { plannerStore } from '../planner/plannerStore';

type FilterTab = 'all' | 'organizer' | 'planner';

export default function SavedQueriesPage() {
  const { t } = useTranslation();
  const queries = useLiveQuery(() => db.savedQueries.toArray()) || [];
  const navigate = useNavigate();
  const [filterTab, setFilterTab] = useState<FilterTab>('all');

  const handleLoad = (q: SavedQuery) => {
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

  const handleDelete = async (id: string) => {
    if (window.confirm(t('saved.confirm_delete_query', { defaultValue: '¿Borrar consulta guardada?' }))) {
      await db.savedQueries.delete(id);
    }
  };

  const filteredQueries = queries.filter(q => {
    const type = q.type || 'organizer';
    if (filterTab === 'all') return true;
    return type === filterTab;
  });

  return (
    <div className="space-y-6 pb-20 max-w-5xl mx-auto">
      <PageHeader 
        title={t('saved.queries_title')} 
        icon={Search}
        description={t('saved.queries_description', { defaultValue: 'Consultas y configuraciones guardadas para Optimizador y Planificador.' })} 
      />

      {/* Filter Tabs */}
      <div className="flex border-b border-border-main gap-2">
        <button
          onClick={() => setFilterTab('all')}
          className={`pb-3 px-4 font-extrabold text-sm border-b-2 transition-all ${
            filterTab === 'all'
              ? 'border-primary-main text-primary-main'
              : 'border-transparent text-text-muted hover:text-text-main'
          }`}
        >
          {t('app.all', { defaultValue: 'Todas' })} ({queries.length})
        </button>
        <button
          onClick={() => setFilterTab('organizer')}
          className={`pb-3 px-4 font-extrabold text-sm border-b-2 transition-all flex items-center gap-1.5 ${
            filterTab === 'organizer'
              ? 'border-primary-main text-primary-main'
              : 'border-transparent text-text-muted hover:text-text-main'
          }`}
        >
          <Zap size={16} />
          {t('saved.tab_organizer', { defaultValue: 'Organizador' })} (
          {queries.filter(q => (q.type || 'organizer') === 'organizer').length})
        </button>
        <button
          onClick={() => setFilterTab('planner')}
          className={`pb-3 px-4 font-extrabold text-sm border-b-2 transition-all flex items-center gap-1.5 ${
            filterTab === 'planner'
              ? 'border-primary-main text-primary-main'
              : 'border-transparent text-text-muted hover:text-text-main'
          }`}
        >
          <CalendarDays size={16} />
          {t('saved.tab_planner', { defaultValue: 'Planificador' })} (
          {queries.filter(q => (q.type || 'organizer') === 'planner').length})
        </button>
      </div>

      {/* Query List */}
      <div className="space-y-3">
        {filteredQueries.map(q => {
          const isPlanner = (q.type || 'organizer') === 'planner';
          const Icon = isPlanner ? CalendarDays : Zap;
          const islandName = isPlanner ? q.plannerContext?.island : q.config?.simulation.island;
          const objectiveName = isPlanner ? q.plannerContext?.objective : q.config?.objectives[0];

          return (
            <Panel key={q.id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                  isPlanner ? 'bg-indigo-500/10 text-indigo-500' : 'bg-amber-500/10 text-amber-500'
                }`}>
                  <Icon size={20} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-base font-bold text-text-main">{q.name}</h2>
                    <Badge variant={isPlanner ? 'info' : 'warning'}>
                      {isPlanner ? t('saved.tab_planner', { defaultValue: 'Planificador' }) : t('saved.tab_organizer', { defaultValue: 'Organizador' })}
                    </Badge>
                  </div>
                  <p className="text-xs text-text-muted mt-1">
                    {islandName && `${t('planner.context', { defaultValue: 'Isla' })}: ${t(`islands.${islandName}`, { defaultValue: islandName })} • `}
                    {objectiveName && `Objetivo: ${objectiveName} • `}
                    {new Date(q.createdAt).toLocaleDateString()}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 self-end sm:self-center">
                <ActionButton 
                  variant="primary" 
                  onClick={() => handleLoad(q)} 
                  icon={Play}
                  className="text-xs py-1.5"
                >
                  {t('saved.load')}
                </ActionButton>
                <ActionButton 
                  variant="outline" 
                  onClick={() => handleDelete(q.id)} 
                  icon={Trash}
                  className="text-xs py-1.5 text-error-main border-error-main/20 hover:bg-error-main/10"
                >
                  {t('app.delete')}
                </ActionButton>
              </div>
            </Panel>
          );
        })}

        {filteredQueries.length === 0 && (
          <EmptyState 
            icon={Search}
            title={t('saved.empty_queries')}
            description={t('saved.no_queries_found', { defaultValue: 'No se encontraron consultas guardadas en esta categoría.' })}
          />
        )}
      </div>
    </div>
  );
}

import { useTranslation } from 'react-i18next';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../data/db';
import { collectionRepository } from '../../data/repositories/DexieCollectionRepository';
import { Download, Upload, AlertCircle, Package, Star, CalendarDays, Search, Users, Zap } from 'lucide-react';
import { z } from 'zod';
import { useRef, useState } from 'react';
import { isComplete } from '../../utils/pokemonUtils';
import { PageHeader, SectionHeader, StatCard, Panel, ActionButton } from '../../components/ui';
import { useNavigate } from 'react-router-dom';

const exportSchema = z.object({
  schemaVersion: z.literal(1),
  gameDataVersion: z.string(),
  pokemon: z.array(z.any())
});

export default function Dashboard() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  
  const pokemonList = useLiveQuery(() => collectionRepository.getAll()) || [];
  const savedQueries = useLiveQuery(() => db.savedQueries.count()) || 0;
  const savedTeams = useLiveQuery(() => db.savedTeams.count()) || 0;
  const weeklyPlans = useLiveQuery(() => db.weeklyPlans.count()) || 0;
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importStatus, setImportStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [importMessage, setImportMessage] = useState<string | null>(null);

  const stats = {
    total: pokemonList.length,
    favorites: pokemonList.filter(p => p.isFavorite).length,
    incomplete: pokemonList.filter(p => !isComplete(p)).length,
  };

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

  return (
    <div className="space-y-8">
      <PageHeader 
        title={t('dashboard.title')} 
        description="Resumen del estado de tu colección y herramientas." 
      />

      {/* Collection Stats */}
      <section>
        <SectionHeader title="Estado de la Caja Pokémon" icon={Package} />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <StatCard 
            title="Total Pokémon" 
            value={stats.total} 
            icon={Package} 
            colorClass="text-info-main" 
          />
          <StatCard 
            title="Favoritos" 
            value={stats.favorites} 
            icon={Star} 
            colorClass="text-warning-main" 
          />
          <StatCard 
            title="Datos Incompletos" 
            value={stats.incomplete} 
            icon={AlertCircle} 
            colorClass={stats.incomplete > 0 ? "text-error-main" : "text-success-main"} 
          />
        </div>
      </section>

      {/* Tools Stats & Shortcuts */}
      <section>
        <SectionHeader title="Herramientas y Planificación" icon={Zap} />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <StatCard 
            title="Consultas de Optimización" 
            value={savedQueries} 
            icon={Search} 
          />
          <StatCard 
            title="Equipos Guardados" 
            value={savedTeams} 
            icon={Users} 
          />
          <StatCard 
            title="Planes Semanales" 
            value={weeklyPlans} 
            icon={CalendarDays} 
          />
        </div>
        <Panel className="flex flex-wrap gap-4 bg-primary-bg/30 border-primary-main/20">
          <ActionButton icon={Zap} variant="primary" onClick={() => navigate('/optimizador')}>
            Ir al Optimizador
          </ActionButton>
          <ActionButton icon={CalendarDays} onClick={() => navigate('/planificador')}>
            Planificador Semanal
          </ActionButton>
          <ActionButton icon={Package} onClick={() => navigate('/coleccion')}>
            Ver Caja Pokémon
          </ActionButton>
        </Panel>
      </section>

      {/* Data Management */}
      <section>
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

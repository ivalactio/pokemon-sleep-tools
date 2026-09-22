import { useTranslation } from 'react-i18next';
import { useLiveQuery } from 'dexie-react-hooks';
import { collectionRepository } from '../../data/repositories/DexieCollectionRepository';
import { Download, Upload, AlertCircle } from 'lucide-react';
import { z } from 'zod';
import { useRef, useState } from 'react';

const exportSchema = z.object({
  schemaVersion: z.literal(1),
  gameDataVersion: z.string(),
  pokemon: z.array(z.any())
});

export default function Dashboard() {
  const { t } = useTranslation();
  const pokemonList = useLiveQuery(() => collectionRepository.getAll()) || [];
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [importStatus, setImportStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [importMessage, setImportMessage] = useState<string | null>(null);

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
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">{t('dashboard.title')}</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-bg-surface p-6 rounded-xl border border-border-main shadow-sm">
          <h3 className="font-bold text-text-main mb-4">{t('dashboard.collection_summary')}</h3>
          <div className="flex items-center gap-4">
            <div className="bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 p-4 rounded-lg w-24 text-center">
              <span className="block text-3xl font-black">{pokemonList.length}</span>
              <span className="text-xs font-medium uppercase tracking-wider">{t('dashboard.total_pokemon')}</span>
            </div>
          </div>
        </div>

        <div className="bg-bg-surface p-6 rounded-xl border border-border-main shadow-sm">
          <h3 className="font-bold text-text-main mb-4">{t('dashboard.backup')}</h3>

          <div className="flex flex-col gap-3">
            <button
              onClick={handleExport}
              className="flex items-center justify-center gap-2 bg-indigo-50 dark:bg-indigo-900/30 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 p-3 rounded-lg font-medium transition-colors border border-indigo-200 dark:border-indigo-800"
            >
              <Download size={20} />
              {t('dashboard.export')}
            </button>
            
            <div>
              <input
                type="file"
                accept=".json"
                ref={fileInputRef}
                onChange={handleImport}
                className="hidden"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-full flex items-center justify-center gap-2 bg-bg-surface hover:bg-bg-surface-hover text-text-main p-3 rounded-lg font-medium transition-colors border border-border-main"
              >
                <Upload size={20} />
                {t('dashboard.import')}
              </button>
            </div>

            {importStatus === 'error' && (
              <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-lg text-sm flex items-start gap-2">
                <AlertCircle size={18} className="shrink-0 mt-0.5" />
                {importMessage}
              </div>
            )}
            
            {importStatus === 'success' && (
              <div className="mt-4 p-3 bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-lg text-sm">
                {importMessage}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

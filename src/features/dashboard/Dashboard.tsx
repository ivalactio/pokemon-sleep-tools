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
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleExport = () => {
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
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    setSuccess(null);
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const rawData = JSON.parse(text);
      const parsed = exportSchema.safeParse(rawData);

      if (!parsed.success) {
        throw new Error(t('dashboard.import_error_format'));
      }

      if (window.confirm(t('dashboard.import_confirm').replace('{count}', parsed.data.pokemon.length.toString()))) {
        await collectionRepository.import(parsed.data.pokemon);
        setSuccess(t('dashboard.import_success'));
      }
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError(t('dashboard.import_error_read'));
      }
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">{t('dashboard.title')}</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <h3 className="font-bold text-slate-800 mb-4">{t('dashboard.collection_summary')}</h3>
          <div className="flex items-center gap-4">
            <div className="bg-indigo-100 text-indigo-700 p-4 rounded-lg w-24 text-center">
              <div className="text-3xl font-black">{pokemonList.length}</div>
            </div>
            <div className="text-slate-600 font-medium">{t('dashboard.total_pokemon')}</div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <h3 className="font-bold text-slate-800 mb-4">{t('dashboard.backup')}</h3>

          <div className="flex flex-col gap-3">
            <button
              onClick={handleExport}
              className="flex items-center justify-center gap-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 p-3 rounded-lg font-medium transition-colors border border-indigo-200"
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
                className="w-full flex items-center justify-center gap-2 bg-white hover:bg-slate-50 text-slate-700 p-3 rounded-lg font-medium transition-colors border border-slate-300"
              >
                <Upload size={20} />
                {t('dashboard.import')}
              </button>
            </div>
          </div>

          {error && (
            <div className="mt-4 p-3 bg-red-50 text-red-700 rounded-lg text-sm flex items-start gap-2">
              <AlertCircle size={16} className="mt-0.5 shrink-0" />
              <p>{error}</p>
            </div>
          )}
          {success && (
            <div className="mt-4 p-3 bg-green-50 text-green-700 rounded-lg text-sm">
              <p>{success}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

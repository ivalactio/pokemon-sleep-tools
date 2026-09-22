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
        throw new Error("Formato de archivo no válido o versión de esquema incorrecta.");
      }
      
      if (window.confirm(`¿Importar ${parsed.data.pokemon.length} Pokémon? Esto sobrescribirá Pokémon con el mismo ID.`)) {
        await collectionRepository.import(parsed.data.pokemon);
        setSuccess("Importación completada con éxito.");
      }
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Error al leer el archivo JSON.");
      }
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div>
      <h2 className="text-2xl font-bold mb-4">{t('nav.dashboard')}</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <h3 className="text-sm font-medium text-slate-500 mb-1">Pokémon en Colección</h3>
          <p className="text-3xl font-bold text-slate-800">{pokemonList.length}</p>
        </div>
      </div>

      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <h3 className="text-lg font-bold mb-4">Datos y Copias de Seguridad</h3>
        
        {error && (
          <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg flex items-center gap-2 text-sm">
            <AlertCircle size={16} /> {error}
          </div>
        )}
        
        {success && (
          <div className="mb-4 p-3 bg-green-50 text-green-700 rounded-lg text-sm">
             {success}
          </div>
        )}

        <div className="flex gap-4">
          <button onClick={handleExport} className="flex items-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2 rounded-lg font-medium transition-colors">
            <Download size={20} /> Exportar JSON
          </button>
          
          <button onClick={() => fileInputRef.current?.click()} className="flex items-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2 rounded-lg font-medium transition-colors">
            <Upload size={20} /> Importar JSON
          </button>
          <input type="file" ref={fileInputRef} className="hidden" accept=".json" onChange={handleImport} />
        </div>
      </div>
    </div>
  );
}

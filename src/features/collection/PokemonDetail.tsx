import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { collectionRepository } from '../../data/repositories/DexieCollectionRepository';
import { ArrowLeft, Trash2, Calculator, AlertCircle } from 'lucide-react';
import gamedata from '../../data/static/gamedata.json';
import { SleepApiEngine } from '../../services/sleepapi/sleepapi-engine';
import type { ProductionEstimate, SimulationConfig, StaticDataSchema } from '../../domain/models';

const engine = new SleepApiEngine(gamedata as unknown as StaticDataSchema);

export default function PokemonDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  
  const pokemon = useLiveQuery(() => id ? collectionRepository.getById(id) : undefined, [id]);

  const [config, setConfig] = useState<SimulationConfig>({
    camp: false,
    bedtime: '22:00',
    wakeup: '06:00'
  });
  
  const [estimate, setEstimate] = useState<ProductionEstimate | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!pokemon) return <div className="p-8 text-center text-slate-500">Cargando o no encontrado...</div>;

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
      <button onClick={() => navigate(-1)} className="mb-4 flex items-center gap-2 text-slate-500 hover:text-slate-800 font-medium">
        <ArrowLeft size={20} /> Volver
      </button>
      
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm relative">
        <button onClick={handleDelete} className="absolute top-6 right-6 text-red-500 hover:bg-red-50 p-2 rounded-lg">
          <Trash2 size={20} />
        </button>
        
        <h2 className="text-3xl font-bold mb-2">{pokemon.nickname || pokemon.speciesId}</h2>
        <p className="text-slate-500 text-lg mb-6">Nivel {pokemon.level} • {pokemon.natureId}</p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div>
            <h3 className="font-bold text-slate-800 mb-2">Detalles Básicos</h3>
            <ul className="space-y-2 text-sm text-slate-600">
              <li><span className="font-medium">Especie:</span> {pokemon.speciesId}</li>
              <li><span className="font-medium">Nivel de Habilidad:</span> {pokemon.skillLevel}</li>
              <li><span className="font-medium">Shiny:</span> {pokemon.shiny ? 'Sí' : 'No'}</li>
            </ul>
          </div>
          <div>
            <h3 className="font-bold text-slate-800 mb-2">Ingredientes & SubSkills</h3>
            <p className="text-sm text-slate-500 italic">Próximamente: renderizado detallado basado en datos estáticos.</p>
          </div>
        </div>
        
        <div className="bg-slate-50 p-6 rounded-xl border border-slate-200">
          <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
            <Calculator size={20} className="text-indigo-600" /> 
            Cálculo de Producción (SleepAPI)
          </h3>
          
          <div className="flex flex-wrap gap-4 mb-4 items-end">
            <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
              Campamento
              <input type="checkbox" checked={config.camp} onChange={e => setConfig({...config, camp: e.target.checked})} className="w-5 h-5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500" />
            </label>
            <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
              Hora de Dormir
              <input type="time" value={config.bedtime} onChange={e => setConfig({...config, bedtime: e.target.value})} className="border border-slate-300 rounded px-2 py-1" />
            </label>
            <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
              Hora de Despertar
              <input type="time" value={config.wakeup} onChange={e => setConfig({...config, wakeup: e.target.value})} className="border border-slate-300 rounded px-2 py-1" />
            </label>
            <button 
              onClick={handleCalculate} 
              disabled={loading}
              className="ml-auto bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2 px-4 rounded-lg disabled:opacity-50"
            >
              {loading ? 'Calculando...' : 'Calcular producción'}
            </button>
          </div>

          {error && (
            <div className="bg-red-50 text-red-700 p-3 rounded-lg flex items-center gap-2 text-sm mb-4">
              <AlertCircle size={16} /> {error}
            </div>
          )}

          {estimate && (
            <div className="bg-white p-4 rounded-lg border border-indigo-100 shadow-sm mt-4">
              <div className="flex justify-between items-center mb-4">
                <h4 className="font-bold text-slate-800">Resultado ESTIMADO</h4>
                <span className="text-xs text-slate-500 bg-slate-100 px-2 py-1 rounded">Periodo: {estimate.period}</span>
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div className="bg-orange-50 p-3 rounded-lg border border-orange-100">
                  <div className="text-xs font-bold text-orange-800 uppercase mb-1">Bayas</div>
                  {estimate.berries.map((b, i) => (
                    <div key={i} className="flex justify-between font-medium text-orange-900">
                      <span>{b.name}</span>
                      <span>{b.amount.toFixed(1)}</span>
                    </div>
                  ))}
                </div>
                
                <div className="bg-amber-50 p-3 rounded-lg border border-amber-100">
                  <div className="text-xs font-bold text-amber-800 uppercase mb-1">Ingredientes</div>
                  {estimate.ingredients.map((ing, i) => (
                    <div key={i} className="flex justify-between font-medium text-amber-900">
                      <span>{ing.name}</span>
                      <span>{ing.amount.toFixed(1)}</span>
                    </div>
                  ))}
                </div>
                
                <div className="bg-blue-50 p-3 rounded-lg border border-blue-100">
                  <div className="text-xs font-bold text-blue-800 uppercase mb-1">Habilidad</div>
                  <div className="font-medium text-blue-900 text-xl">{estimate.skillProcs.toFixed(2)} <span className="text-sm">procs</span></div>
                </div>
              </div>
              <div className="mt-3 text-xs text-slate-400 text-right">
                Calculado a las {new Date(estimate.calculatedAt).toLocaleTimeString()}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}


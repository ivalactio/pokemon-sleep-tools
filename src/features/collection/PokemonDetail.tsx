// No useTranslation import
import { useParams, useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { collectionRepository } from '../../data/repositories/DexieCollectionRepository';
import { ArrowLeft, Trash2 } from 'lucide-react';

export default function PokemonDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  
  const pokemon = useLiveQuery(() => id ? collectionRepository.getById(id) : undefined, [id]);

  if (!pokemon) return <div className="p-8 text-center text-slate-500">Cargando o no encontrado...</div>;

  const handleDelete = async () => {
    if (window.confirm("¿Seguro que quieres eliminar este Pokémon?")) {
      await collectionRepository.delete(pokemon.id);
      navigate('/coleccion');
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
        
        <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
          <h3 className="font-bold text-slate-800 mb-2">Análisis</h3>
          <p className="text-sm text-slate-600">
            Esta sección mostrará cálculos avanzados (Helping Frequency real, producción de ingredientes, valoración) cuando el CalculationEngine esté implementado.
          </p>
        </div>
      </div>
    </div>
  );
}

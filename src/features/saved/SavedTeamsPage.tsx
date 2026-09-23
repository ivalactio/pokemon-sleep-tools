import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../data/db';
import { useNavigate } from 'react-router-dom';
import { useState } from 'react';

export default function SavedTeamsPage() {
  const teams = useLiveQuery(() => db.savedTeams.toArray()) || [];
  const navigate = useNavigate();
  const [selectedForCompare, setSelectedForCompare] = useState<string[]>([]);

  const toggleCompare = (id: string) => {
    if (selectedForCompare.includes(id)) {
      setSelectedForCompare(selectedForCompare.filter(x => x !== id));
    } else {
      if (selectedForCompare.length >= 2) {
        alert('Solo puedes comparar 2 equipos.');
        return;
      }
      setSelectedForCompare([...selectedForCompare, id]);
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('¿Borrar equipo guardado?')) {
      await db.savedTeams.delete(id);
      setSelectedForCompare(selectedForCompare.filter(x => x !== id));
    }
  };

  const handleCompare = () => {
    if (selectedForCompare.length === 2) {
      navigate(`/comparador?t1=${selectedForCompare[0]}&t2=${selectedForCompare[1]}`);
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Equipos Guardados</h1>
        {selectedForCompare.length > 0 && (
          <button 
            onClick={handleCompare}
            disabled={selectedForCompare.length !== 2}
            className={`px-4 py-2 rounded font-bold ${selectedForCompare.length === 2 ? 'bg-amber-500 hover:bg-amber-600 text-white' : 'bg-slate-300 text-slate-500'}`}
          >
            Comparar ({selectedForCompare.length}/2)
          </button>
        )}
      </div>

      <div className="space-y-4">
        {teams.map(t => {
          const isSelected = selectedForCompare.includes(t.id);
          return (
            <div key={t.id} className={`p-4 border-2 rounded-xl flex flex-col md:flex-row gap-4 items-center justify-between shadow-sm ${isSelected ? 'border-amber-500 bg-amber-50 dark:bg-amber-900/20' : 'border-border-main bg-bg-surface'}`}>
              <div className="flex-1">
                <h2 className="text-lg font-bold flex items-center gap-2">
                  <input type="checkbox" checked={isSelected} onChange={() => toggleCompare(t.id)} className="w-5 h-5 rounded cursor-pointer" />
                  {t.name}
                </h2>
                <div className="text-sm text-text-muted mt-2">
                  <p>Score Original: {Math.round(t.metrics?.score || 0).toLocaleString()}</p>
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={() => handleDelete(t.id)} className="px-4 py-2 border border-red-200 text-red-600 hover:bg-red-50 rounded font-bold">Eliminar</button>
              </div>
            </div>
          );
        })}
        {teams.length === 0 && <p className="text-text-muted text-center py-12">No hay equipos guardados.</p>}
      </div>
    </div>
  );
}

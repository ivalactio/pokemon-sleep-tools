import type { WeeklyPlan } from '../../domain/persistence';
import { db } from '../../data/db';
import { Copy, Trash, Edit, Calendar } from 'lucide-react';

interface Props {
  plans: WeeklyPlan[];
  onCreate: () => void;
  onEdit: (id: string) => void;
}

export function WeeklyPlanList({ plans, onCreate, onEdit }: Props) {
  
  const handleDuplicate = async (p: WeeklyPlan) => {
    const newPlan = { ...p, id: crypto.randomUUID(), name: p.name + ' (Copia)', createdAt: Date.now() };
    await db.weeklyPlans.add(newPlan);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('¿Eliminar esta planificación?')) {
      await db.weeklyPlans.delete(id);
    }
  };

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Calendar /> Planificador Semanal
        </h1>
        <button onClick={onCreate} className="px-4 py-2 bg-primary-main hover:bg-primary-hover text-white rounded font-bold">
          Nueva Planificación
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {plans.map(p => (
          <div key={p.id} className="p-4 bg-bg-surface border border-border-main rounded-xl shadow-sm">
            <h2 className="text-xl font-bold mb-2">{p.name}</h2>
            <p className="text-sm text-text-muted mb-4">Inicia: {p.weekStart}</p>
            <div className="flex gap-2">
              <button onClick={() => onEdit(p.id)} className="flex-1 px-3 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-sm font-bold flex items-center justify-center gap-1 rounded">
                <Edit size={16}/> Editar
              </button>
              <button onClick={() => handleDuplicate(p)} className="px-3 py-2 border border-border-main hover:bg-bg-surface-hover text-sm flex items-center justify-center rounded">
                <Copy size={16}/>
              </button>
              <button onClick={() => handleDelete(p.id)} className="px-3 py-2 border border-red-200 text-error-main hover:bg-red-50 dark:hover:bg-red-900/20 text-sm flex items-center justify-center rounded">
                <Trash size={16}/>
              </button>
            </div>
          </div>
        ))}
        {plans.length === 0 && (
          <div className="col-span-full py-12 text-center text-text-muted">
            No hay planificaciones guardadas. Crea una nueva para empezar.
          </div>
        )}
      </div>
    </div>
  );
}

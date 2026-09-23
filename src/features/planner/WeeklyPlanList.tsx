import type { WeeklyPlan } from '../../domain/persistence';
import { db } from '../../data/db';
import { Copy, Trash, Edit, Calendar, Plus } from 'lucide-react';
import { PageHeader, Panel, ActionButton, Badge, EmptyState } from '../../components/ui';
import { useTranslation } from 'react-i18next';

interface Props {
  plans: WeeklyPlan[];
  onCreate: () => void;
  onEdit: (id: string) => void;
}

export function WeeklyPlanList({ plans, onCreate, onEdit }: Props) {
  const { t } = useTranslation();

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
    <div className="space-y-6 pb-20 max-w-6xl mx-auto">
      <PageHeader 
        title="Planificador Semanal"
        icon={Calendar}
        description="Estructura la semana de sueño: asigna equipos por día, planifica comidas y proyecta la fuerza de Snorlax."
        actions={
          <ActionButton 
            variant="primary" 
            onClick={onCreate}
            icon={Plus}
            className="shadow-sm"
          >
            Nueva Planificación
          </ActionButton>
        }
      />

      {plans.length === 0 ? (
        <EmptyState 
          icon={Calendar}
          title="Sin planes semanales"
          description="Aún no has creado ninguna planificación. Diseña tu estrategia semanal para optimizar recetas y fuerza."
          action={
            <ActionButton variant="primary" onClick={onCreate} icon={Plus}>
              Crear primer plan
            </ActionButton>
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {plans.map(p => (
            <Panel key={p.id} className="flex flex-col justify-between hover:border-primary-main/50 transition-all hover:shadow-md">
              <div className="space-y-3 mb-6">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="text-xl font-black text-text-main line-clamp-1" title={p.name}>
                    {p.name}
                  </h3>
                  <Badge variant="primary">
                    {p.island ? t(`islands.${p.island}`) : 'Isla'}
                  </Badge>
                </div>

                <div className="flex items-center gap-2 text-xs font-semibold text-text-muted bg-bg-app px-3 py-2 rounded-lg border border-border-main">
                  <Calendar size={14} className="text-primary-main" />
                  <span>Inicio: {p.weekStart || 'Sin fecha'}</span>
                </div>

                <div className="flex flex-wrap gap-2 pt-1">
                  {p.recipeType && (
                    <Badge variant={p.recipeType === 'curry' ? 'warning' : p.recipeType === 'salad' ? 'success' : 'info'}>
                      {t(`game.recipeType.${p.recipeType}`, { defaultValue: p.recipeType })}
                    </Badge>
                  )}
                  {p.objective && (
                    <Badge variant="default">
                      {p.objective === 'berries' ? 'Bayas' : p.objective === 'ingredients' ? 'Ingredientes' : 'Recetas'}
                    </Badge>
                  )}
                </div>

                {p.notes && (
                  <p className="text-xs text-text-muted italic line-clamp-2 bg-bg-app p-2.5 rounded-lg border border-border-main">
                    "{p.notes}"
                  </p>
                )}
              </div>

              <div className="flex items-center gap-2 pt-4 border-t border-border-main">
                <ActionButton 
                  variant="primary" 
                  onClick={() => onEdit(p.id)} 
                  icon={Edit}
                  className="flex-1 text-xs py-2"
                >
                  Abrir Plan
                </ActionButton>
                <ActionButton 
                  variant="outline" 
                  onClick={() => handleDuplicate(p)} 
                  icon={Copy}
                  title="Duplicar plan"
                  className="py-2"
                />
                <ActionButton 
                  variant="outline" 
                  onClick={() => handleDelete(p.id)} 
                  icon={Trash}
                  title="Eliminar"
                  className="py-2 text-error-main border-error-main/20 hover:bg-error-bg hover:text-error-main"
                />
              </div>
            </Panel>
          ))}
        </div>
      )}
    </div>
  );
}

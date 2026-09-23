import { useState, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../data/db';
import { WeeklyPlanList } from './WeeklyPlanList';
import { WeeklyPlanEditor } from './WeeklyPlanEditor';
import { plannerStore } from './plannerStore';

export default function WeeklyPlannerPage() {
  const plans = useLiveQuery(() => db.weeklyPlans.toArray()) || [];
  const [activeState, setActiveState] = useState(plannerStore.getState());

  useEffect(() => {
    return plannerStore.subscribe(() => {
      setActiveState(plannerStore.getState());
    });
  }, []);

  const handleCreate = () => {
    plannerStore.resetForNewQuery();
  };

  const handleEdit = (id: string) => {
    plannerStore.setSelectedPlanId(id);
  };

  const handleBack = () => {
    plannerStore.clear();
  };

  const { selectedPlanId, draft } = activeState;

  if (selectedPlanId === 'new') {
    const initialPlan = draft ? (draft as any) : undefined;
    return <WeeklyPlanEditor plan={initialPlan} onBack={handleBack} />;
  }

  if (selectedPlanId) {
    const plan = plans.find(p => p.id === selectedPlanId) || (draft ? (draft as any) : undefined);
    if (plan) {
      return <WeeklyPlanEditor plan={plan} onBack={handleBack} />;
    } else {
      plannerStore.clear();
    }
  }

  return <WeeklyPlanList plans={plans} onCreate={handleCreate} onEdit={handleEdit} />;
}

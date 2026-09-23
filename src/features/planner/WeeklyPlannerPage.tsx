import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../data/db';
import { WeeklyPlanList } from './WeeklyPlanList';
import { WeeklyPlanEditor } from './WeeklyPlanEditor';

export default function WeeklyPlannerPage() {
  const plans = useLiveQuery(() => db.weeklyPlans.toArray()) || [];
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);

  const handleCreate = () => {
    setSelectedPlanId('new');
  };

  const handleEdit = (id: string) => {
    setSelectedPlanId(id);
  };

  const handleBack = () => {
    setSelectedPlanId(null);
  };

  if (selectedPlanId === 'new') {
    return <WeeklyPlanEditor onBack={handleBack} />;
  }

  if (selectedPlanId) {
    const plan = plans.find(p => p.id === selectedPlanId);
    if (plan) {
      return <WeeklyPlanEditor plan={plan} onBack={handleBack} />;
    } else {
      setSelectedPlanId(null);
    }
  }

  return <WeeklyPlanList plans={plans} onCreate={handleCreate} onEdit={handleEdit} />;
}

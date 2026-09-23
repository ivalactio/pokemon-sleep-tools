import type { WeeklyPlan } from '../../domain/persistence';

export interface PlannerActiveState {
  selectedPlanId: string | null;
  draft: Partial<WeeklyPlan> | null;
}

let state: PlannerActiveState = {
  selectedPlanId: null,
  draft: null
};

const listeners = new Set<() => void>();

function notify() {
  listeners.forEach(fn => fn());
}

export const plannerStore = {
  getState(): PlannerActiveState {
    return state;
  },
  setSelectedPlanId(id: string | null) {
    state = { ...state, selectedPlanId: id };
    notify();
  },
  setDraft(draft: Partial<WeeklyPlan> | null) {
    state = { ...state, draft };
    notify();
  },
  resetForNewQuery() {
    state = {
      selectedPlanId: 'new',
      draft: null
    };
    notify();
  },
  clear() {
    state = {
      selectedPlanId: null,
      draft: null
    };
    notify();
  },
  subscribe(fn: () => void) {
    listeners.add(fn);
    return () => {
      listeners.delete(fn);
    };
  }
};

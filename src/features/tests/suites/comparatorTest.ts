import { globalHarness } from '../testHarness';
import { collectionRepository } from '../../../data/repositories/DexieCollectionRepository';
import { TeamEvaluator } from '../../../services/optimizer/TeamEvaluator';
import { LocalCalculationEngine } from '../../../services/optimizer/calculator/LocalCalculationEngine';
import type { StaticDataSchema, SimulationConfig } from '../../../domain/models';
import gamedata from '../../../data/static/gamedata.json';

const gd = gamedata as unknown as StaticDataSchema;
const engine = new LocalCalculationEngine(gd);

globalHarness.register({
  id: 'CMP-001',
  name: 'Evaluación de equipo aislado',
  category: 'Comparator',
  fn: async () => {
    const all = await collectionRepository.getAll();
    if (all.length < 5) return { status: 'SKIP', message: 'Faltan Pokémon' };

    const config: SimulationConfig = {
      
      camp: false,
      bedtime: '23:00', wakeup: '07:00', island: 'greengrass', areaBonus: 0
    };

    const evaluator = new TeamEvaluator(engine, gd);
    
    const team = {
      members: [all[0], all[1], all[2], all[3], all[4]]
    };
    const ctx = await evaluator.evaluate(team, config);

    // we don't have score calculated by TeamEvaluator alone, score is from ScoringStrategies
    if (ctx.memberEstimates.length !== 5) {
      return { status: 'WARN', message: 'No evaluó a 5 miembros.' };
    }

    return { status: 'PASS', message: `Evaluación completada` };
  }
});

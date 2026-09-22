import gamedata from './src/data/static/gamedata.json' assert { type: 'json' };
import { SleepApiEngine } from './src/services/sleepapi/sleepapi-engine.js';
import fs from 'fs';

const pokemon = {
  id: '1234',
  speciesId: 'BULBASAUR',
  nickname: 'Bulby',
  level: 30,
  ribbonLevel: 0,
  natureId: 'Brave',
  subskills: {
    10: 'Helping Bonus',
    25: null,
    50: null,
    75: null,
    100: null
  },
  ingredientChoices: {
    30: 'Honey',
    60: null
  },
  skillLevel: 1,
  shiny: false,
  notes: '',
  sneakySnacking: true,
  helpingFrequencySeen: null,
  carryLimitSeen: null,
  source: 'manual',
  createdAt: Date.now(),
  updatedAt: Date.now(),
  gameDataVersion: '1.0.0'
};

const config = {
  camp: false,
  bedtime: '22:00',
  wakeup: '06:00'
};

const engine = new SleepApiEngine(gamedata as any);

// Inject fetch mock to log the request
const originalFetch = globalThis.fetch;
let requestPayload = null;
globalThis.fetch = async (url, options) => {
  if (url.includes('calculator/team')) {
    requestPayload = JSON.parse(options.body as string);
  }
  return originalFetch(url, options);
};

async function run() {
  const estimate = await engine.estimateProduction(pokemon as any, config);
  
  const report = {
    pokemon,
    requestSent: requestPayload,
    estimate
  };
  
  fs.writeFileSync('integration_report.json', JSON.stringify(report, null, 2));
  console.log('Done!');
}

run().catch(console.error);

import fs from 'fs/promises';

const BASE_URL = 'https://sleepapi.net/api';
let fetchErrors = [];

async function fetchJSON(endpoint) {
  try {
    const res = await fetch(`${BASE_URL}${endpoint}`);
    if (!res.ok) {
      console.error(`Failed to fetch ${endpoint}: ${res.status}`);
      fetchErrors.push({ endpoint, status: res.status, date: new Date().toISOString() });
      return null;
    }
    return await res.json();
  } catch (e) {
    console.error(`Error fetching ${endpoint}`, e);
    fetchErrors.push({ endpoint, status: 'NETWORK_ERROR', error: e.message, date: new Date().toISOString() });
    return null;
  }
}

async function fetchAll(listEndpoint) {
  const names = await fetchJSON(listEndpoint);
  if (!names || !Array.isArray(names)) return [];
  if (names.length > 0 && typeof names[0] !== 'string') return names;

  console.log(`Fetching ${names.length} items from ${listEndpoint}...`);
  const results = [];
  for (let i = 0; i < names.length; i += 10) {
    const chunk = names.slice(i, i + 10);
    const promises = chunk.map(name => fetchJSON(`${listEndpoint}/${encodeURIComponent(name)}`));
    const items = await Promise.all(promises);
    results.push(...items.filter(item => item !== null));
    await new Promise(r => setTimeout(r, 100));
  }
  return results;
}

const NATURES = [
  { name: "Lonely", up: "speed", down: "energy" },
  { name: "Adamant", up: "speed", down: "ingredient" },
  { name: "Naughty", up: "speed", down: "skill" },
  { name: "Brave", up: "speed", down: "exp" },
  { name: "Bold", up: "energy", down: "speed" },
  { name: "Impish", up: "energy", down: "ingredient" },
  { name: "Lax", up: "energy", down: "skill" },
  { name: "Relaxed", up: "energy", down: "exp" },
  { name: "Modest", up: "ingredient", down: "speed" },
  { name: "Mild", up: "ingredient", down: "energy" },
  { name: "Rash", up: "ingredient", down: "skill" },
  { name: "Quiet", up: "ingredient", down: "exp" },
  { name: "Calm", up: "skill", down: "speed" },
  { name: "Gentle", up: "skill", down: "energy" },
  { name: "Careful", up: "skill", down: "ingredient" },
  { name: "Sassy", up: "skill", down: "exp" },
  { name: "Timid", up: "exp", down: "speed" },
  { name: "Hasty", up: "exp", down: "energy" },
  { name: "Jolly", up: "exp", down: "ingredient" },
  { name: "Naive", up: "exp", down: "skill" },
  { name: "Bashful", up: null, down: null },
  { name: "Hardy", up: null, down: null },
  { name: "Docile", up: null, down: null },
  { name: "Quirky", up: null, down: null },
  { name: "Serious", up: null, down: null },
];

const SUBSKILLS = [
  { name: "Berry Finding S", rarity: "gold" },
  { name: "Dream Shard Bonus", rarity: "gold" },
  { name: "Energy Recovery Bonus", rarity: "gold" },
  { name: "Helping Bonus", rarity: "gold" },
  { name: "Research EXP Bonus", rarity: "gold" },
  { name: "Sleep EXP Bonus", rarity: "gold" },
  { name: "Skill Level Up M", rarity: "gold" },
  { name: "Helping Speed M", rarity: "silver" },
  { name: "Ingredient Finder M", rarity: "silver" },
  { name: "Inventory Up L", rarity: "silver" },
  { name: "Skill Chance M", rarity: "silver" },
  { name: "Skill Level Up S", rarity: "silver" },
  { name: "Helping Speed S", rarity: "blue" },
  { name: "Ingredient Finder S", rarity: "blue" },
  { name: "Inventory Up M", rarity: "blue" },
  { name: "Inventory Up S", rarity: "blue" },
  { name: "Skill Chance S", rarity: "blue" }
];

async function main() {
  console.log("Fetching complete static data from SleepAPI...");
  const pokemonList = await fetchAll('/pokemon');
  const meals = await fetchAll('/meal');
  
  // Extract berries, ingredients and main skills directly from Pokemon data
  const berriesMap = new Map();
  const ingredientsMap = new Map();
  const skillsMap = new Map();
  
  pokemonList.forEach(p => {
    if (p.berry) berriesMap.set(p.berry.name, p.berry);
    if (p.skill) skillsMap.set(p.skill.name, p.skill);
    
    const extractIngs = (arr) => {
      if (arr) {
        arr.forEach(i => {
          if (i.ingredient) ingredientsMap.set(i.ingredient.name, i.ingredient);
        });
      }
    };
    extractIngs(p.ingredient0);
    extractIngs(p.ingredient30);
    extractIngs(p.ingredient60);
  });
  
  const data = {
    gameDataVersion: "1.0.0",
    species: pokemonList,
    ingredients: Array.from(ingredientsMap.values()),
    berries: Array.from(berriesMap.values()),
    recipes: meals,
    mainSkills: Array.from(skillsMap.values()),
    subSkills: SUBSKILLS,
    natures: NATURES
  };

  await fs.mkdir('./src/data/static', { recursive: true });
  await fs.writeFile('./src/data/static/gamedata.json', JSON.stringify(data, null, 2));
  
  await fs.writeFile('./src/data/static/sync-report.json', JSON.stringify({
    syncDate: new Date().toISOString(),
    source: BASE_URL + " + Neroli's Lab common structures",
    errors: fetchErrors
  }, null, 2));
  console.log("Data saved to src/data/static/gamedata.json");
  console.log("Sync report saved to src/data/static/sync-report.json");
}

main();

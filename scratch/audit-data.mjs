import fs from 'fs';

function auditData() {
  const dataPath = './src/data/static/gamedata.json';
  if (!fs.existsSync(dataPath)) {
    console.error("No gamedata.json found!");
    return;
  }
  
  const data = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));
  const species = data.species || [];
  const recipes = data.recipes || [];
  const ingredients = data.ingredients || [];
  const berries = data.berries || [];
  const mainSkills = data.mainSkills || [];
  const subSkills = data.subSkills || [];
  const natures = data.natures || [];

  const stats = {
    species: species.length,
    recipes: recipes.length,
    ingredients: ingredients.length,
    berries: berries.length,
    mainSkills: mainSkills.length,
    subSkills: subSkills.length,
    natures: natures.length
  };
  
  const errors = [];
  
  // Create sets for fast lookup
  const ingredientNames = new Set(ingredients.map(i => i.name));
  const berryNames = new Set(berries.map(b => b.name));
  const mainSkillNames = new Set(mainSkills.map(m => m.name));
  const speciesNames = new Set(species.map(s => s.name));
  
  // Check species
  species.forEach(s => {
    if (!s.berry || !berryNames.has(s.berry.name)) {
      errors.push(`Species ${s.name} references invalid or missing berry: ${s.berry ? s.berry.name : 'null'}`);
    }
    if (s.skill && !mainSkillNames.has(s.skill.name)) {
      errors.push(`Species ${s.name} references missing main skill: ${s.skill.name}`);
    }
    
    // Check evolutions
    if (s.evolvesInto) {
      s.evolvesInto.forEach(evo => {
        if (!speciesNames.has(evo)) {
          errors.push(`Species ${s.name} evolves into unknown species: ${evo}`);
        }
      });
    }
    
    // Check ingredients
    const checkIng = (arr, type) => {
      if (arr) {
        arr.forEach(i => {
          if (!ingredientNames.has(i.ingredient.name)) {
            errors.push(`Species ${s.name} references unknown ingredient at ${type}: ${i.ingredient.name}`);
          }
        });
      }
    };
    checkIng(s.ingredient0, 'level 0');
    checkIng(s.ingredient30, 'level 30');
    checkIng(s.ingredient60, 'level 60');
  });
  
  // Check recipes
  recipes.forEach(r => {
    if (r.ingredients) {
      r.ingredients.forEach(i => {
        if (!ingredientNames.has(i.ingredient.name)) {
          errors.push(`Recipe ${r.name} references unknown ingredient: ${i.ingredient.name}`);
        }
      });
    }
  });

  // Missing species can be read from the sync report
  let missingSpecies = [];
  try {
    if (fs.existsSync('./src/data/static/sync-report.json')) {
      const syncReport = JSON.parse(fs.readFileSync('./src/data/static/sync-report.json', 'utf-8'));
      missingSpecies = syncReport.errors.filter(e => e.endpoint.startsWith('/pokemon')).map(e => e.endpoint.replace('/pokemon/', ''));
    }
  } catch(e) {}

  const totalSpecies = species.length + missingSpecies.length;

  const report = {
    "numero_total_de_especies_disponibles": totalSpecies,
    "numero_total_de_especies_importadas": species.length,
    "especies_faltantes": missingSpecies,
    "numero_de_recetas": recipes.length,
    "numero_de_ingredientes": ingredients.length,
    "numero_de_berries": berries.length,
    "numero_de_main_skills": mainSkills.length,
    "numero_de_sub_skills": subSkills.length,
    "numero_de_naturalezas": natures.length,
    "completitud": {
      "especies": species.length === totalSpecies && species.length > 0 ? "Completo" : "Incompleto",
      "recetas": recipes.length > 0 ? "Completo" : "Incompleto",
      "ingredientes": ingredients.length > 0 && typeof ingredients[0] === 'object' ? "Completo" : "Incompleto",
      "berries": berries.length > 0 ? "Completo" : "Incompleto",
      "mainSkills": mainSkills.length > 0 && typeof mainSkills[0] === 'object' ? "Completo" : "Incompleto",
      "subSkills": subSkills.length > 0 && typeof subSkills[0] === 'object' ? "Completo" : "Incompleto",
      "naturalezas": natures.length > 0 && typeof natures[0] === 'object' ? "Completo" : "Incompleto"
    }
  };

  fs.writeFileSync('./scratch/audit-report.json', JSON.stringify(report, null, 2));
  console.log("Audit complete. Wrote scratch/audit-report.json");
}

auditData();

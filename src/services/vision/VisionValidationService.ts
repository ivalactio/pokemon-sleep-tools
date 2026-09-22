import type { PokemonExtractionResult, PokemonDraft } from '../../domain/vision/models';
import type { OwnedPokemon, StaticDataSchema } from '../../domain/models';
import _gamedata from '../../data/static/gamedata.json';
import enLocale from '../../i18n/locales/en.json';
import esLocale from '../../i18n/locales/es.json';

const gamedata = _gamedata as unknown as StaticDataSchema;

// Normalization function to remove multiple spaces, punctuation, and lowercase
function cleanString(str: string): string {
  return str
    .toLowerCase()
    .replace(/[.,/#!$%^&*;:{}=\-_`~()]/g, '') // strip common punctuation
    .replace(/\s{2,}/g, ' ') // collapse multiple spaces
    .trim();
}

// Reverse lookup maps
const canonicalMap: Record<string, { type: string; id: string }> = {};

function addMapping(type: string, id: string, localizedNames: string[]) {
  for (const name of localizedNames) {
    if (name) {
      const cleaned = cleanString(name);
      // We overwrite or add to map. For game entities, names are unique enough.
      canonicalMap[cleaned] = { type, id };
    }
  }
}

// 1. Map Species
for (const species of gamedata.species) {
  addMapping('species', species.name, [species.name, species.displayName]);
}

// 2. Map Locales
const locales = [enLocale.game, esLocale.game];
for (const locale of locales) {
  if (locale.nature) {
    for (const [id, name] of Object.entries(locale.nature)) addMapping('nature', id, [name]);
  }
  if (locale.subskill) {
    for (const [id, name] of Object.entries(locale.subskill)) addMapping('subskill', id, [name]);
  }
  if (locale.mainSkill) {
    for (const [id, name] of Object.entries(locale.mainSkill)) addMapping('mainSkill', id, [name]);
  }
  if (locale.ingredient) {
    for (const [id, name] of Object.entries(locale.ingredient)) addMapping('ingredient', id, [name]);
  }
}

// 3. Explicit Aliases
// Old ingredient translations and partial names
addMapping('ingredient', 'Honey', ['Miel Dulce']);
addMapping('ingredient', 'Tomato', ['Tomate Ronquido', 'Tomate']);
addMapping('ingredient', 'Soybean', ['Soja Saludable', 'Soja']);
addMapping('ingredient', 'Egg', ['Huevo Sabroso', 'Huevo']);
addMapping('ingredient', 'Ginger', ['Jengibre Entusiasta']);
addMapping('ingredient', 'Corn', ['Maíz Greengrass', 'Maíz']);
addMapping('ingredient', 'Potato', ['Patata Suave']);
addMapping('ingredient', 'Coffee', ['Cafe Estimulante']);
addMapping('ingredient', 'Pumpkin', ['Calabaza']);
addMapping('ingredient', 'Tail', ['Cola Slowpoke']);
addMapping('ingredient', 'Milk', ['Leche']);
addMapping('ingredient', 'Cacao', ['Cacao']);
addMapping('ingredient', 'Herb', ['Hierba']);
addMapping('ingredient', 'Mushroom', ['Seta']);
addMapping('ingredient', 'Sausage', ['Salchicha']);
addMapping('ingredient', 'Leek', ['Puerro']);
addMapping('ingredient', 'Apple', ['Manzana']);
addMapping('ingredient', 'Oil', ['Aceite']);

// Subskill old translations and common english shorthands
addMapping('subskill', 'Skill Trigger S', ['Skill Trigger S']);
addMapping('subskill', 'Skill Trigger M', ['Skill Trigger M']);
addMapping('subskill', 'Helping Bonus', ['Helping Bonus']);
addMapping('subskill', 'Sleep EXP Bonus', ['Sleep EXP Bonus']);
addMapping('subskill', 'Research EXP Bonus', ['Research EXP Bonus']);
addMapping('subskill', 'Dream Shard Bonus', ['Dream Shard Bonus']);
addMapping('subskill', 'Energy Recovery Bonus', ['Energy Recovery Bonus']);
addMapping('subskill', 'Berry Finding S', ['Berry Finding S']);
addMapping('subskill', 'Inventory Up S', ['Inventory S']);
addMapping('subskill', 'Inventory Up M', ['Inventory M']);
addMapping('subskill', 'Inventory Up L', ['Inventory L']);
addMapping('subskill', 'Ingredient Finder S', ['Ingredient Finder S', 'Hallazgo de Ingredientes S']);
addMapping('subskill', 'Ingredient Finder M', ['Ingredient Finder M', 'Hallazgo de Ingredientes M']);
addMapping('subskill', 'Helping Speed S', ['Helping Speed S', 'Rapidez de Ayuda S']);
addMapping('subskill', 'Helping Speed M', ['Helping Speed M', 'Rapidez de Ayuda M']);
addMapping('subskill', 'Skill Level Up S', ['Skill Level Up S', 'Nivel de Habilidad Principal S']);
addMapping('subskill', 'Skill Level Up M', ['Skill Level Up M', 'Nivel de Habilidad Principal M']);
addMapping('subskill', 'Skill Level Up L', ['Skill Level Up L']);

addMapping('mainSkill', 'Charge Energy S', ['Charge Energy']);

export class VisionValidationService {
  
  static normalizeString(value: string | null, type: string): string | null {
    if (!value) return null;
    const cleaned = cleanString(value);
    
    const match = canonicalMap[cleaned];
    if (match && match.type === type) {
      return match.id;
    }
    
    // Exact or normalized match failed.
    // NO fuzzy matching allowed to avoid ambiguous data.
    return null;
  }

  static validateExtraction(extraction: PokemonExtractionResult): PokemonDraft {
    const pokemon: Partial<OwnedPokemon> = {};
    const errors: Record<string, string> = {};
    const warnings: string[] = [];

    // 1. Species
    const speciesExt = extraction.species;
    if (speciesExt.value) {
      const canonicalSpecies = this.normalizeString(speciesExt.value, 'species');
      if (canonicalSpecies) {
        pokemon.speciesId = canonicalSpecies;
      } else {
        errors['species'] = `Especie no reconocida de forma inequívoca: ${speciesExt.value}`;
      }
      if (speciesExt.confidence < 0.7) warnings.push(`Baja confianza en especie: ${speciesExt.value}`);
    } else {
      errors['species'] = 'Especie es obligatoria pero no se detectó';
    }

    // 2. Nickname
    if (extraction.nickname.value) {
      pokemon.nickname = extraction.nickname.value;
    }

    // 3. Level
    if (extraction.level.value !== null) {
      const lv = extraction.level.value;
      if (typeof lv === 'number' && lv >= 1 && lv <= 100) {
        pokemon.level = lv;
      } else {
        errors['level'] = `Nivel inválido: ${lv}`;
      }
      if (extraction.level.confidence < 0.7) warnings.push(`Baja confianza en nivel`);
    }

    // 4. Nature
    if (extraction.nature.value) {
      const canonicalNature = this.normalizeString(extraction.nature.value, 'nature');
      if (canonicalNature) {
        pokemon.natureId = canonicalNature;
      } else {
        errors['nature'] = `Naturaleza no reconocida: ${extraction.nature.value}`;
      }
      if (extraction.nature.confidence < 0.7) warnings.push(`Baja confianza en naturaleza`);
    }

    // 5. Shiny
    if (extraction.shiny.value !== null) {
      pokemon.shiny = extraction.shiny.value;
    }
    
    // 6. Ribbon
    if (extraction.ribbon.value !== null) {
      const rb = extraction.ribbon.value;
      if (rb >= 0 && rb <= 4) {
        pokemon.ribbonLevel = rb as 0|1|2|3|4;
      } else {
        errors['ribbon'] = `Nivel de cinta inválido: ${rb}`;
      }
    }

    // 7. Sneaky Snacking
    if (extraction.sneakySnacking.value !== null) {
      pokemon.sneakySnacking = extraction.sneakySnacking.value;
    }
    
    // 8. Skill Level
    if (extraction.skillLevel.value !== null) {
      pokemon.skillLevel = extraction.skillLevel.value;
    }

    // 9. Subskills
    pokemon.subskills = { 10: null, 25: null, 50: null, 75: null, 100: null };
    const slots = [10, 25, 50, 75, 100] as const;
    for (const slot of slots) {
      const subExt = extraction.subskills[slot];
      if (subExt && subExt.value) {
        const canonicalSub = this.normalizeString(subExt.value, 'subskill');
        if (canonicalSub) {
          pokemon.subskills[slot] = canonicalSub;
        } else {
          errors[`subskill_${slot}`] = `Subhabilidad no reconocida en nv ${slot}: ${subExt.value}`;
        }
        if (subExt.confidence < 0.7) warnings.push(`Baja confianza en subhabilidad nv ${slot}`);
      }
    }

    // 10. Ingredients
    pokemon.ingredientChoices = { 1: null, 30: null, 60: null };
    const ingSlots = [1, 30, 60] as const;
    for (const slot of ingSlots) {
      const ingExt = extraction.ingredients[slot];
      if (ingExt && ingExt.value) {
        const canonicalIng = this.normalizeString(ingExt.value, 'ingredient');
        if (canonicalIng) {
          pokemon.ingredientChoices[slot] = canonicalIng;
        } else {
          errors[`ingredient_${slot}`] = `Ingrediente no reconocido en nv ${slot}: ${ingExt.value}`;
        }
        if (ingExt.confidence < 0.7) warnings.push(`Baja confianza en ingrediente nv ${slot}`);
      }
    }
    
    // Validate ingredients belong to the species if species is known
    if (pokemon.speciesId) {
       const speciesData = gamedata.species.find(s => s.name === pokemon.speciesId);
       if (speciesData) {
         if (pokemon.ingredientChoices[1]) {
           const valid = speciesData.ingredient0.some(i => i.ingredient.name === pokemon.ingredientChoices![1]);
           if (!valid) errors['ingredient_1'] = `Ingrediente nv 1 no válido para ${pokemon.speciesId}`;
         }
         if (pokemon.ingredientChoices[30]) {
           const valid = speciesData.ingredient30.some(i => i.ingredient.name === pokemon.ingredientChoices![30]);
           if (!valid) errors['ingredient_30'] = `Ingrediente nv 30 no válido para ${pokemon.speciesId}`;
         }
         if (pokemon.ingredientChoices[60]) {
           const valid = speciesData.ingredient60.some(i => i.ingredient.name === pokemon.ingredientChoices![60]);
           if (!valid) errors['ingredient_60'] = `Ingrediente nv 60 no válido para ${pokemon.speciesId}`;
         }
       }
    }

    return {
      pokemon,
      errors,
      warnings,
      rawExtraction: extraction
    };
  }
}

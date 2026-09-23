import type { OwnedPokemon, StaticDataSchema } from '../domain/models';
import { getSpeciesMainSkillName } from '../services/i18n-game';

export interface ValidationResult {
  isValid: boolean;
  errors: Record<string, string>;
}

/**
  * Validates an OwnedPokemon instance against domain rules and gamedata schemas.
  * Operates purely on internal IDs/values, completely independent of UI language.
  */
export function validatePokemon(pokemon: OwnedPokemon | null | undefined, gameData: StaticDataSchema): ValidationResult {
  const errors: Record<string, string> = {};

  if (!pokemon) {
    return { isValid: false, errors: { general: 'No hay datos de Pokémon para validar' } };
  }

  // 1. Valid Species
  if (!pokemon.speciesId) {
    errors.speciesId = 'La especie es obligatoria';
  } else {
    const species = gameData.species.find(s => s.name === pokemon.speciesId);
    if (!species) {
      errors.speciesId = `Especie no encontrada en gamedata: ${pokemon.speciesId}`;
    } else {
      // 2. Specialty check
      if (!species.specialty) {
        errors.specialty = 'La especie debe tener una especialidad definida';
      }

      // 3. Main skill check
      const mainSkillName = getSpeciesMainSkillName(species);
      if (!mainSkillName) {
        errors.mainSkill = 'La especie debe tener una habilidad principal válida';
      }

      // 4. Ingredients validation for unlocked levels
      const ing0Options = species.ingredient0?.map(i => i.ingredient.name) || [];
      const ing30Options = species.ingredient30?.map(i => i.ingredient.name) || [];
      const ing60Options = species.ingredient60?.map(i => i.ingredient.name) || [];

      // Level 1 ingredient
      const ing1Choice = pokemon.ingredientChoices?.[1];
      if (!ing1Choice) {
        errors.ingredient_1 = 'Ingrediente de nivel 1 es obligatorio';
      } else if (!ing0Options.includes(ing1Choice)) {
        errors.ingredient_1 = `Ingrediente '${ing1Choice}' no es válido para nivel 1 en ${species.displayName || species.name}`;
      }

      // Level 30 ingredient
      if (pokemon.level >= 30) {
        const ing30Choice = pokemon.ingredientChoices?.[30];
        if (!ing30Choice) {
          errors.ingredient_30 = 'Ingrediente de nivel 30 es obligatorio para nivel >= 30';
        } else if (!ing30Options.includes(ing30Choice)) {
          errors.ingredient_30 = `Ingrediente '${ing30Choice}' no es válido para nivel 30 en ${species.displayName || species.name}`;
        }
      }

      // Level 60 ingredient
      if (pokemon.level >= 60) {
        const ing60Choice = pokemon.ingredientChoices?.[60];
        if (!ing60Choice) {
          errors.ingredient_60 = 'Ingrediente de nivel 60 es obligatorio para nivel >= 60';
        } else if (!ing60Options.includes(ing60Choice)) {
          errors.ingredient_60 = `Ingrediente '${ing60Choice}' no es válido para nivel 60 en ${species.displayName || species.name}`;
        }
      }
    }
  }

  // 5. Level limits (1 - 100)
  if (typeof pokemon.level !== 'number' || !Number.isInteger(pokemon.level) || pokemon.level < 1 || pokemon.level > 100) {
    errors.level = 'El nivel debe ser un número entero entre 1 y 100';
  }

  // 6. Skill Level limits (1 - 7)
  if (typeof pokemon.skillLevel !== 'number' || !Number.isInteger(pokemon.skillLevel) || pokemon.skillLevel < 1 || pokemon.skillLevel > 7) {
    errors.skillLevel = 'El nivel de habilidad principal debe ser entre 1 y 7';
  }

  // 7. Nature validation
  if (pokemon.natureId) {
    const validNature = gameData.natures.some(n => n.name === pokemon.natureId);
    if (!validNature) {
      errors.natureId = `Naturaleza no válida: ${pokemon.natureId}`;
    }
  }

  // 8. Subskills validation
  if (pokemon.subskills) {
    const validSubskillNames = new Set(gameData.subSkills.map(s => s.name));
    const subskillLevels: (10 | 25 | 50 | 75 | 100)[] = [10, 25, 50, 75, 100];
    const seenSubskills = new Set<string>();

    for (const lvl of subskillLevels) {
      const subskillChoice = pokemon.subskills[lvl];
      if (pokemon.level >= lvl) {
        if (!subskillChoice) {
          errors[`subskill_${lvl}`] = `Subhabilidad de nivel ${lvl} es obligatoria`;
        } else if (!validSubskillNames.has(subskillChoice)) {
          errors[`subskill_${lvl}`] = `Subhabilidad '${subskillChoice}' no es válida`;
        }
      }

      if (subskillChoice) {
        if (seenSubskills.has(subskillChoice)) {
          errors[`subskill_${lvl}`] = `La subhabilidad '${subskillChoice}' está duplicada`;
        } else {
          seenSubskills.add(subskillChoice);
        }
      }
    }
  } else {
    errors.subskills = 'El objeto de subhabilidades es obligatorio';
  }

  // 9. Ribbon level
  if (typeof pokemon.ribbonLevel !== 'number' || ![0, 1, 2, 3, 4].includes(pokemon.ribbonLevel)) {
    errors.ribbonLevel = 'El nivel de cinta debe ser entre 0 y 4';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
}

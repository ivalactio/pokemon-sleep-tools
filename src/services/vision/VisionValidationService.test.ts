import { describe, it, expect } from 'vitest';
import { VisionValidationService } from './VisionValidationService';
import type { PokemonExtractionResult } from '../../domain/vision/models';

describe('VisionValidationService', () => {
  it('should validate and normalize a perfect extraction (English names)', () => {
    const extraction: PokemonExtractionResult = {
      species: { value: "Pikachu", confidence: 0.99 },
      nickname: { value: "Sparky", confidence: 0.95 },
      level: { value: 25, confidence: 0.98 },
      nature: { value: "Lonely", confidence: 0.90 },
      mainSkill: { value: "Charge Energy S", confidence: 0.99 },
      skillLevel: { value: 2, confidence: 0.85 },
      subskills: {
        10: { value: "Berry Finding S", confidence: 0.98 },
        25: { value: "Helping Speed M", confidence: 0.95 },
        50: { value: "Inventory Up L", confidence: 0.90 },
        75: { value: "Skill Chance S", confidence: 0.85 },
        100: { value: "Sleep EXP Bonus", confidence: 0.80 }
      },
      ingredients: {
        1: { value: "Apple", confidence: 0.99 }, // Pikachu has apple
        30: { value: "Apple", confidence: 0.95 },
        60: { value: "Apple", confidence: 0.90 }
      },
      shiny: { value: false, confidence: 0.99 },
      ribbon: { value: 1, confidence: 0.99 },
      sneakySnacking: { value: true, confidence: 0.99 }
    };

    const draft = VisionValidationService.validateExtraction(extraction);
    
    expect(Object.keys(draft.errors)).toHaveLength(0);
    expect(draft.pokemon.speciesId).toBe('PIKACHU');
    expect(draft.pokemon.natureId).toBe('Lonely');
    expect(draft.pokemon.subskills?.[10]).toBe('Berry Finding S');
    expect(draft.pokemon.ingredientChoices?.[1]).toBe('Apple');
  });

  it('should normalize Spanish names correctly', () => {
    const extraction: PokemonExtractionResult = {
      species: { value: "Pikachu", confidence: 0.99 },
      nickname: { value: null, confidence: 0 },
      level: { value: 10, confidence: 0.99 },
      nature: { value: "Mansa", confidence: 0.99 }, // Quiet in Spanish
      mainSkill: { value: "Imán Ingredientes S", confidence: 0.99 },
      skillLevel: { value: 1, confidence: 0.99 },
      subskills: {
        10: { value: "Hallazgo de Ingredientes M", confidence: 0.99 }, // Ingredient Finder M
        25: { value: null, confidence: 0 },
        50: { value: null, confidence: 0 },
        75: { value: null, confidence: 0 },
        100: { value: null, confidence: 0 }
      },
      ingredients: {
        1: { value: "Manzana Selecta", confidence: 0.99 }, // Apple
        30: { value: "Miel Dulce", confidence: 0.99 }, // Honey
        60: { value: null, confidence: 0 }
      },
      shiny: { value: null, confidence: 0 },
      ribbon: { value: null, confidence: 0 },
      sneakySnacking: { value: null, confidence: 0 }
    };

    const draft = VisionValidationService.validateExtraction(extraction);
    
    expect(draft.pokemon.natureId).toBe('Quiet');
    expect(draft.pokemon.subskills?.[10]).toBe('Ingredient Finder M');
    expect(draft.pokemon.ingredientChoices?.[1]).toBe('Apple');
    expect(draft.pokemon.ingredientChoices?.[30]).toBe('Honey');
    
    expect(draft.errors['ingredient_30']).toBeDefined();
    expect(draft.errors['ingredient_30']).toContain('no válido para PIKACHU');
  });

  it('should normalize whitespace, formatting, and lowercase', () => {
    const draft = VisionValidationService.validateExtraction({
      species: { value: " pIkAchU  ", confidence: 0.99 }, // mixed case, spaces
      nature: { value: "MANSA.", confidence: 0.99 }, // punctuation
      ingredients: {
        1: { value: "manzana selecta", confidence: 0.99 }, // lowercase
        30: { value: null, confidence: 0 },
        60: { value: null, confidence: 0 }
      },
      nickname: { value: null, confidence: 0 },
      level: { value: 10, confidence: 0.99 },
      mainSkill: { value: "Imán  Ingredientes   S", confidence: 0.99 }, // multiple spaces
      skillLevel: { value: 1, confidence: 0.99 },
      subskills: {
        10: { value: "Hallazgo de Ingredientes M", confidence: 0.99 },
        25: { value: null, confidence: 0 },
        50: { value: null, confidence: 0 },
        75: { value: null, confidence: 0 },
        100: { value: null, confidence: 0 }
      },
      shiny: { value: null, confidence: 0 },
      ribbon: { value: null, confidence: 0 },
      sneakySnacking: { value: null, confidence: 0 }
    });
    
    expect(draft.pokemon.speciesId).toBe('PIKACHU');
    expect(draft.pokemon.natureId).toBe('Quiet');
    expect(draft.pokemon.ingredientChoices?.[1]).toBe('Apple');
  });

  it('should resolve explicit aliases', () => {
    expect(VisionValidationService.normalizeString("Miel", "ingredient")).toBe("Honey");
    expect(VisionValidationService.normalizeString("Charge Energy", "mainSkill")).toBe("Charge Energy S");
  });

  it('should return null and generate errors for ambiguous or unknown partial matches', () => {
    // "miel" is defined as an alias, but "miel dulc" is not exact and we removed partial matches.
    const result = VisionValidationService.normalizeString("miel dulc", "ingredient");
    expect(result).toBeNull();

    // "Energy" does not strictly match "Charge Energy S", so it should return null instead of randomly picking one.
    const result2 = VisionValidationService.normalizeString("Energy", "mainSkill");
    expect(result2).toBeNull();
  });

  it('should handle null fields by skipping them in output', () => {
    const extraction: PokemonExtractionResult = {
      species: { value: "Bulbasaur", confidence: 0.99 },
      nickname: { value: null, confidence: 0 },
      level: { value: null, confidence: 0 },
      nature: { value: null, confidence: 0 },
      mainSkill: { value: null, confidence: 0 },
      skillLevel: { value: null, confidence: 0 },
      subskills: {
        10: { value: null, confidence: 0 },
        25: { value: null, confidence: 0 },
        50: { value: null, confidence: 0 },
        75: { value: null, confidence: 0 },
        100: { value: null, confidence: 0 }
      },
      ingredients: {
        1: { value: "Honey", confidence: 0.99 },
        30: { value: null, confidence: 0 },
        60: { value: null, confidence: 0 }
      },
      shiny: { value: null, confidence: 0 },
      ribbon: { value: null, confidence: 0 },
      sneakySnacking: { value: null, confidence: 0 }
    };

    const draft = VisionValidationService.validateExtraction(extraction);
    
    expect(draft.pokemon.speciesId).toBe('BULBASAUR');
    expect(draft.pokemon.level).toBeUndefined();
    expect(draft.pokemon.natureId).toBeUndefined();
    expect(draft.pokemon.subskills?.[10]).toBeNull();
    expect(draft.pokemon.ingredientChoices?.[30]).toBeNull();
  });

  it('should reject invalid values and return errors without falling back to fuzzy matching', () => {
    const extraction: PokemonExtractionResult = {
      species: { value: "Agumon", confidence: 0.99 },
      nickname: { value: null, confidence: 0 },
      level: { value: 150, confidence: 0.99 },
      nature: { value: "Inventada", confidence: 0.99 },
      mainSkill: { value: null, confidence: 0 },
      skillLevel: { value: null, confidence: 0 },
      subskills: {
        10: { value: "Buscador de Ingr", confidence: 0.99 }, // Close, but no exact match
        25: { value: null, confidence: 0 },
        50: { value: null, confidence: 0 },
        75: { value: null, confidence: 0 },
        100: { value: null, confidence: 0 }
      },
      ingredients: {
        1: { value: "Pizza", confidence: 0.99 },
        30: { value: null, confidence: 0 },
        60: { value: null, confidence: 0 }
      },
      shiny: { value: null, confidence: 0 },
      ribbon: { value: 5, confidence: 0.99 },
      sneakySnacking: { value: null, confidence: 0 }
    };

    const draft = VisionValidationService.validateExtraction(extraction);
    
    expect(draft.pokemon.speciesId).toBeUndefined();
    expect(draft.errors['species']).toBeDefined();
    expect(draft.errors['level']).toBeDefined();
    expect(draft.errors['nature']).toBeDefined();
    expect(draft.errors['subskill_10']).toBeDefined(); // Partial match rejected
    expect(draft.errors['ingredient_1']).toBeDefined();
    expect(draft.errors['ribbon']).toBeDefined();
  });

  it('resolves all canonical Spanish ingredients to their internal IDs', () => {
    const ingrMap = {
      'Miel': 'Honey',
      'Siestomate': 'Tomato',
      'Soja Verdegal': 'Soybean',
      'Manzana Selecta': 'Apple',
      'Fiambre Vegetariano': 'Sausage',
      'Huevo Selecto': 'Egg',
      'Hierba Picante': 'Herb',
      'Jengibre': 'Ginger',
      'Maíz Verdegal': 'Corn',
      'Patata': 'Potato',
      'Seta Sabrosa': 'Mushroom',
      'Cacao Relajante': 'Cacao',
      'Puerro Grueso': 'Leek',
      'Aceite Puro': 'Oil',
      'Leche Mu-mu': 'Milk',
      'Café Estimulante': 'Coffee',
      'Aguacate': 'Avocado',
      'Calabaza Suculenta': 'Pumpkin',
      'Cola de Slowpoke': 'Tail'
    };

    for (const [es, en] of Object.entries(ingrMap)) {
      expect(VisionValidationService.normalizeString(es, 'ingredient')).toBe(en);
    }
  });

  it('resolves all canonical Spanish subskills to their internal IDs', () => {
    const subskillMap = {
      'Activación S': 'Skill Chance S',
      'Activación M': 'Skill Chance M',
      'Inventario S': 'Inventory Up S',
      'Inventario M': 'Inventory Up M',
      'Inventario L': 'Inventory Up L',
      'Más ingredientes S': 'Ingredient Finder S',
      'Más ingredientes M': 'Ingredient Finder M',
      'Velocidad ayuda S': 'Helping Speed S',
      'Velocidad ayuda M': 'Helping Speed M',
      'Nivel habilidad S': 'Skill Level Up S',
      'Nivel habilidad M': 'Skill Level Up M',
      'Bonus ayuda': 'Helping Bonus',
      'Bonus EXP al dormir': 'Sleep EXP Bonus',
      'Bonus EXP de estudio': 'Research EXP Bonus',
      'Bonus fragmentos sueño': 'Dream Shard Bonus',
      'Bonus recupera energía': 'Energy Recovery Bonus',
      'Busca bayas S': 'Berry Finding S'
    };

    for (const [es, en] of Object.entries(subskillMap)) {
      expect(VisionValidationService.normalizeString(es, 'subskill')).toBe(en);
    }
  });
});

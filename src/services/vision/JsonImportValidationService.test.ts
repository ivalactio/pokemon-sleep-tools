import { describe, it, expect } from 'vitest';
import { JsonImportValidationService } from './JsonImportValidationService';

describe('JsonImportValidationService', () => {
  it('should parse and process a valid Gemini JSON extraction', () => {
    const jsonStr = JSON.stringify([{
      "archivo_origen": "charizard.jpeg",
      "especie": "Charizard",
      "nivel": 43,
      "naturaleza": "Pícara", // Naughty
      "nivel_habilidad_principal": 2,
      "subhabilidad_10": "Más ingredientes S", // Ingredient Finder S
      "subhabilidad_25": "Inventario M", // Inventory Up M
      "subhabilidad_50": "Bonus EXP al dormir", // Sleep EXP Bonus
      "subhabilidad_75": "Velocidad ayuda M", // Helping Speed M
      "subhabilidad_100": "Velocidad ayuda S", // Helping Speed S
      "ingredientes_1": {
        "ingrediente": "Fiambre Vegetariano", // Bean Sausage
        "cantidad": 2
      },
      "ingredientes_30": {
        "ingrediente": "Fiambre Vegetariano", // Bean Sausage
        "cantidad": 5
      },
      "ingredientes_60": {
        "ingrediente": "Jengibre", // Warming Ginger
        "cantidad": 7
      }
    }]);

    const parsed = JsonImportValidationService.parseJson(jsonStr);
    expect(parsed).toHaveLength(1);

    const draft = JsonImportValidationService.processExternalPokemon(parsed[0]);

    expect(draft.sourceFile).toBe('charizard.jpeg');
    expect(draft.pokemon.speciesId).toBe('CHARIZARD');
    expect(draft.pokemon.level).toBe(43);
    expect(draft.pokemon.natureId).toBe('Naughty');
    expect(draft.pokemon.subskills?.[10]).toBe('Ingredient Finder S');
    expect(draft.pokemon.ingredientChoices?.[1]).toBe('Sausage');
    expect(draft.pokemon.ingredientChoices?.[30]).toBe('Sausage');
    expect(draft.pokemon.ingredientChoices?.[60]).toBe('Ginger');

    // No errors
    expect(Object.keys(draft.errors)).toHaveLength(0);
  });

  it('should generate error for invalid ingredient amount', () => {
    const jsonStr = JSON.stringify([{
      "especie": "Charizard",
      "nivel": 43,
      "naturaleza": "Pícara",
      "ingredientes_1": {
        "ingrediente": "Fiambre Vegetariano",
        "cantidad": 3 // Invalid, should be 2
      }
    }]);

    const parsed = JsonImportValidationService.parseJson(jsonStr);
    const draft = JsonImportValidationService.processExternalPokemon(parsed[0]);

    expect(draft.errors['ingredient_1']).toBeDefined();
    expect(draft.errors['ingredient_1']).toContain('Cantidad incorrecta');
  });

  it('should handle null values correctly', () => {
    const jsonStr = JSON.stringify([{
      "especie": null,
      "nivel": null,
      "naturaleza": null,
      "subhabilidad_10": null,
      "ingredientes_1": {
        "ingrediente": null,
        "cantidad": null
      }
    }]);

    const parsed = JsonImportValidationService.parseJson(jsonStr);
    const draft = JsonImportValidationService.processExternalPokemon(parsed[0]);

    expect(draft.pokemon.speciesId).toBeUndefined();
    expect(draft.errors['species']).toBeUndefined(); // null species is a warning now
    expect(draft.pokemon.level).toBeUndefined();
    expect(draft.pokemon.natureId).toBeUndefined();
    expect(draft.pokemon.subskills?.[10]).toBeNull();
    expect(draft.pokemon.ingredientChoices?.[1]).toBeNull();
  });

  it('should support the future versioned format', () => {
    const jsonStr = JSON.stringify({
      version: 1,
      pokemon: [{
        "especie": "Pikachu",
        "nivel": 10
      }]
    });

    const parsed = JsonImportValidationService.parseJson(jsonStr);
    expect(parsed).toHaveLength(1);
    
    const draft = JsonImportValidationService.processExternalPokemon(parsed[0]);
    expect(draft.pokemon.speciesId).toBe('PIKACHU');
  });
});

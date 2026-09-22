import type { VisionProvider } from '../../domain/services/interfaces';
import type { PokemonExtractionResult } from '../../domain/vision/models';

export class MockVisionProvider implements VisionProvider {
  // Configurable for testing different scenarios
  public mockScenario: 'perfect' | 'missing' | 'invalid' = 'perfect';
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async extractPokemonFromImage(_image: Blob | File): Promise<PokemonExtractionResult> {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 500));

    if (this.mockScenario === 'perfect') {
      return {
        species: { value: "Pikachu", confidence: 0.99 }, // Intentionally Title Case to test normalization
        nickname: { value: "Sparky", confidence: 0.95 },
        level: { value: 25, confidence: 0.98 },
        nature: { value: "Mansa", confidence: 0.90 }, // Spanish for Quiet
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
          1: { value: "Apple", confidence: 0.99 },
          30: { value: "Manzana Selecta", confidence: 0.95 }, // Spanish for Apple
          60: { value: "Egg", confidence: 0.90 } // Egg (Pikachu gets apples/ginger/eggs)
        },
        shiny: { value: false, confidence: 0.99 },
        ribbon: { value: 1, confidence: 0.99 },
        sneakySnacking: { value: true, confidence: 0.99 }
      };
    } else if (this.mockScenario === 'missing') {
      return {
        species: { value: "Bulbasaur", confidence: 0.99 },
        nickname: { value: null, confidence: 0 },
        level: { value: 12, confidence: 0.95 },
        nature: { value: null, confidence: 0.4 }, // Low confidence -> null
        mainSkill: { value: "Ingredient Magnet S", confidence: 0.90 },
        skillLevel: { value: 1, confidence: 0.80 },
        subskills: {
          10: { value: "Ingredient Finder M", confidence: 0.98 },
          25: { value: null, confidence: 0.1 },
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
    } else {
      // invalid
      return {
        species: { value: "Agumon", confidence: 0.80 }, // Invalid species
        nickname: { value: "Fake", confidence: 0.95 },
        level: { value: 999, confidence: 0.98 }, // Invalid level
        nature: { value: "Inventada", confidence: 0.90 }, // Invalid nature
        mainSkill: { value: "Fireball", confidence: 0.99 },
        skillLevel: { value: 7, confidence: 0.85 },
        subskills: {
          10: { value: "Vuelo", confidence: 0.98 }, // Invalid
          25: { value: "Helping Speed M", confidence: 0.95 },
          50: { value: "Inventory Up L", confidence: 0.90 },
          75: { value: "Skill Chance S", confidence: 0.85 },
          100: { value: "Sleep EXP Bonus", confidence: 0.80 }
        },
        ingredients: {
          1: { value: "Pizza", confidence: 0.99 }, // Invalid ingredient
          30: { value: "Apple", confidence: 0.95 }, 
          60: { value: "Egg", confidence: 0.90 } 
        },
        shiny: { value: false, confidence: 0.99 },
        ribbon: { value: 5, confidence: 0.99 }, // Invalid ribbon
        sneakySnacking: { value: true, confidence: 0.99 }
      };
    }
  }
}

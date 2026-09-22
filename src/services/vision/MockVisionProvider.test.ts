import { describe, it, expect } from 'vitest';
import { MockVisionProvider } from './MockVisionProvider';
import { VisionValidationService } from './VisionValidationService';

describe('MockVisionProvider', () => {
  it('should return a valid perfect extraction', async () => {
    const provider = new MockVisionProvider();
    provider.mockScenario = 'perfect';
    
    // Pass a dummy blob
    const result = await provider.extractPokemonFromImage(new Blob(['dummy']));
    
    expect(result.species.value).toBe('Pikachu');
    expect(result.species.confidence).toBeGreaterThan(0);
    
    // Validation should pass smoothly
    const draft = VisionValidationService.validateExtraction(result);
    expect(Object.keys(draft.errors)).toHaveLength(0);
    expect(draft.pokemon.speciesId).toBe('PIKACHU');
    expect(draft.pokemon.natureId).toBe('Quiet'); // Mansa mapped to Quiet
  });

  it('should return missing fields', async () => {
    const provider = new MockVisionProvider();
    provider.mockScenario = 'missing';
    
    const result = await provider.extractPokemonFromImage(new Blob());
    
    expect(result.nickname.value).toBeNull();
    
    const draft = VisionValidationService.validateExtraction(result);
    expect(draft.pokemon.speciesId).toBe('BULBASAUR');
    expect(draft.pokemon.nickname).toBeUndefined();
    expect(draft.pokemon.natureId).toBeUndefined();
  });

  it('should return invalid fields', async () => {
    const provider = new MockVisionProvider();
    provider.mockScenario = 'invalid';
    
    const result = await provider.extractPokemonFromImage(new Blob());
    
    const draft = VisionValidationService.validateExtraction(result);
    expect(Object.keys(draft.errors).length).toBeGreaterThan(0);
    expect(draft.errors['species']).toBeDefined();
    expect(draft.errors['level']).toBeDefined();
    expect(draft.errors['nature']).toBeDefined();
    expect(draft.errors['ribbon']).toBeDefined();
  });
});

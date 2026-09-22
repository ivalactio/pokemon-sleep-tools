import { expect, test } from 'vitest';
import { CandidateFilter } from './CandidateFilter';
import type { OwnedPokemon } from '../../domain/models';
import type { TeamConstraints } from '../../domain/optimizer/core';

const makePokemon = (id: string, speciesId: string, level: number): OwnedPokemon => ({
  id,
  speciesId,
  level,
  nickname: '',
  ribbonLevel: 0,
  natureId: 'Brave',
  subskills: { 10: null, 25: null, 50: null, 75: null, 100: null },
  ingredientChoices: { 1: null, 30: null, 60: null },
  skillLevel: 1,
  shiny: false,
  notes: '',
  sneakySnacking: false,
  helpingFrequencySeen: null,
  carryLimitSeen: null,
  source: 'manual',
  createdAt: 0,
  updatedAt: 0,
  gameDataVersion: '1'
});

const collection = [
  makePokemon('mew1', 'MEWTWO', 28),
  makePokemon('mew2', 'MEWTWO', 25),
  makePokemon('mew3', 'MEWTWO', 25),
  makePokemon('pika1', 'PIKACHU', 15),
  makePokemon('pika2', 'PIKACHU', 50),
  makePokemon('char1', 'CHARIZARD', 30),
];

test('filters excluded pokemon', () => {
  const filter = new CandidateFilter();
  const constraints: TeamConstraints = {
    uniqueSpecies: false,
    requiredPokemonIds: [],
    excludedPokemonIds: ['mew2', 'pika1']
  };

  const result = filter.filter(collection, constraints);
  expect(result.length).toBe(4);
  expect(result.find(p => p.id === 'mew2')).toBeUndefined();
  expect(result.find(p => p.id === 'pika1')).toBeUndefined();
  expect(result.find(p => p.id === 'mew1')).toBeDefined();
});

test('filters below minLevel', () => {
  const filter = new CandidateFilter();
  const constraints: TeamConstraints = {
    uniqueSpecies: false,
    requiredPokemonIds: [],
    excludedPokemonIds: [],
    minLevel: 26
  };

  const result = filter.filter(collection, constraints);
  expect(result.length).toBe(3); // mew1 (28), pika2 (50), char1 (30)
  expect(result.find(p => p.id === 'mew1')).toBeDefined();
  expect(result.find(p => p.id === 'char1')).toBeDefined();
  expect(result.find(p => p.id === 'pika2')).toBeDefined();
});

test('applies minLevel to required pokemon too (validation throws earlier in service, filter must just be rigorous)', () => {
  const filter = new CandidateFilter();
  const constraints: TeamConstraints = {
    uniqueSpecies: false,
    requiredPokemonIds: ['pika1'], // Level 15
    excludedPokemonIds: [],
    minLevel: 26
  };

  const result = filter.filter(collection, constraints);
  expect(result.length).toBe(3);
  expect(result.find(p => p.id === 'pika1')).toBeUndefined();
});

test('uniqueSpecies does not discard pokemon at filter stage', () => {
  const filter = new CandidateFilter();
  const constraints: TeamConstraints = {
    uniqueSpecies: true,
    requiredPokemonIds: [],
    excludedPokemonIds: []
  };

  const result = filter.filter(collection, constraints);
  expect(result.length).toBe(6); // All 6 kept for team generation
});

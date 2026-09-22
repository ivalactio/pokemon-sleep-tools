import { expect, test } from 'vitest';
import { TeamGenerator } from './TeamGenerator';
import type { OwnedPokemon } from '../../domain/models';
import type { TeamConstraints } from '../../domain/optimizer/core';

const makePokemon = (id: string, speciesId: string): OwnedPokemon => ({
  id,
  speciesId,
  level: 30,
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

const candidates = [
  makePokemon('mew1', 'MEWTWO'),
  makePokemon('mew2', 'MEWTWO'),
  makePokemon('mew3', 'MEWTWO'),
  makePokemon('pika1', 'PIKACHU'),
  makePokemon('pika2', 'PIKACHU'),
  makePokemon('char1', 'CHARIZARD'),
  makePokemon('squirt1', 'SQUIRTLE'),
  makePokemon('bulb1', 'BULBASAUR'),
];

test('generates combinations of 5 from candidates', () => {
  const generator = new TeamGenerator();
  const constraints: TeamConstraints = {
    uniqueSpecies: false,
    requiredPokemonIds: [],
    excludedPokemonIds: []
  };

  const count = generator.countTeams(candidates, [], constraints);
  // C(8, 5) = 56
  expect(count).toBe(56);
  
  const allTeams = Array.from(generator.generateTeams(candidates, [], constraints));
  expect(allTeams.length).toBe(56);
  expect(allTeams[0].members.length).toBe(5);
});

test('respects required pokemon', () => {
  const generator = new TeamGenerator();
  const constraints: TeamConstraints = {
    uniqueSpecies: false,
    requiredPokemonIds: ['mew1', 'pika1'],
    excludedPokemonIds: []
  };

  const required = [candidates[0], candidates[3]]; // mew1, pika1
  const count = generator.countTeams(candidates, required, constraints);
  
  // 2 required, 3 free slots out of 6 remaining candidates. C(6,3) = 20
  expect(count).toBe(20);

  const allTeams = Array.from(generator.generateTeams(candidates, required, constraints));
  expect(allTeams.length).toBe(20);
  
  // Every team should have mew1 and pika1
  for (const team of allTeams) {
    const ids = team.members.map(m => m.id);
    expect(ids).toContain('mew1');
    expect(ids).toContain('pika1');
    expect(team.members.length).toBe(5);
  }
});

test('applies uniqueSpecies constraint across all 5 members', () => {
  const generator = new TeamGenerator();
  const constraints: TeamConstraints = {
    uniqueSpecies: true,
    requiredPokemonIds: [],
    excludedPokemonIds: []
  };

  // We have 8 candidates, but only 5 distinct species: MEWTWO, PIKACHU, CHARIZARD, SQUIRTLE, BULBASAUR
  // If uniqueSpecies = true, a valid team must have exactly 1 of each of these 5 distinct species.
  // We have 3 MEWTWO and 2 PIKACHU and 1 of the others.
  // Total valid teams = 3 * 2 * 1 * 1 * 1 = 6.
  
  const count = generator.countTeams(candidates, [], constraints);
  expect(count).toBe(6);

  const allTeams = Array.from(generator.generateTeams(candidates, [], constraints));
  for (const team of allTeams) {
    const species = new Set(team.members.map(m => m.speciesId));
    expect(species.size).toBe(5);
  }
});

test('applies uniqueSpecies constraint correctly when there are required pokemon', () => {
  const generator = new TeamGenerator();
  const constraints: TeamConstraints = {
    uniqueSpecies: true,
    requiredPokemonIds: ['mew1'], // required mew1
    excludedPokemonIds: []
  };

  const required = [candidates[0]]; // mew1
  const count = generator.countTeams(candidates, required, constraints);
  
  // MEWTWO is required. We must pick 4 other distinct species.
  // Distinct species remaining: PIKACHU(2), CHARIZARD(1), SQUIRTLE(1), BULBASAUR(1).
  // Total combinations: 2 * 1 * 1 * 1 = 2.
  
  expect(count).toBe(2);

  const allTeams = Array.from(generator.generateTeams(candidates, required, constraints));
  expect(allTeams.length).toBe(2);
  for (const team of allTeams) {
    const ids = team.members.map(m => m.id);
    expect(ids).toContain('mew1');
    const species = new Set(team.members.map(m => m.speciesId));
    expect(species.size).toBe(5);
  }
});

test('returns 1 team if required length is exactly 5 and satisfies constraints', () => {
  const generator = new TeamGenerator();
  const constraints: TeamConstraints = {
    uniqueSpecies: false,
    requiredPokemonIds: ['mew1', 'mew2', 'mew3', 'pika1', 'pika2'],
    excludedPokemonIds: []
  };

  const required = candidates.slice(0, 5);
  const count = generator.countTeams(candidates, required, constraints);
  expect(count).toBe(1);

  const allTeams = Array.from(generator.generateTeams(candidates, required, constraints));
  expect(allTeams[0].members.length).toBe(5);
});

test('returns 0 teams if required length is 5 but uniqueSpecies fails', () => {
  const generator = new TeamGenerator();
  const constraints: TeamConstraints = {
    uniqueSpecies: true,
    requiredPokemonIds: ['mew1', 'mew2', 'char1', 'squirt1', 'bulb1'], // 2 Mewtwo
    excludedPokemonIds: []
  };

  const required = [candidates[0], candidates[1], candidates[5], candidates[6], candidates[7]];
  const count = generator.countTeams(candidates, required, constraints);
  expect(count).toBe(0);
});

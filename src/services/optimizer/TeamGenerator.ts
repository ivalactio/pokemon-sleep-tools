import type { OwnedPokemon } from '../../domain/models';
import type { TeamConstraints, Team, TeamCompositionRule } from '../../domain/optimizer/core';

export class LegendaryCompositionRule implements TeamCompositionRule {
  isValid(team: OwnedPokemon[]): boolean {
    const speciesCount = new Map<string, number>();
    for (const member of team) {
      const count = speciesCount.get(member.speciesId) || 0;
      speciesCount.set(member.speciesId, count + 1);
      
      const legendaries = ['RAIKOU', 'ENTEI', 'SUICUNE'];
      if (legendaries.includes(member.speciesId) && count + 1 > 1) {
        return false;
      }
    }
    return true;
  }
}

export class TeamGenerator {
  private rules: TeamCompositionRule[] = [new LegendaryCompositionRule()];

  *generateTeams(
    candidates: OwnedPokemon[],
    required: OwnedPokemon[],
    constraints: TeamConstraints
  ): Generator<Team> {
    const slotsLibres = 5 - required.length;
    
    const pool = candidates.filter(c => !required.includes(c));

    if (slotsLibres <= 0) {
      if (constraints.uniqueSpecies && this.hasDuplicateSpecies(required)) {
        return;
      }
      if (!this.passesRules(required)) {
        return;
      }
      yield { members: [...required] };
      return;
    }

    yield* this.generateCombinations(pool, slotsLibres, [...required], constraints, 0);
  }

  countTeams(candidates: OwnedPokemon[], required: OwnedPokemon[], constraints: TeamConstraints): number {
    let count = 0;
    for (const _ of this.generateTeams(candidates, required, constraints)) {
      count++;
    }
    return count;
  }

  private *generateCombinations(
    pool: OwnedPokemon[],
    k: number,
    currentCombo: OwnedPokemon[],
    constraints: TeamConstraints,
    startIndex: number
  ): Generator<Team> {
    if (k === 0) {
      if (this.passesRules(currentCombo)) {
        yield { members: [...currentCombo] };
      }
      return;
    }

    for (let i = startIndex; i <= pool.length - k; i++) {
      const candidate = pool[i];

      if (constraints.uniqueSpecies) {
        if (currentCombo.some(p => p.speciesId === candidate.speciesId)) {
          continue; // Prune branch
        }
      }

      currentCombo.push(candidate);
      
      // We can also prune early for some rules, but for now we validate at k=0.
      // However, legendary uniqueness can be pruned early.
      if (this.passesRules(currentCombo)) {
        yield* this.generateCombinations(pool, k - 1, currentCombo, constraints, i + 1);
      }
      
      currentCombo.pop();
    }
  }

  private hasDuplicateSpecies(team: OwnedPokemon[]): boolean {
    const species = new Set<string>();
    for (const p of team) {
      if (species.has(p.speciesId)) return true;
      species.add(p.speciesId);
    }
    return false;
  }

  private passesRules(team: OwnedPokemon[]): boolean {
    return this.rules.every(r => r.isValid(team));
  }
}

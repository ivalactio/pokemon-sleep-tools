import type { OwnedPokemon } from '../../domain/models';
import type { TeamConstraints, Team } from '../../domain/optimizer/core';

export class TeamGenerator {
  /**
   * Genera equipos de 5 miembros de forma perezosa.
   * - candidates: lista filtrada por CandidateFilter (ya no incluye exluidos ni debajo de minLevel).
   * - required: lista de OwnedPokemon obligatorios.
   * - constraints: contiene uniqueSpecies (si true, no se permiten 2 de la misma especie en el mismo equipo).
   */
  *generateTeams(
    candidates: OwnedPokemon[],
    required: OwnedPokemon[],
    constraints: TeamConstraints
  ): Generator<Team> {
    const slotsLibres = 5 - required.length;
    
    // El pool de libres son los candidatos que no están en required.
    // requiredPokemonIds se asume que ha sido validado para no contener excluidos ni repetidos.
    const pool = candidates.filter(c => !required.includes(c));

    if (slotsLibres <= 0) {
      // Validamos uniqueSpecies sobre required, aunque validationConfig debería prevenir esto.
      if (constraints.uniqueSpecies && this.hasDuplicateSpecies(required)) {
        return;
      }
      yield { members: [...required] };
      return;
    }

    yield* this.generateCombinations(pool, slotsLibres, [...required], constraints, 0);
  }

  /**
   * Cuenta los equipos de forma exacta ejecutando un dry-run sin instanciar/modificar arrays
   * en cada yield, lo cual es ultra-rápido.
   */
  countTeams(candidates: OwnedPokemon[], required: OwnedPokemon[], constraints: TeamConstraints): number {
    let count = 0;
    // Iterar pero descartando el resultado
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
      yield { members: [...currentCombo] };
      return;
    }

    for (let i = startIndex; i <= pool.length - k; i++) {
      const candidate = pool[i];

      if (constraints.uniqueSpecies) {
        if (currentCombo.some(p => p.speciesId === candidate.speciesId)) {
          continue; // Prune branch: especie ya existente en el equipo
        }
      }

      currentCombo.push(candidate);
      yield* this.generateCombinations(pool, k - 1, currentCombo, constraints, i + 1);
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
}

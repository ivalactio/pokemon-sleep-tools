import type { CalculationEngine } from '../../../domain/services/interfaces';
import type { OwnedPokemon, ProductionEstimate, SimulationConfig, StaticDataSchema } from '../../../domain/models';
import { natureEffects } from '../../../data/static/natureEffects';

export class LocalCalculationEngine implements CalculationEngine {
  private gameData: StaticDataSchema;

  constructor(gameData: StaticDataSchema) {
    this.gameData = gameData;
  }

  async estimateProduction(pokemon: OwnedPokemon, config: SimulationConfig): Promise<ProductionEstimate> {
    // Estimación aislada asumiendo un equipo vacío (sin Helping Bonus externo)
    return this.calculateMemberProduction(pokemon, config, 0, 0);
  }

  async simulateTeam(team: OwnedPokemon[], config: SimulationConfig): Promise<ProductionEstimate[]> {
    // 1. Contar sinergias de equipo
    let totalHelpingBonus = 0;
    let totalEnergyBonus = 0; // Para Energy Recovery Bonus y habilidades de curación

    for (const p of team) {
      const activeSubskills = this.getActiveSubskills(p);
      if (activeSubskills.includes('Helping Bonus')) {
        totalHelpingBonus += 0.05;
      }
      if (activeSubskills.includes('Energy Recovery Bonus')) {
        totalEnergyBonus += 1; 
      }
    }

    // Tope de Helping Bonus (max 5 = 25%)
    if (totalHelpingBonus > 0.25) {
      totalHelpingBonus = 0.25;
    }

    // 2. Calcular producción con las sinergias aplicadas
    const estimates = team.map(p => this.calculateMemberProduction(p, config, totalHelpingBonus, totalEnergyBonus));
    return estimates;
  }

  async validateTeam(team: OwnedPokemon[]): Promise<boolean> {
    // Validaciones de composición (p.ej. únicas especies legendarias)
    const speciesCount = new Map<string, number>();
    for (const member of team) {
      const count = speciesCount.get(member.speciesId) || 0;
      speciesCount.set(member.speciesId, count + 1);
      
      // Regla especial para legendarios (Raikou, Entei, Suicune). 
      // Si existiera una flag en gamedata, la usaríamos. Usaremos una lista temporal segura.
      const legendaries = ['RAIKOU', 'ENTEI', 'SUICUNE'];
      if (legendaries.includes(member.speciesId) && count + 1 > 1) {
        return false;
      }
    }
    return true;
  }

  private calculateMemberProduction(
    pokemon: OwnedPokemon, 
    config: SimulationConfig, 
    teamHelpingBonus: number,
    teamEnergyBonus: number
  ): ProductionEstimate {
    const species = this.gameData.species.find(s => s.name === pokemon.speciesId);
    if (!species) {
      throw new Error(`Especie no encontrada: ${pokemon.speciesId}`);
    }

    const activeSubskills = this.getActiveSubskills(pokemon);
    const natureEffect = natureEffects[pokemon.natureId];

    // 1. Cálculo de Velocidad (Frecuencia)
    const baseFreq = species.frequency;
    const levelMultiplier = 1 - ((pokemon.level - 1) * 0.002);
    
    // Ribbon multiplier (approximado por nivel de ribbon)
    let ribbonMultiplier = 1;
    if (pokemon.ribbonLevel >= 3) ribbonMultiplier -= 0.11; // Good Camp / Ribbon
    // Wait, ribbon levels for fully evolved pokemon usually don't give speed, but let's ignore complex ribbon rules for v1 unless specified.
    if (pokemon.ribbonLevel === 4) ribbonMultiplier -= 0.05; 

    // Modificadores de subskills de velocidad
    let speedSubskillMod = 0;
    if (activeSubskills.includes('Helping Speed S')) speedSubskillMod += 0.07;
    if (activeSubskills.includes('Helping Speed M')) speedSubskillMod += 0.14;

    // Modificadores de Naturaleza
    let speedNatureMod = 1.0;
    if (natureEffect?.plus === 'speed') speedNatureMod = 0.9;
    if (natureEffect?.minus === 'speed') speedNatureMod = 1.1;

    // Límite de bonificación de velocidad (el límite en el juego es 35% por subskills + helping bonus combinados)
    let totalSpeedBonus = speedSubskillMod + teamHelpingBonus;
    if (totalSpeedBonus > 0.35) totalSpeedBonus = 0.35;

    // Camp Ticket
    const campBonus = config.camp ? 1.2 : 1.0; // Camp divide by 1.2

    let frequency = baseFreq * levelMultiplier * (1 - totalSpeedBonus) * speedNatureMod * ribbonMultiplier;
    frequency = frequency / campBonus;

    // 2. Cálculo de Energía y Helps por día (Aproximación)
    // Un Pokémon en 100% de energía es ~2.2x más rápido. 
    // Como aproximación estática para 24h asumiendo 100% sueño y curva promedio:
    // Un día tiene 86400 segundos. El multiplicador promedio diario de energía sin healer es ~1.5x (para un sueño de 8.5h).
    let dailyEnergyMultiplier = 1.6;
    if (natureEffect?.plus === 'energy') dailyEnergyMultiplier *= 1.05;
    if (natureEffect?.minus === 'energy') dailyEnergyMultiplier *= 0.92;
    
    // Si hay un Healer en el equipo, la energía se mantiene alta. (Aproximación simple: teamEnergyBonus da un pequeño boost).
    dailyEnergyMultiplier += (teamEnergyBonus * 0.05);

    const helpsPerDay = (86400 / frequency) * dailyEnergyMultiplier;

    // 3. Probabilidad de Ingredientes (Ingredient Fraction)
    let ingPercent = species.ingredientPercentage / 100;
    
    // Subskills
    let ingSubskillMod = 1.0;
    if (activeSubskills.includes('Ingredient Finder S')) ingSubskillMod += 0.18;
    if (activeSubskills.includes('Ingredient Finder M')) ingSubskillMod += 0.36;
    
    // Naturaleza
    let ingNatureMod = 1.0;
    if (natureEffect?.plus === 'ingredient') ingNatureMod = 1.2;
    if (natureEffect?.minus === 'ingredient') ingNatureMod = 0.8;

    let finalIngFraction = ingPercent * ingSubskillMod * ingNatureMod;
    if (finalIngFraction > 1) finalIngFraction = 1;

    const ingredientHelps = helpsPerDay * finalIngFraction;
    const berryHelps = helpsPerDay * (1 - finalIngFraction);

    // 4. Producción de Bayas
    let berriesPerHelp = species.specialty === 'berry' ? 2 : 1;
    if (activeSubskills.includes('Berry Finding S')) {
      berriesPerHelp += 1;
    }
    
    const totalBerries = berryHelps * berriesPerHelp;
    const berryName = species.berry.name;

    // 5. Producción de Ingredientes
    const ingredientsProducing: { name: string, amount: number }[] = [];
    const unlockedIngSlots = this.getUnlockedIngredientSlots(pokemon, species);
    
    // Cada vez que saca ingrediente, escoge uno de los slots desbloqueados al azar (igual probabilidad)
    const helpsPerSlot = ingredientHelps / unlockedIngSlots.length;

    for (const slot of unlockedIngSlots) {
      const existing = ingredientsProducing.find((i: any) => i.name === slot.name);
      if (existing) {
        existing.amount += slot.amount * helpsPerSlot;
      } else {
        ingredientsProducing.push({ name: slot.name, amount: slot.amount * helpsPerSlot });
      }
    }

    // 6. Probabilidad de Habilidad Principal
    let skillPercent = species.skillPercentage / 100;
    let skillSubskillMod = 1.0;
    if (activeSubskills.includes('Skill Trigger S')) skillSubskillMod += 0.18;
    if (activeSubskills.includes('Skill Trigger M')) skillSubskillMod += 0.36;
    
    let skillNatureMod = 1.0;
    if (natureEffect?.plus === 'skill') skillNatureMod = 1.2;
    if (natureEffect?.minus === 'skill') skillNatureMod = 0.8;

    const finalSkillChance = skillPercent * skillSubskillMod * skillNatureMod;
    const skillProcs = helpsPerDay * finalSkillChance;

    return {
      period: "24 horas (Aproximación local)",
      berries: [{ name: berryName, amount: totalBerries }],
      ingredients: ingredientsProducing.map((i: any) => ({ name: i.name, amount: i.amount })),
      skillProcs: skillProcs,
      configUsed: config,
      calculatedAt: Date.now()
    };
  }

  private getActiveSubskills(pokemon: OwnedPokemon): string[] {
    const active: string[] = [];
    const levels = [10, 25, 50, 75, 100];
    for (const lvl of levels) {
      if (pokemon.level >= lvl) {
        const skill = pokemon.subskills[lvl as 10|25|50|75|100];
        if (skill) active.push(skill);
      }
    }
    return active;
  }

  private getUnlockedIngredientSlots(pokemon: OwnedPokemon, species: any): { name: string, amount: number }[] {
    const slots: { name: string, amount: number }[] = [];
    
    // Nivel 1 (siempre desbloqueado)
    const choice1 = pokemon.ingredientChoices[1];
    const match1 = species.ingredient0.find((i: any) => i.ingredient.name === choice1) || species.ingredient0[0];
    slots.push({ name: match1.ingredient.name, amount: match1.amount });

    // Nivel 30
    if (pokemon.level >= 30) {
      const choice30 = pokemon.ingredientChoices[30];
      const match30 = species.ingredient30.find((i: any) => i.ingredient.name === choice30) || species.ingredient30[0];
      slots.push({ name: match30.ingredient.name, amount: match30.amount });
    }

    // Nivel 60
    if (pokemon.level >= 60) {
      const choice60 = pokemon.ingredientChoices[60];
      const match60 = species.ingredient60.find((i: any) => i.ingredient.name === choice60) || species.ingredient60[0];
      slots.push({ name: match60.ingredient.name, amount: match60.amount });
    }

    return slots;
  }
}

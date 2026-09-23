import type { CalculationEngine } from '../../../domain/services/interfaces';
import type { OwnedPokemon, ProductionEstimate, SimulationConfig, StaticDataSchema } from '../../../domain/models';
import { natureEffects } from '../../../data/static/natureEffects';
import { getSpeciesMainSkillName } from '../../i18n-game';

export class LocalCalculationEngine implements CalculationEngine {
  private gameData: StaticDataSchema;

  constructor(gameData: StaticDataSchema) {
    this.gameData = gameData;
  }

  async estimateProduction(pokemon: OwnedPokemon, config: SimulationConfig): Promise<ProductionEstimate> {
    return this.calculateMemberProduction(pokemon, config, 0, 0, 0);
  }

  async simulateTeam(team: OwnedPokemon[], config: SimulationConfig): Promise<ProductionEstimate[]> {
    let totalHelpingBonus = 0;
    let totalEnergyBonus = 0;

    for (const p of team) {
      const activeSubskills = this.getActiveSubskills(p);
      if (activeSubskills.includes('Helping Bonus')) {
        totalHelpingBonus += 0.05;
      }
      if (activeSubskills.includes('Energy Recovery Bonus')) {
        totalEnergyBonus += 1; 
      }
    }

    if (totalHelpingBonus > 0.25) {
      totalHelpingBonus = 0.25;
    }

    // Pass 1: base simulation to estimate E4E
    let estimatesPass1 = team.map(p => this.calculateMemberProduction(p, config, totalHelpingBonus, totalEnergyBonus, 0));
    
    let e4eEnergyPerDay = 0;
    for (let i = 0; i < team.length; i++) {
        const species = this.gameData.species.find(s => s.name === team[i].speciesId);
        if (getSpeciesMainSkillName(species) === 'Energy for Everyone S') {
            e4eEnergyPerDay += estimatesPass1[i].skillProcs * 15; 
        }
    }

    // Pass 2: real simulation with E4E energy
    const estimates = team.map(p => this.calculateMemberProduction(p, config, totalHelpingBonus, totalEnergyBonus, e4eEnergyPerDay));
    return estimates;
  }

  async validateTeam(team: OwnedPokemon[]): Promise<boolean> {
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

  private calculateMemberProduction(
    pokemon: OwnedPokemon, 
    config: SimulationConfig, 
    teamHelpingBonus: number,
    _teamEnergyBonus: number, // @ts-ignore
    teamE4EEnergy: number
  ): ProductionEstimate {
    const species = this.gameData.species.find(s => s.name === pokemon.speciesId);
    if (!species) {
      throw new Error(`Especie no encontrada: ${pokemon.speciesId}`);
    }

    const activeSubskills = this.getActiveSubskills(pokemon);
    const natureEffect = natureEffects[pokemon.natureId];

    // Límite de Inventario
    let carryLimit = species.carrySize;
    if (activeSubskills.includes('Inventory Up S')) carryLimit += 6;
    if (activeSubskills.includes('Inventory Up M')) carryLimit += 12;
    if (activeSubskills.includes('Inventory Up L')) carryLimit += 18;

    // 1. Cálculo de Velocidad (Frecuencia)
    const baseFreq = species.frequency;
    const levelMultiplier = 1 - ((pokemon.level - 1) * 0.002);
    
    let ribbonMultiplier = 1;
    if (pokemon.ribbonLevel >= 3) ribbonMultiplier -= 0.11;
    if (pokemon.ribbonLevel === 4) ribbonMultiplier -= 0.05; 

    let speedSubskillMod = 0;
    if (activeSubskills.includes('Helping Speed S')) speedSubskillMod += 0.07;
    if (activeSubskills.includes('Helping Speed M')) speedSubskillMod += 0.14;

    let speedNatureMod = 1.0;
    if (natureEffect?.plus === 'speed') speedNatureMod = 0.9;
    if (natureEffect?.minus === 'speed') speedNatureMod = 1.1;

    let totalSpeedBonus = speedSubskillMod + teamHelpingBonus;
    if (totalSpeedBonus > 0.35) totalSpeedBonus = 0.35;

    const campBonus = config.camp ? 1.2 : 1.0;

    let frequency = baseFreq * levelMultiplier * (1 - totalSpeedBonus) * speedNatureMod * ribbonMultiplier;
    frequency = frequency / campBonus;

    // 2. Probabilidad de Ingredientes (Ingredient Fraction)
    let ingPercent = species.ingredientPercentage / 100;
    
    let ingSubskillMod = 1.0;
    if (activeSubskills.includes('Ingredient Finder S')) ingSubskillMod += 0.18;
    if (activeSubskills.includes('Ingredient Finder M')) ingSubskillMod += 0.36;
    
    let ingNatureMod = 1.0;
    if (natureEffect?.plus === 'ingredient') ingNatureMod = 1.2;
    if (natureEffect?.minus === 'ingredient') ingNatureMod = 0.8;

    let finalIngFraction = ingPercent * ingSubskillMod * ingNatureMod;
    if (finalIngFraction > 1) finalIngFraction = 1;

    let berriesPerHelp = species.specialty === 'berry' ? 2 : 1;
    if (activeSubskills.includes('Berry Finding S')) {
      berriesPerHelp += 1;
    }
    const berryName = species.berry.name;

    // 6. Probabilidad de Habilidad Principal
    let skillPercent = species.skillPercentage / 100;
    let skillSubskillMod = 1.0;
    if (activeSubskills.includes('Skill Trigger S')) skillSubskillMod += 0.18;
    if (activeSubskills.includes('Skill Trigger M')) skillSubskillMod += 0.36;
    
    let skillNatureMod = 1.0;
    if (natureEffect?.plus === 'skill') skillNatureMod = 1.2;
    if (natureEffect?.minus === 'skill') skillNatureMod = 0.8;

    const finalSkillChance = skillPercent * skillSubskillMod * skillNatureMod;

    // Deterministic Engine (Decaimiento de energía)
    let totalHelps = 0;
    let awakeHelps = 0;
    let sleepHelps = 0;
    let skillEnergyPerDay = teamE4EEnergy;

    // Iterate up to 3 times to stabilize Charge Energy S
    for (let iter = 0; iter < 3; iter++) {
        let currentEnergy = 100; // Recarga de sueño diaria (asumimos 100)
        if (natureEffect?.plus === 'energy') currentEnergy = 100; // Actually sleep score is max 100
        
        let localAwakeHelps = 0;
        let localSleepHelps = 0;
        
        let tickSeconds = 600; // 10 minutos
        let energyPerTick = 1; // 1 punto de energía cada 10 min
        let skillEnergyPerTick = skillEnergyPerDay / 144; // Repartir inyección de energía
        
        let energyNatureMultiplier = 1.0;
        if (natureEffect?.plus === 'energy') energyNatureMultiplier = 1.2;
        if (natureEffect?.minus === 'energy') energyNatureMultiplier = 0.8;

        for (let i = 0; i < 144; i++) {
            currentEnergy -= energyPerTick;
            currentEnergy += (skillEnergyPerTick * energyNatureMultiplier);
            if (currentEnergy > 150) currentEnergy = 150;
            
            let multiplier = 1.0;
            if (currentEnergy >= 80) multiplier = 2.2;
            else if (currentEnergy >= 60) multiplier = 1.9;
            else if (currentEnergy >= 40) multiplier = 1.6;
            else if (currentEnergy >= 20) multiplier = 1.4;
            
            let speedInBracket = frequency / multiplier;
            let helpsInTick = tickSeconds / speedInBracket;
            
            // Asumimos 15.5h despierto (93 ticks), 8.5h dormido (51 ticks)
            if (i < 93) {
                localAwakeHelps += helpsInTick;
            } else {
                localSleepHelps += helpsInTick;
            }
        }
        
        totalHelps = localAwakeHelps + localSleepHelps;
        awakeHelps = localAwakeHelps;
        sleepHelps = localSleepHelps;
        
        let skillProcs = totalHelps * finalSkillChance;
        let newSkillEnergy = teamE4EEnergy;
        if (getSpeciesMainSkillName(species) === 'Charge Energy S') {
            newSkillEnergy += skillProcs * 12;
        }
        skillEnergyPerDay = newSkillEnergy;
    }

    // Límite de Inventario y Sneaky Snacking
    const unlockedIngSlots = this.getUnlockedIngredientSlots(pokemon, species);
    let avgIngsPerProc = unlockedIngSlots.reduce((sum, slot) => sum + slot.amount, 0) / unlockedIngSlots.length;
    let itemsPerHelp = (1 - finalIngFraction) * berriesPerHelp + finalIngFraction * avgIngsPerProc;
    
    let helpsToFill = carryLimit / itemsPerHelp;
    let sneakySnackingHelps = 0;
    let normalSleepHelps = sleepHelps;
    
    if (sleepHelps > helpsToFill) {
        normalSleepHelps = helpsToFill;
        sneakySnackingHelps = sleepHelps - helpsToFill;
    }
    
    let normalHelps = awakeHelps + normalSleepHelps;
    
    let ingredientHelps = normalHelps * finalIngFraction;
    let normalBerryHelps = normalHelps * (1 - finalIngFraction);
    
    let totalBerries = normalBerryHelps * berriesPerHelp + sneakySnackingHelps * berriesPerHelp;
    let skillProcs = normalHelps * finalSkillChance; // Sneaky snacking no activa habilidades

    const ingredientsProducing: { name: string, amount: number }[] = [];
    const helpsPerSlot = ingredientHelps / unlockedIngSlots.length;

    for (const slot of unlockedIngSlots) {
      const existing = ingredientsProducing.find((i: any) => i.name === slot.name);
      if (existing) {
        existing.amount += slot.amount * helpsPerSlot;
      } else {
        ingredientsProducing.push({ name: slot.name, amount: slot.amount * helpsPerSlot });
      }
    }

    return {
      period: "24 horas (Motor Determinista)",
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
    
    const choice1 = pokemon.ingredientChoices[1];
    const match1 = species.ingredient0.find((i: any) => i.ingredient.name === choice1) || species.ingredient0[0];
    slots.push({ name: match1.ingredient.name, amount: match1.amount });

    if (pokemon.level >= 30) {
      const choice30 = pokemon.ingredientChoices[30];
      const match30 = species.ingredient30.find((i: any) => i.ingredient.name === choice30) || species.ingredient30[0];
      slots.push({ name: match30.ingredient.name, amount: match30.amount });
    }

    if (pokemon.level >= 60) {
      const choice60 = pokemon.ingredientChoices[60];
      const match60 = species.ingredient60.find((i: any) => i.ingredient.name === choice60) || species.ingredient60[0];
      slots.push({ name: match60.ingredient.name, amount: match60.amount });
    }

    return slots;
  }
}

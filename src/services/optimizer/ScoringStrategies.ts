import type { TeamEvaluationContext, TeamScore } from '../../domain/optimizer/core';
import type { StaticDataSchema } from '../../domain/models';
import { getIsland } from '../../domain/optimizer/islands';

export interface ScoringStrategy {
  score(context: TeamEvaluationContext): TeamScore;
}

export class BerryScoringStrategy implements ScoringStrategy {
  private gameData: StaticDataSchema;
  
  constructor(gameData: StaticDataSchema) {
    this.gameData = gameData;
  }

  score(context: TeamEvaluationContext): TeamScore {
    let totalValue = 0;
    let favoredValue = 0;

    // Obtener las bayas favoritas de la configuración usada en la evaluación
    const firstEstimate = context.memberEstimates[0]?.estimate;
    if (!firstEstimate) {
      return { objective: 'berries', score: 0, berryDetails: { totalValue: 0, favoredValue: 0 } };
    }

    const config = firstEstimate.configUsed;
    const island = getIsland(config.island);
    const favoredBerries = config.favoriteBerries ?? island.defaultFavoriteBerries;

    for (const memberEval of context.memberEstimates) {
      for (const berryProd of memberEval.estimate.berries) {
        const berryData = this.gameData.berries.find(b => b.name === berryProd.name);
        if (berryData) {
          const isFavored = favoredBerries.includes(berryProd.name);
          // Valor base total de esta producción (sin multiplicador de isla todavía, el optimizador no asume nivel de snorlax)
          const baseValue = berryProd.amount * berryData.value;
          const finalValue = isFavored ? baseValue * 2 : baseValue;
          
          totalValue += finalValue;
          if (isFavored) {
            favoredValue += finalValue;
          }
        }
      }
    }

    // El score principal es el valor total producido en fuerza
    return {
      objective: 'berries',
      score: totalValue,
      berryDetails: { totalValue, favoredValue }
    };
  }
}

export class IngredientScoringStrategy implements ScoringStrategy {
  private gameData: StaticDataSchema;
  
  constructor(gameData: StaticDataSchema) {
    this.gameData = gameData;
  }

  score(context: TeamEvaluationContext): TeamScore {
    let totalValue = 0;

    for (const memberEval of context.memberEstimates) {
      for (const ingProd of memberEval.estimate.ingredients) {
        const ingData = this.gameData.ingredients.find(i => i.name === ingProd.name);
        if (ingData) {
          totalValue += ingProd.amount * ingData.value;
        }
      }
    }

    return {
      objective: 'ingredients',
      score: totalValue,
      ingredientDetails: { totalValue }
    };
  }
}

export class RecipeScoringStrategy implements ScoringStrategy {
  private gameData: StaticDataSchema;
  private recipeType: 'curry' | 'salad' | 'dessert';
  private targetRecipeName?: string;
  
  constructor(gameData: StaticDataSchema, recipeType: 'curry' | 'salad' | 'dessert', targetRecipeName?: string) {
    this.gameData = gameData;
    this.recipeType = recipeType;
    this.targetRecipeName = targetRecipeName;
  }

  score(context: TeamEvaluationContext): TeamScore {
    let recipesToEvaluate = this.gameData.recipes.filter(r => r.type === this.recipeType);
    
    if (this.targetRecipeName) {
      const specific = recipesToEvaluate.find(r => r.name === this.targetRecipeName);
      if (specific) {
        recipesToEvaluate = [specific];
      } else {
        // Fallback in case target recipe is not in this type
        recipesToEvaluate = [];
      }
    }

    if (recipesToEvaluate.length === 0) {
      return { objective: 'recipe', score: 0 };
    }

    // Agregar la producción de ingredientes de todo el equipo
    const totalIngredientsProduced = new Map<string, number>();
    for (const memberEval of context.memberEstimates) {
      for (const ingProd of memberEval.estimate.ingredients) {
        const current = totalIngredientsProduced.get(ingProd.name) || 0;
        totalIngredientsProduced.set(ingProd.name, current + ingProd.amount);
      }
    }

    let bestScore: TeamScore = { objective: 'recipe', score: 0 };

    for (const recipe of recipesToEvaluate) {
      let minCoverage = Infinity;
      const ingredientsMissing: string[] = [];
      let totalIngredientValue = 0;

      for (const req of recipe.ingredients) {
        const produced = totalIngredientsProduced.get(req.ingredient.name) || 0;
        
        const ingData = this.gameData.ingredients.find(i => i.name === req.ingredient.name);
        if (ingData) {
          totalIngredientValue += produced * ingData.value;
        }

        const coverageRatio = produced / req.amount;
        if (coverageRatio < minCoverage) {
          minCoverage = coverageRatio;
        }

        if (produced < req.amount) {
          ingredientsMissing.push(req.ingredient.name);
        }
      }

      if (recipe.ingredients.length === 0) {
        minCoverage = 0;
      }

      const coveragePercent = Math.min(minCoverage * 100, 999);
      const estimatedServings = minCoverage;
      
      const scoreValue = estimatedServings * recipe.value;

      if (scoreValue > bestScore.score || bestScore.score === 0) {
        bestScore = {
          objective: 'recipe',
          score: scoreValue,
          recipeDetails: {
            recipeName: recipe.name,
            coveragePercent,
            ingredientsMissing,
            estimatedServings,
            totalIngredientValue
          }
        };
      }
    }

    return bestScore;
  }
}

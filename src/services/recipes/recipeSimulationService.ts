export interface MealSimulationResult {
  matrix: { day: string; meals: { type: string; status: 'OK' | 'WARN' | 'FAIL'; missing: string[] }[] }[];
  totalMealsCooked: number;
  weeklyCoveragePercent: number;
  productionRatioPercent: number;
  balance: { name: string; required7d: number; produced7d: number; balance: number }[];
}

export function simulate21Meals(
  recipe: { ingredients: { amount: number; ingredient: { name: string } }[] },
  teamIngredients: Map<string, number>
): MealSimulationResult {
  const days = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
  const mealTypes = ['Desayuno', 'Comida', 'Cena'];
  
  const dailyProd: Record<string, number> = {};
  for (const [ingName, amount] of teamIngredients.entries()) {
    dailyProd[ingName] = amount;
  }

  const currentInv: Record<string, number> = {};
  for (const req of recipe.ingredients) {
    currentInv[req.ingredient.name] = 0;
  }

  let totalMealsCooked = 0;
  const matrix: { day: string; meals: { type: string; status: 'OK' | 'WARN' | 'FAIL'; missing: string[] }[] }[] = [];

  for (const day of days) {
    const dayMeals: { type: string; status: 'OK' | 'WARN' | 'FAIL'; missing: string[] }[] = [];
    
    for (const mealType of mealTypes) {
      // 1/3 of daily production arrives by mealtime
      for (const req of recipe.ingredients) {
        const name = req.ingredient.name;
        currentInv[name] = (currentInv[name] || 0) + (dailyProd[name] || 0) / 3;
      }

      let canCook = true;
      const missing: string[] = [];
      for (const req of recipe.ingredients) {
        const name = req.ingredient.name;
        if ((currentInv[name] || 0) < req.amount) {
          canCook = false;
          missing.push(name);
        }
      }

      if (canCook) {
        totalMealsCooked++;
        let lowMargin = false;
        for (const req of recipe.ingredients) {
          const name = req.ingredient.name;
          currentInv[name] -= req.amount;
          if (currentInv[name] < req.amount) {
            lowMargin = true;
          }
        }
        dayMeals.push({ type: mealType, status: lowMargin ? 'WARN' : 'OK', missing: [] });
      } else {
        dayMeals.push({ type: mealType, status: 'FAIL', missing });
      }
    }
    matrix.push({ day, meals: dayMeals });
  }

  const balance = recipe.ingredients.map(req => {
    const name = req.ingredient.name;
    const required7d = req.amount * 21;
    const produced7d = (dailyProd[name] || 0) * 7;
    return {
      name,
      required7d,
      produced7d,
      balance: Math.round((produced7d - required7d) * 10) / 10
    };
  });

  // Calculate real weekly meal coverage (0 to 100%)
  const weeklyCoveragePercent = Math.min(100, (totalMealsCooked / 21) * 100);

  // Calculate daily production ratio (e.g., 215%)
  let minRatio = Infinity;
  for (const req of recipe.ingredients) {
    const produced = dailyProd[req.ingredient.name] || 0;
    const ratio = produced / req.amount;
    if (ratio < minRatio) minRatio = ratio;
  }
  if (recipe.ingredients.length === 0) minRatio = 0;
  const productionRatioPercent = Math.round(minRatio * 100);

  return {
    matrix,
    totalMealsCooked,
    weeklyCoveragePercent,
    productionRatioPercent,
    balance
  };
}

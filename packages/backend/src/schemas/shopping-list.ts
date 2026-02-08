import type { CooklangIngredient } from "../parser/types.js";

export interface RecipeIngredients {
	recipeName: string;
	ingredients: CooklangIngredient[];
}

export interface AggregatedEntry {
	amount: string;
	unit: string;
	preparation: string;
	recipeName: string;
}

export interface AggregatedIngredient {
	name: string;
	entries: AggregatedEntry[];
}

export function aggregateIngredients(
	recipes: RecipeIngredients[],
): AggregatedIngredient[] {
	const grouped = new Map<string, AggregatedIngredient>();

	for (const recipe of recipes) {
		for (const ingredient of recipe.ingredients) {
			const key = ingredient.name.toLowerCase();
			const existing = grouped.get(key);

			if (existing) {
				existing.entries.push({
					amount: ingredient.amount,
					unit: ingredient.unit,
					preparation: ingredient.preparation,
					recipeName: recipe.recipeName,
				});
			} else {
				grouped.set(key, {
					name: ingredient.name,
					entries: [
						{
							amount: ingredient.amount,
							unit: ingredient.unit,
							preparation: ingredient.preparation,
							recipeName: recipe.recipeName,
						},
					],
				});
			}
		}
	}

	return [...grouped.values()].sort((a, b) =>
		a.name.localeCompare(b.name, "de"),
	);
}

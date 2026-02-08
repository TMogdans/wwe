import { z } from "zod";
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

export const synonymsSchema = z.array(z.array(z.string().min(1)).min(2));

export type SynonymMap = Map<string, string>;

export function buildSynonymMap(groups: string[][]): SynonymMap {
	const map: SynonymMap = new Map();
	for (const group of groups) {
		const canonical = group[0];
		for (const variant of group) {
			map.set(variant.toLowerCase(), canonical);
		}
	}
	return map;
}

export function aggregateIngredients(
	recipes: RecipeIngredients[],
	synonyms?: SynonymMap,
): AggregatedIngredient[] {
	const grouped = new Map<string, AggregatedIngredient>();

	for (const recipe of recipes) {
		for (const ingredient of recipe.ingredients) {
			const lowerName = ingredient.name.toLowerCase();
			const canonicalName = synonyms?.get(lowerName) ?? ingredient.name;
			const key = canonicalName.toLowerCase();
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
					name: canonicalName,
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

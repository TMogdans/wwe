import type { DatabaseSync } from "node:sqlite";
import type { CooklangIngredient } from "../parser/types.js";
import { type NutrientValue, getFood, getNutrients } from "./bls.js";

export interface IngredientMapping {
	code: string;
	gramsPer?: Record<string, number>;
}

export type MappingConfig = Record<string, IngredientMapping>;

export interface NutrientConfig {
	nutrients: string[];
}

export interface IngredientNutritionInfo {
	name: string;
	amount: string;
	unit: string;
	grams: number | null;
	blsCode: string | null;
	blsName: string | null;
	matched: boolean;
}

export interface NutritionResult {
	servings: number;
	perServing: NutrientValue[];
	total: NutrientValue[];
	ingredients: IngredientNutritionInfo[];
	coverage: number;
}

const DEFAULT_UNIT_GRAMS: Record<string, number> = {
	g: 1,
	kg: 1000,
	ml: 1,
	l: 1000,
	el: 15,
	tl: 5,
	prise: 0.5,
	priese: 0.5,
	tasse: 250,
	dose: 400,
	dosen: 400,
};

export function convertToGrams(
	amount: string,
	unit: string,
	ingredientMapping?: IngredientMapping,
): number | null {
	const numericAmount = parseAmount(amount);
	if (numericAmount === null || numericAmount === 0) return null;

	const unitLower = unit.toLowerCase();

	// Check ingredient-specific unit conversion first
	if (ingredientMapping?.gramsPer?.[unit]) {
		return numericAmount * ingredientMapping.gramsPer[unit];
	}

	// Fall back to default unit conversions
	const gramsPerUnit = DEFAULT_UNIT_GRAMS[unitLower];
	if (gramsPerUnit !== undefined) {
		return numericAmount * gramsPerUnit;
	}

	// Unknown unit and no mapping
	return null;
}

function parseAmount(amount: string): number | null {
	const trimmed = amount.trim();
	if (!trimmed) return null;

	// Handle fractions like "1/2"
	const fractionMatch = trimmed.match(/^(\d+)\/(\d+)$/);
	if (fractionMatch) {
		return Number(fractionMatch[1]) / Number(fractionMatch[2]);
	}

	// Handle mixed numbers like "1 1/2"
	const mixedMatch = trimmed.match(/^(\d+)\s+(\d+)\/(\d+)$/);
	if (mixedMatch) {
		return (
			Number(mixedMatch[1]) + Number(mixedMatch[2]) / Number(mixedMatch[3])
		);
	}

	const num = Number(trimmed.replace(",", "."));
	return Number.isNaN(num) ? null : num;
}

export function calculateRecipeNutrition(
	ingredients: CooklangIngredient[],
	mapping: MappingConfig,
	db: DatabaseSync,
	config: NutrientConfig,
	servings: number,
): NutritionResult {
	const nutrientCodes = config.nutrients;
	const totals = new Map<string, NutrientValue>();
	const ingredientInfos: IngredientNutritionInfo[] = [];
	let matchedCount = 0;

	for (const ingredient of ingredients) {
		const ingredientMapping = findMapping(ingredient.name, mapping);
		const grams = ingredientMapping
			? convertToGrams(ingredient.amount, ingredient.unit, ingredientMapping)
			: null;

		const blsCode = ingredientMapping?.code ?? null;
		let blsName: string | null = null;
		let matched = false;

		if (blsCode && grams !== null) {
			const food = getFood(db, blsCode);
			blsName = food?.name_de ?? null;

			const nutrients = getNutrients(db, blsCode, nutrientCodes);
			const factor = grams / 100; // BLS values are per 100g

			for (const nutrient of nutrients) {
				const existing = totals.get(nutrient.code);
				const scaledValue = nutrient.value * factor;
				if (existing) {
					existing.value += scaledValue;
				} else {
					totals.set(nutrient.code, {
						code: nutrient.code,
						name: nutrient.name,
						value: scaledValue,
						unit: nutrient.unit,
					});
				}
			}
			matched = true;
			matchedCount++;
		}

		ingredientInfos.push({
			name: ingredient.name,
			amount: ingredient.amount,
			unit: ingredient.unit,
			grams,
			blsCode,
			blsName,
			matched,
		});
	}

	// Build total array in config order
	const totalArray = nutrientCodes
		.map((code) => totals.get(code))
		.filter((v): v is NutrientValue => v !== undefined);

	// Calculate per-serving values
	const perServingArray = totalArray.map((v) => ({
		...v,
		value: Math.round((v.value / servings) * 10) / 10,
	}));

	// Round total values
	for (const v of totalArray) {
		v.value = Math.round(v.value * 10) / 10;
	}

	const coverage =
		ingredients.length > 0 ? matchedCount / ingredients.length : 0;

	return {
		servings,
		perServing: perServingArray,
		total: totalArray,
		ingredients: ingredientInfos,
		coverage: Math.round(coverage * 100) / 100,
	};
}

function findMapping(
	ingredientName: string,
	mapping: MappingConfig,
): IngredientMapping | null {
	// Exact match first
	if (mapping[ingredientName]) return mapping[ingredientName];

	// Case-insensitive match
	const lowerName = ingredientName.toLowerCase();
	for (const [key, value] of Object.entries(mapping)) {
		if (key.toLowerCase() === lowerName) return value;
	}

	return null;
}

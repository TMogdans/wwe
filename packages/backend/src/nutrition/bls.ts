import { DatabaseSync } from "node:sqlite";
import { distance } from "fastest-levenshtein";
import type { SynonymMap } from "../schemas/shopping-list.js";

export interface NutrientValue {
	code: string;
	name: string;
	value: number;
	unit: string;
}

export interface BlsFood {
	code: string;
	name_de: string;
	name_en: string | null;
}

let cachedDb: DatabaseSync | null = null;

export function openDatabase(dbPath: string): DatabaseSync {
	if (cachedDb) return cachedDb;
	cachedDb = new DatabaseSync(dbPath, { readOnly: true });
	return cachedDb;
}

export function closeDatabase(): void {
	if (cachedDb) {
		cachedDb.close();
		cachedDb = null;
	}
}

export function getNutrients(
	db: DatabaseSync,
	blsCode: string,
	nutrientCodes: string[],
): NutrientValue[] {
	if (nutrientCodes.length === 0) return [];

	const placeholders = nutrientCodes.map(() => "?").join(",");
	const stmt = db.prepare(`
		SELECT nv.nutrient_code, nd.name_de, nv.value, nd.unit
		FROM nutrient_values nv
		JOIN nutrient_definitions nd ON nv.nutrient_code = nd.code
		WHERE nv.food_code = ? AND nv.nutrient_code IN (${placeholders})
	`);

	const rows = stmt.all(blsCode, ...nutrientCodes) as Array<{
		nutrient_code: string;
		name_de: string;
		value: number;
		unit: string;
	}>;

	return rows.map((row) => ({
		code: row.nutrient_code,
		name: row.name_de,
		value: row.value,
		unit: row.unit,
	}));
}

export function getFood(db: DatabaseSync, blsCode: string): BlsFood | null {
	const stmt = db.prepare(
		"SELECT code, name_de, name_en FROM foods WHERE code = ?",
	);
	const row = stmt.get(blsCode) as
		| {
				code: string;
				name_de: string;
				name_en: string | null;
		  }
		| undefined;
	return row ?? null;
}

export function searchFoods(
	db: DatabaseSync,
	query: string,
	limit = 20,
): BlsFood[] {
	const stmt = db.prepare(
		"SELECT code, name_de, name_en FROM foods WHERE name_de LIKE ? LIMIT ?",
	);
	return stmt.all(`%${query}%`, limit) as BlsFood[];
}

export function suggestBlsFoods(
	db: DatabaseSync,
	ingredientName: string,
	synonymMap?: SynonymMap,
	limit = 5,
): BlsFood[] {
	const lowerName = ingredientName.toLowerCase();
	const canonical = synonymMap?.get(lowerName) ?? ingredientName;

	// Fetch all foods
	const stmt = db.prepare("SELECT code, name_de, name_en FROM foods");
	const allFoods = stmt.all() as BlsFood[];

	// Calculate distances
	const scored = allFoods.map((food) => {
		const foodLower = food.name_de.toLowerCase();

		// Distance to original name
		let distOriginal = distance(lowerName, foodLower);

		// Distance to canonical name if synonym exists
		let distCanonical =
			canonical !== ingredientName
				? distance(canonical.toLowerCase(), foodLower)
				: Number.POSITIVE_INFINITY;

		// Bonus for substring matches: if ingredient is a substring of food name,
		// treat it as a very close match by reducing distance significantly
		if (foodLower.includes(lowerName)) {
			distOriginal = Math.min(distOriginal, lowerName.length * 0.1);
		}
		if (
			canonical !== ingredientName &&
			foodLower.includes(canonical.toLowerCase())
		) {
			distCanonical = Math.min(distCanonical, canonical.length * 0.1);
		}

		// Use better distance
		const bestDist = Math.min(distOriginal, distCanonical);

		return { food, distance: bestDist };
	});

	// Sort by distance (best matches first)
	scored.sort((a, b) => a.distance - b.distance);

	// Filter: keep only foods with at least 50% common characters
	// The substring bonus ensures good matches have low distance,
	// so we can use a stricter threshold
	const maxDistance = Math.max(lowerName.length, canonical.length);
	const filtered = scored.filter((s) => s.distance <= maxDistance * 0.5);

	// Take top N
	return filtered.slice(0, limit).map((s) => s.food);
}

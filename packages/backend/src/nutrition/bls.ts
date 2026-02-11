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

// Substring match bonus factor: reduces distance by 90% when ingredient is contained in food name
// This ensures substring matches rank higher than similar-length unrelated words
const SUBSTRING_MATCH_BONUS = 0.1;

// Penalty keywords: words that indicate processed/complex products
// These products should rank lower than basic ingredients
const PENALTY_KEYWORDS = [
	"pulver", // Milchpulver, Kakaopulver
	"getränk", // Milchmischgetränk
	"drink", // alternative to getränk
	"backteig", // Milchbackteig
	"teig", // general baked goods
	"dessert", // desserts
	"eis", // ice cream
	"reis", // milk rice, apple rice
	"küchlein", // small cakes
	"gesüßt", // sweetened products
	"süß", // sweet variants
	"aromatisiert", // flavored
	"zubereitung", // preparations
	"fermentiert", // fermented
	"gebraten", // fried
	"frittiert", // deep-fried
	"angereichert", // enriched
];

/**
 * Calculate penalties for a BLS food name based on keywords and complexity
 * @param foodName - The name of the BLS food entry
 * @returns Object with keyword and complexity penalty factors (1.0 = no penalty)
 */
function calculatePenalties(foodName: string): {
	keyword: number;
	complexity: number;
} {
	const lower = foodName.toLowerCase();

	// Keyword penalty: 2.0x if food contains processed/complex keywords
	const hasKeyword = PENALTY_KEYWORDS.some((kw) => lower.includes(kw));
	const keywordPenalty = hasKeyword ? 2.0 : 1.0;

	// Complexity penalty: more words = more processed/specific
	// Split on spaces, commas, slashes
	const wordCount = foodName
		.split(/[\s,/]+/)
		.filter((w) => w.length > 0).length;

	// No penalty for 1-2 words, +15% per additional word
	const complexityPenalty = wordCount > 2 ? 1.0 + (wordCount - 2) * 0.15 : 1.0;

	return { keyword: keywordPenalty, complexity: complexityPenalty };
}

export function suggestBlsFoods(
	db: DatabaseSync,
	ingredientName: string,
	synonymMap?: SynonymMap,
	limit = 5,
): BlsFood[] {
	const lowerName = ingredientName.toLowerCase();
	const canonical = synonymMap?.get(lowerName) ?? ingredientName;

	// Require at least 2 characters for meaningful fuzzy matching
	if (lowerName.length < 2 && canonical.length < 2) {
		return [];
	}

	// Pre-filter: Get candidates using SQL LIKE to reduce search space
	// Use first 3 characters (or all if shorter) to find potential matches
	const searchTerm =
		canonical.length >= 3 ? canonical.substring(0, 3) : canonical;

	const stmt = db.prepare(
		"SELECT code, name_de, name_en FROM foods WHERE LOWER(name_de) LIKE ? LIMIT 500",
	);
	let candidates = stmt.all(`%${searchTerm}%`) as BlsFood[];

	// If no candidates found and we used synonym, try with original name
	if (candidates.length === 0 && canonical !== ingredientName) {
		const altTerm =
			ingredientName.length >= 3
				? ingredientName.substring(0, 3)
				: ingredientName;
		candidates = stmt.all(`%${altTerm}%`) as BlsFood[];
	}

	// Calculate distances on the filtered candidate set
	const scored = candidates.map((food) => {
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
			distOriginal = Math.min(
				distOriginal,
				lowerName.length * SUBSTRING_MATCH_BONUS,
			);
		}
		if (
			canonical !== ingredientName &&
			foodLower.includes(canonical.toLowerCase())
		) {
			distCanonical = Math.min(
				distCanonical,
				canonical.length * SUBSTRING_MATCH_BONUS,
			);
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

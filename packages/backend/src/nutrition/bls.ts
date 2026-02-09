import { DatabaseSync } from "node:sqlite";

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

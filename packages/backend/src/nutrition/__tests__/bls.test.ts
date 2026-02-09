import { DatabaseSync } from "node:sqlite";
import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { buildSynonymMap } from "../../schemas/shopping-list.js";
import { suggestBlsFoods } from "../bls.js";

let db: DatabaseSync;

beforeAll(() => {
	db = new DatabaseSync(":memory:");
	db.exec(`
		CREATE TABLE foods (
			code TEXT PRIMARY KEY,
			name_de TEXT NOT NULL,
			name_en TEXT
		);
		INSERT INTO foods VALUES
			('G480100', 'Paprikaschote, rot, roh', 'Red bell pepper, raw'),
			('G480200', 'Paprikaschote, gelb, roh', 'Yellow bell pepper, raw'),
			('G480300', 'Paprikaschote, grün, roh', 'Green bell pepper, raw'),
			('M010100', 'Sahne, 30% Fett', 'Cream, 30% fat'),
			('U010100', 'Rinderhackfleisch', 'Ground beef');
	`);
});

afterAll(() => {
	db.close();
});

describe("suggestBlsFoods", () => {
	test("finds similar foods by name", () => {
		const results = suggestBlsFoods(db, "Paprika", undefined, 3);

		expect(results).toHaveLength(3);
		expect(results[0].name_de).toContain("Paprikaschote");
	});

	test("ranks closer matches higher", () => {
		const results = suggestBlsFoods(db, "Paprikaschote", undefined, 3);

		expect(results[0].name_de).toBe("Paprikaschote, rot, roh");
	});

	test("respects limit parameter", () => {
		const results = suggestBlsFoods(db, "Paprika", undefined, 2);

		expect(results).toHaveLength(2);
	});

	test("uses synonym for matching", () => {
		const synonymMap = buildSynonymMap([["Sahne", "Schlagsahne"]]);
		const results = suggestBlsFoods(db, "Schlagsahne", synonymMap, 3);

		expect(results[0].name_de).toContain("Sahne");
	});

	test("returns empty array when no matches found", () => {
		const results = suggestBlsFoods(db, "xyz123abc", undefined, 3);

		expect(results).toEqual([]);
	});
});

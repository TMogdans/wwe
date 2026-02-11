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
			('U010100', 'Rinderhackfleisch', 'Ground beef'),
			('M020200', 'Milchpulver', 'Milk powder'),
			('M020300', 'Milchmischgetränk', 'Milk mixed drink'),
			('M020100', 'Vollmilch frisch', 'Whole milk fresh');
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

	test("returns empty array for queries shorter than 2 characters", () => {
		const results = suggestBlsFoods(db, "x", undefined, 3);

		expect(results).toEqual([]);
	});

	test("prefers basic ingredients over processed foods", () => {
		const suggestions = suggestBlsFoods(db, "Milch", undefined, 10);

		expect(suggestions.length).toBeGreaterThan(0);

		// Business requirement: Basic, minimally processed ingredients (e.g., "Vollmilch frisch")
		// should rank higher than heavily processed alternatives (e.g., milk powder, milk drinks)
		// to encourage healthier food choices in meal planning
		const basicMilkIndex = suggestions.findIndex((food) => {
			const lower = food.name_de.toLowerCase();
			return lower.includes("vollmilch") && lower.includes("frisch");
		});
		const milkPowderIndex = suggestions.findIndex((food) =>
			food.name_de.toLowerCase().includes("milchpulver"),
		);
		const milkDrinkIndex = suggestions.findIndex((food) =>
			food.name_de.toLowerCase().includes("milchmischgetränk"),
		);

		// Basic milk should appear, and if processed products appear, they should rank lower
		expect(basicMilkIndex).toBeGreaterThanOrEqual(0);
		expect(suggestions[basicMilkIndex].name_de).toBe("Vollmilch frisch");

		if (milkPowderIndex >= 0) {
			expect(basicMilkIndex).toBeLessThan(milkPowderIndex);
		}

		if (milkDrinkIndex >= 0) {
			expect(basicMilkIndex).toBeLessThan(milkDrinkIndex);
		}
	});
});

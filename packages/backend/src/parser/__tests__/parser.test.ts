import { describe, expect, it } from "vitest";
import { parseRecipe } from "../parser.js";

describe("parseRecipe", () => {
	it("parses metadata lines", () => {
		const input = `>> time required: 30 Minuten
>> course: dinner
>> servings: 2`;
		const recipe = parseRecipe(input);
		expect(recipe.metadata).toEqual({
			"time required": "30 Minuten",
			course: "dinner",
			servings: "2",
		});
		expect(recipe.steps).toEqual([]);
	});

	it("normalizes metadata keys to lowercase", () => {
		const input = ">> Servings: 4";
		const recipe = parseRecipe(input);
		expect(recipe.metadata).toEqual({ servings: "4" });
	});

	it("parses steps separated by blank lines", () => {
		const input = `>> servings: 2

Ersten Schritt machen.

Zweiten Schritt machen.`;
		const recipe = parseRecipe(input);
		expect(recipe.steps).toHaveLength(2);
	});

	it("treats each non-empty line as its own step", () => {
		const input = `>> servings: 2

Zeile eins.
Zeile zwei.

Neuer Schritt.`;
		const recipe = parseRecipe(input);
		expect(recipe.steps).toHaveLength(3);
	});

	it("parses a real recipe file", () => {
		const input = `>> time required: 10 Minuten
>> servings: 4

@Butter, weich{250%g} aus dem Kuehlschrank nehmen.

Den @Knoblauch{3%Zehen} schaelen und reiben.`;
		const recipe = parseRecipe(input);
		expect(recipe.metadata["time required"]).toBe("10 Minuten");
		expect(recipe.steps).toHaveLength(2);
		expect(
			recipe.steps[0].tokens.find((t) => t.type === "ingredient"),
		).toMatchObject({
			name: "Butter, weich",
			amount: "250",
			unit: "g",
		});
	});
});

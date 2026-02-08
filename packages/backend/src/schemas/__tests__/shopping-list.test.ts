import { describe, expect, it } from "vitest";
import { aggregateIngredients } from "../shopping-list.js";

describe("aggregateIngredients", () => {
	it("groups identical ingredients by name", () => {
		const input = [
			{
				recipeName: "Chili",
				ingredients: [
					{
						type: "ingredient" as const,
						name: "Knoblauch",
						amount: "2",
						unit: "Zehen",
						preparation: "",
					},
				],
			},
			{
				recipeName: "Gyoza",
				ingredients: [
					{
						type: "ingredient" as const,
						name: "Knoblauch",
						amount: "2",
						unit: "",
						preparation: "",
					},
				],
			},
		];
		const result = aggregateIngredients(input);
		const knoblauch = result.find((r) => r.name === "Knoblauch");
		expect(knoblauch).toBeDefined();
		expect(knoblauch?.entries).toHaveLength(2);
		expect(knoblauch?.entries[0].recipeName).toBe("Chili");
		expect(knoblauch?.entries[1].recipeName).toBe("Gyoza");
	});

	it("lists unique ingredients separately", () => {
		const input = [
			{
				recipeName: "Chili",
				ingredients: [
					{
						type: "ingredient" as const,
						name: "Hackfleisch",
						amount: "500",
						unit: "g",
						preparation: "",
					},
					{
						type: "ingredient" as const,
						name: "Knoblauch",
						amount: "2",
						unit: "Zehen",
						preparation: "",
					},
				],
			},
		];
		const result = aggregateIngredients(input);
		expect(result).toHaveLength(2);
	});

	it("groups case-insensitively", () => {
		const input = [
			{
				recipeName: "A",
				ingredients: [
					{
						type: "ingredient" as const,
						name: "salz",
						amount: "",
						unit: "",
						preparation: "",
					},
				],
			},
			{
				recipeName: "B",
				ingredients: [
					{
						type: "ingredient" as const,
						name: "Salz",
						amount: "",
						unit: "",
						preparation: "",
					},
				],
			},
		];
		const result = aggregateIngredients(input);
		expect(result).toHaveLength(1);
		expect(result[0].entries).toHaveLength(2);
	});

	it("sorts results alphabetically by ingredient name", () => {
		const input = [
			{
				recipeName: "Test",
				ingredients: [
					{
						type: "ingredient" as const,
						name: "Zwiebel",
						amount: "1",
						unit: "Stück",
						preparation: "",
					},
					{
						type: "ingredient" as const,
						name: "Butter",
						amount: "100",
						unit: "g",
						preparation: "",
					},
					{
						type: "ingredient" as const,
						name: "Mehl",
						amount: "250",
						unit: "g",
						preparation: "",
					},
				],
			},
		];
		const result = aggregateIngredients(input);
		expect(result[0].name).toBe("Butter");
		expect(result[1].name).toBe("Mehl");
		expect(result[2].name).toBe("Zwiebel");
	});

	it("preserves preparation in aggregated entries", () => {
		const input = [
			{
				recipeName: "Chili",
				ingredients: [
					{
						type: "ingredient" as const,
						name: "Zwiebel",
						amount: "1",
						unit: "Stück",
						preparation: "fein gewürfelt",
					},
				],
			},
		];
		const result = aggregateIngredients(input);
		expect(result[0].entries[0].preparation).toBe("fein gewürfelt");
	});

	it("returns empty array for empty input", () => {
		const result = aggregateIngredients([]);
		expect(result).toEqual([]);
	});
});

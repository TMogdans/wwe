import { describe, expect, it } from "vitest";
import { parseRecipe } from "../parser.js";
import { serializeRecipe } from "../serializer.js";

describe("serializeRecipe", () => {
	it("serializes metadata", () => {
		const recipe = {
			metadata: { "time required": "30 Minuten", servings: "2" },
			steps: [],
		};
		const output = serializeRecipe(recipe);
		expect(output).toContain(">> time required: 30 Minuten");
		expect(output).toContain(">> servings: 2");
	});

	it("serializes ingredients back to cooklang format", () => {
		const recipe = {
			metadata: {},
			steps: [
				{
					tokens: [
						{
							type: "ingredient" as const,
							name: "Hackfleisch",
							amount: "500",
							unit: "g",
						},
						{ type: "text" as const, value: " anbraten." },
					],
				},
			],
		};
		const output = serializeRecipe(recipe);
		expect(output).toContain("@Hackfleisch{500%g} anbraten.");
	});

	it("serializes ingredient without amount", () => {
		const recipe = {
			metadata: {},
			steps: [
				{
					tokens: [
						{ type: "ingredient" as const, name: "Salz", amount: "", unit: "" },
					],
				},
			],
		};
		const output = serializeRecipe(recipe);
		expect(output).toContain("@Salz");
		expect(output).not.toContain("{");
	});

	it("serializes equipment with spaces using braces", () => {
		const recipe = {
			metadata: {},
			steps: [
				{
					tokens: [{ type: "equipment" as const, name: "großen Schüssel" }],
				},
			],
		};
		const output = serializeRecipe(recipe);
		expect(output).toContain("#großen Schüssel{}");
	});

	it("serializes timer with name", () => {
		const recipe = {
			metadata: {},
			steps: [
				{
					tokens: [
						{
							type: "timer" as const,
							name: "braten",
							duration: "4",
							unit: "Minuten",
						},
					],
				},
			],
		};
		const output = serializeRecipe(recipe);
		expect(output).toContain("~braten{4%Minuten}");
	});

	it("serializes timer without name", () => {
		const recipe = {
			metadata: {},
			steps: [
				{
					tokens: [
						{
							type: "timer" as const,
							name: "",
							duration: "10",
							unit: "Minuten",
						},
					],
				},
			],
		};
		const output = serializeRecipe(recipe);
		expect(output).toContain("~{10%Minuten}");
	});

	it("roundtrips a parsed recipe", () => {
		const input = `>> time required: 30 Minuten
>> servings: 2

@Öl{2%EL} in einem #Topf erhitzen.

@Hackfleisch{500%g} anbraten.`;
		const parsed = parseRecipe(input);
		const output = serializeRecipe(parsed);
		const reparsed = parseRecipe(output);
		expect(reparsed.metadata).toEqual(parsed.metadata);
		expect(reparsed.steps.length).toBe(parsed.steps.length);
	});
});

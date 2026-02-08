import { describe, expect, it } from "vitest";
import { parseRecipe } from "../parser.js";
import { serializeRecipe } from "../serializer.js";

describe("serializeRecipe", () => {
	it("serializes metadata", () => {
		const recipe = {
			metadata: { "time required": "30 Minuten", servings: "2" },
			sections: [],
		};
		const output = serializeRecipe(recipe);
		expect(output).toContain(">> time required: 30 Minuten");
		expect(output).toContain(">> servings: 2");
	});

	it("serializes ingredients back to cooklang format", () => {
		const recipe = {
			metadata: {},
			sections: [
				{
					name: "",
					steps: [
						{
							tokens: [
								{
									type: "ingredient" as const,
									name: "Hackfleisch",
									amount: "500",
									unit: "g",
									preparation: "",
								},
								{ type: "text" as const, value: " anbraten." },
							],
						},
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
			sections: [
				{
					name: "",
					steps: [
						{
							tokens: [
								{
									type: "ingredient" as const,
									name: "Salz",
									amount: "",
									unit: "",
									preparation: "",
								},
							],
						},
					],
				},
			],
		};
		const output = serializeRecipe(recipe);
		expect(output).toContain("@Salz");
		expect(output).not.toContain("{");
	});

	it("serializes ingredient with preparation note", () => {
		const recipe = {
			metadata: {},
			sections: [
				{
					name: "",
					steps: [
						{
							tokens: [
								{
									type: "ingredient" as const,
									name: "Zwiebel",
									amount: "1",
									unit: "",
									preparation: "geschält und fein gewürfelt",
								},
								{ type: "text" as const, value: " anbraten." },
							],
						},
					],
				},
			],
		};
		const output = serializeRecipe(recipe);
		expect(output).toBe("@Zwiebel{1%}(geschält und fein gewürfelt) anbraten.");
	});

	it("serializes ingredient without preparation note", () => {
		const recipe = {
			metadata: {},
			sections: [
				{
					name: "",
					steps: [
						{
							tokens: [
								{
									type: "ingredient" as const,
									name: "Mehl",
									amount: "500",
									unit: "g",
									preparation: "",
								},
							],
						},
					],
				},
			],
		};
		const output = serializeRecipe(recipe);
		expect(output).toBe("@Mehl{500%g}");
	});

	it("roundtrips ingredient with preparation note", () => {
		const input = "@Knoblauch{2%Zehen}(gepresst) dazugeben.";
		const parsed = parseRecipe(input);
		const output = serializeRecipe(parsed);
		expect(output).toBe("@Knoblauch{2%Zehen}(gepresst) dazugeben.");
	});

	it("serializes fixed ingredient with = prefix", () => {
		const recipe = {
			metadata: {},
			sections: [
				{
					name: "",
					steps: [
						{
							tokens: [
								{
									type: "ingredient" as const,
									name: "Salz",
									amount: "1",
									unit: "TL",
									preparation: "",
									fixed: true,
								},
							],
						},
					],
				},
			],
		};
		const output = serializeRecipe(recipe);
		expect(output).toBe("@Salz{=1%TL}");
	});

	it("serializes non-fixed ingredient without = prefix", () => {
		const recipe = {
			metadata: {},
			sections: [
				{
					name: "",
					steps: [
						{
							tokens: [
								{
									type: "ingredient" as const,
									name: "Mehl",
									amount: "500",
									unit: "g",
									preparation: "",
								},
							],
						},
					],
				},
			],
		};
		const output = serializeRecipe(recipe);
		expect(output).toBe("@Mehl{500%g}");
	});

	it("roundtrips fixed ingredient", () => {
		const input = "@Vanilleextrakt{=1%TL} hinzufügen.";
		const parsed = parseRecipe(input);
		const output = serializeRecipe(parsed);
		expect(output).toBe("@Vanilleextrakt{=1%TL} hinzufügen.");
	});

	it("serializes equipment with spaces using braces", () => {
		const recipe = {
			metadata: {},
			sections: [
				{
					name: "",
					steps: [
						{
							tokens: [{ type: "equipment" as const, name: "großen Schüssel" }],
						},
					],
				},
			],
		};
		const output = serializeRecipe(recipe);
		expect(output).toContain("#großen Schüssel{}");
	});

	it("serializes timer with name", () => {
		const recipe = {
			metadata: {},
			sections: [
				{
					name: "",
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
				},
			],
		};
		const output = serializeRecipe(recipe);
		expect(output).toContain("~braten{4%Minuten}");
	});

	it("serializes timer without name", () => {
		const recipe = {
			metadata: {},
			sections: [
				{
					name: "",
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
		expect(reparsed.sections[0].steps.length).toBe(
			parsed.sections[0].steps.length,
		);
	});

	it("serializes inline comment", () => {
		const recipe = {
			metadata: {},
			sections: [
				{
					name: "",
					steps: [
						{
							tokens: [
								{ type: "text" as const, value: "Zwiebel anbraten. " },
								{ type: "inlineComment" as const, value: "bis glasig" },
							],
						},
					],
				},
			],
		};
		const output = serializeRecipe(recipe);
		expect(output).toBe("Zwiebel anbraten. -- bis glasig");
	});

	it("serializes block comment", () => {
		const recipe = {
			metadata: {},
			sections: [
				{
					name: "",
					steps: [
						{
							tokens: [
								{
									type: "blockComment" as const,
									value: "Tipp: Raumtemperatur",
								},
							],
						},
					],
				},
			],
		};
		const output = serializeRecipe(recipe);
		expect(output).toBe("[- Tipp: Raumtemperatur -]");
	});

	it("roundtrips a recipe with inline comments", () => {
		const input = "@Öl{2%EL} erhitzen. -- auf mittlerer Hitze";
		const parsed = parseRecipe(input);
		const output = serializeRecipe(parsed);
		const reparsed = parseRecipe(output);
		expect(reparsed.sections[0].steps.length).toBe(
			parsed.sections[0].steps.length,
		);
		expect(
			reparsed.sections[0].steps[0].tokens.find(
				(t) => t.type === "inlineComment",
			),
		).toMatchObject({ value: "auf mittlerer Hitze" });
	});

	it("roundtrips a recipe with block comments", () => {
		const input = `[- Hinweis -]
@Hackfleisch{500%g} anbraten.`;
		const parsed = parseRecipe(input);
		const output = serializeRecipe(parsed);
		const reparsed = parseRecipe(output);
		expect(reparsed.sections[0].steps.length).toBe(
			parsed.sections[0].steps.length,
		);
		expect(reparsed.sections[0].steps[0].tokens[0]).toMatchObject({
			type: "blockComment",
			value: "Hinweis",
		});
	});

	it("serializes a section header", () => {
		const recipe = {
			metadata: {},
			sections: [
				{
					name: "Teig",
					steps: [
						{ tokens: [{ type: "text" as const, value: "Mehl verrühren." }] },
					],
				},
			],
		};
		const output = serializeRecipe(recipe);
		expect(output).toBe("= Teig\n\nMehl verrühren.");
	});

	it("serializes multiple sections", () => {
		const recipe = {
			metadata: {},
			sections: [
				{
					name: "Teig",
					steps: [
						{ tokens: [{ type: "text" as const, value: "Mehl verrühren." }] },
					],
				},
				{
					name: "Füllung",
					steps: [
						{ tokens: [{ type: "text" as const, value: "Fleisch anbraten." }] },
					],
				},
			],
		};
		const output = serializeRecipe(recipe);
		expect(output).toBe(
			"= Teig\n\nMehl verrühren.\n\n= Füllung\n\nFleisch anbraten.",
		);
	});

	it("serializes unnamed section without header", () => {
		const recipe = {
			metadata: {},
			sections: [
				{
					name: "",
					steps: [
						{ tokens: [{ type: "text" as const, value: "Schritt eins." }] },
					],
				},
			],
		};
		const output = serializeRecipe(recipe);
		expect(output).toBe("Schritt eins.");
	});

	it("roundtrips a recipe with sections", () => {
		const input =
			">> servings: 2\n\n= Teig\n\n@Mehl{500%g} verrühren.\n\n= Füllung\n\n@Hackfleisch{300%g} anbraten.";
		const parsed = parseRecipe(input);
		const output = serializeRecipe(parsed);
		const reparsed = parseRecipe(output);
		expect(reparsed.sections).toHaveLength(2);
		expect(reparsed.sections[0].name).toBe("Teig");
		expect(reparsed.sections[1].name).toBe("Füllung");
	});

	it("serializes a note step", () => {
		const recipe = {
			metadata: {},
			sections: [
				{
					name: "",
					steps: [
						{
							tokens: [{ type: "text" as const, value: "Hinweis zum Rezept." }],
							isNote: true,
						},
					],
				},
			],
		};
		const output = serializeRecipe(recipe);
		expect(output).toBe("> Hinweis zum Rezept.");
	});

	it("serializes a note with tokens", () => {
		const recipe = {
			metadata: {},
			sections: [
				{
					name: "",
					steps: [
						{
							tokens: [
								{ type: "text" as const, value: "Tipp: " },
								{
									type: "ingredient" as const,
									name: "Butter",
									amount: "50",
									unit: "g",
									preparation: "",
								},
								{ type: "text" as const, value: " vorher schmelzen." },
							],
							isNote: true,
						},
					],
				},
			],
		};
		const output = serializeRecipe(recipe);
		expect(output).toBe("> Tipp: @Butter{50%g} vorher schmelzen.");
	});

	it("roundtrips a recipe with notes", () => {
		const input = `> Ein kleiner Hinweis.

@Mehl{500%g} verrühren.`;
		const parsed = parseRecipe(input);
		const output = serializeRecipe(parsed);
		const reparsed = parseRecipe(output);
		expect(reparsed.sections[0].steps).toHaveLength(2);
		expect(reparsed.sections[0].steps[0].isNote).toBe(true);
		expect(reparsed.sections[0].steps[1].isNote).toBeUndefined();
	});

	// --- Recipe references ---

	it("serializes recipe reference with amount and unit", () => {
		const recipe = {
			metadata: {},
			sections: [
				{
					name: "",
					steps: [
						{
							tokens: [
								{
									type: "recipeRef" as const,
									ref: "./sauces/Hollandaise",
									amount: "150",
									unit: "g",
								},
								{ type: "text" as const, value: " servieren." },
							],
						},
					],
				},
			],
		};
		const output = serializeRecipe(recipe);
		expect(output).toBe("@./sauces/Hollandaise{150%g} servieren.");
	});

	it("serializes recipe reference without amount", () => {
		const recipe = {
			metadata: {},
			sections: [
				{
					name: "",
					steps: [
						{
							tokens: [
								{
									type: "recipeRef" as const,
									ref: "./Pizzateig",
									amount: "",
									unit: "",
								},
							],
						},
					],
				},
			],
		};
		const output = serializeRecipe(recipe);
		expect(output).toBe("@./Pizzateig");
	});

	it("roundtrips recipe reference", () => {
		const input = "@./sauces/Hollandaise{150%g} servieren.";
		const parsed = parseRecipe(input);
		const output = serializeRecipe(parsed);
		expect(output).toBe("@./sauces/Hollandaise{150%g} servieren.");
	});
});

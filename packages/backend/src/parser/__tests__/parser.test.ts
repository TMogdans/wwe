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
		expect(recipe.sections).toEqual([]);
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
		expect(recipe.sections[0].steps).toHaveLength(2);
	});

	it("treats each non-empty line as its own step", () => {
		const input = `>> servings: 2

Zeile eins.
Zeile zwei.

Neuer Schritt.`;
		const recipe = parseRecipe(input);
		expect(recipe.sections[0].steps).toHaveLength(3);
	});

	it("parses a real recipe file", () => {
		const input = `>> time required: 10 Minuten
>> servings: 4

@Butter, weich{250%g} aus dem Kuehlschrank nehmen.

Den @Knoblauch{3%Zehen} schaelen und reiben.`;
		const recipe = parseRecipe(input);
		expect(recipe.metadata["time required"]).toBe("10 Minuten");
		expect(recipe.sections[0].steps).toHaveLength(2);
		expect(
			recipe.sections[0].steps[0].tokens.find((t) => t.type === "ingredient"),
		).toMatchObject({
			name: "Butter, weich",
			amount: "250",
			unit: "g",
		});
	});

	it("parses inline comments within steps", () => {
		const input = `Zwiebel anbraten. -- bis sie glasig sind

Weiter kochen.`;
		const recipe = parseRecipe(input);
		expect(recipe.sections[0].steps).toHaveLength(2);
		expect(recipe.sections[0].steps[0].tokens).toEqual([
			{ type: "text", value: "Zwiebel anbraten. " },
			{ type: "inlineComment", value: "bis sie glasig sind" },
		]);
	});

	it("parses single-line block comments", () => {
		const input = `[- Tipp: Raumtemperatur -]
@Hackfleisch{500%g} anbraten.`;
		const recipe = parseRecipe(input);
		expect(recipe.sections[0].steps).toHaveLength(2);
		expect(recipe.sections[0].steps[0].tokens).toEqual([
			{ type: "blockComment", value: "Tipp: Raumtemperatur" },
		]);
	});

	it("parses multi-line block comments", () => {
		const input = `[- Das ist ein
mehrzeiliger
Kommentar -]
Naechster Schritt.`;
		const recipe = parseRecipe(input);
		expect(recipe.sections[0].steps).toHaveLength(2);
		expect(recipe.sections[0].steps[0].tokens[0]).toMatchObject({
			type: "blockComment",
			value: "Das ist ein\nmehrzeiliger\nKommentar",
		});
		expect(recipe.sections[0].steps[1].tokens[0]).toMatchObject({
			type: "text",
			value: "Naechster Schritt.",
		});
	});

	it("parses text after closing multi-line block comment", () => {
		const input = `[- Kommentar
Ende -] Weiter hier.`;
		const recipe = parseRecipe(input);
		expect(recipe.sections[0].steps).toHaveLength(2);
		expect(recipe.sections[0].steps[0].tokens[0]).toMatchObject({
			type: "blockComment",
		});
		expect(recipe.sections[0].steps[1].tokens[0]).toMatchObject({
			type: "text",
			value: "Weiter hier.",
		});
	});

	it("parses recipe with mixed comments", () => {
		const input = `>> servings: 2

@Öl{2%EL} erhitzen. -- auf mittlerer Hitze

[- Hackfleisch sollte Raumtemperatur haben -]
@Hackfleisch{500%g} anbraten.`;
		const recipe = parseRecipe(input);
		expect(recipe.metadata.servings).toBe("2");
		expect(recipe.sections[0].steps).toHaveLength(3);
		expect(
			recipe.sections[0].steps[0].tokens.find(
				(t) => t.type === "inlineComment",
			),
		).toMatchObject({ value: "auf mittlerer Hitze" });
		expect(recipe.sections[0].steps[1].tokens[0]).toMatchObject({
			type: "blockComment",
		});
	});

	it("parses a section header", () => {
		const input = "= Teig\n\n@Mehl{500%g} verrühren.";
		const recipe = parseRecipe(input);
		expect(recipe.sections).toHaveLength(1);
		expect(recipe.sections[0].name).toBe("Teig");
		expect(recipe.sections[0].steps).toHaveLength(1);
	});

	it("parses multiple sections", () => {
		const input =
			"= Teig\n\n@Mehl{500%g} verrühren.\n\n= Füllung\n\n@Hackfleisch{300%g} anbraten.";
		const recipe = parseRecipe(input);
		expect(recipe.sections).toHaveLength(2);
		expect(recipe.sections[0].name).toBe("Teig");
		expect(recipe.sections[0].steps).toHaveLength(1);
		expect(recipe.sections[1].name).toBe("Füllung");
		expect(recipe.sections[1].steps).toHaveLength(1);
	});

	it("puts steps before first section into unnamed section", () => {
		const input = "@Öl{2%EL} erhitzen.\n\n= Soße\n\n@Tomaten{400%g} kochen.";
		const recipe = parseRecipe(input);
		expect(recipe.sections).toHaveLength(2);
		expect(recipe.sections[0].name).toBe("");
		expect(recipe.sections[0].steps).toHaveLength(1);
		expect(recipe.sections[1].name).toBe("Soße");
	});

	it("handles section syntax with trailing equals signs", () => {
		const input = "== Teig ==\n\n@Mehl{500%g} verrühren.";
		const recipe = parseRecipe(input);
		expect(recipe.sections).toHaveLength(1);
		expect(recipe.sections[0].name).toBe("Teig");
	});

	it("handles section syntax with multiple leading equals signs", () => {
		const input = "=== Glasur\n\n@Zucker{100%g} schmelzen.";
		const recipe = parseRecipe(input);
		expect(recipe.sections).toHaveLength(1);
		expect(recipe.sections[0].name).toBe("Glasur");
	});

	it("recipe without sections puts all steps in one unnamed section", () => {
		const input = "@Mehl{500%g} verrühren.\n\nWeiter rühren.";
		const recipe = parseRecipe(input);
		expect(recipe.sections).toHaveLength(1);
		expect(recipe.sections[0].name).toBe("");
		expect(recipe.sections[0].steps).toHaveLength(2);
	});

	it("parses a note line", () => {
		const input = "> Dieses Rezept stammt aus Omas Kochbuch.";
		const recipe = parseRecipe(input);
		expect(recipe.sections[0].steps).toHaveLength(1);
		expect(recipe.sections[0].steps[0].isNote).toBe(true);
		expect(recipe.sections[0].steps[0].tokens).toEqual([
			{ type: "text", value: "Dieses Rezept stammt aus Omas Kochbuch." },
		]);
	});

	it("parses note with cooklang tokens", () => {
		const input = "> Tipp: @Butter{50%g} vorher schmelzen.";
		const recipe = parseRecipe(input);
		expect(recipe.sections[0].steps[0].isNote).toBe(true);
		expect(recipe.sections[0].steps[0].tokens).toEqual([
			{ type: "text", value: "Tipp: " },
			{
				type: "ingredient",
				name: "Butter",
				amount: "50",
				unit: "g",
				preparation: "",
			},
			{ type: "text", value: " vorher schmelzen." },
		]);
	});

	it("distinguishes notes from regular steps", () => {
		const input = `> Hinweis zum Rezept.

@Mehl{500%g} in eine Schüssel geben.`;
		const recipe = parseRecipe(input);
		expect(recipe.sections[0].steps).toHaveLength(2);
		expect(recipe.sections[0].steps[0].isNote).toBe(true);
		expect(recipe.sections[0].steps[1].isNote).toBeUndefined();
	});

	it("parses note within a section", () => {
		const input = `= Teig

> Am besten den Teig am Vortag vorbereiten.

@Mehl{500%g} verrühren.`;
		const recipe = parseRecipe(input);
		expect(recipe.sections[0].steps).toHaveLength(2);
		expect(recipe.sections[0].steps[0].isNote).toBe(true);
		expect(recipe.sections[0].steps[1].isNote).toBeUndefined();
	});

	it("does not confuse >> metadata with > note", () => {
		const input = `>> servings: 4

> Eine kleine Notiz.`;
		const recipe = parseRecipe(input);
		expect(recipe.metadata.servings).toBe("4");
		expect(recipe.sections[0].steps).toHaveLength(1);
		expect(recipe.sections[0].steps[0].isNote).toBe(true);
	});
});

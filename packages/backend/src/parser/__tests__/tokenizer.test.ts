import { describe, expect, it } from "vitest";
import { tokenizeLine } from "../tokenizer.js";

describe("tokenizeLine", () => {
	it("parses plain text", () => {
		const { tokens } = tokenizeLine("Alles gut vermengen.");
		expect(tokens).toEqual([{ type: "text", value: "Alles gut vermengen." }]);
	});

	it("parses ingredient with amount and unit", () => {
		const { tokens } = tokenizeLine("Das @Hackfleisch{500%g} anbraten.");
		expect(tokens).toEqual([
			{ type: "text", value: "Das " },
			{ type: "ingredient", name: "Hackfleisch", amount: "500", unit: "g" },
			{ type: "text", value: " anbraten." },
		]);
	});

	it("parses ingredient with amount only (no separator)", () => {
		const { tokens } = tokenizeLine("@Passierte Tomaten{400g} hinzufuegen.");
		expect(tokens).toEqual([
			{
				type: "ingredient",
				name: "Passierte Tomaten",
				amount: "400g",
				unit: "",
			},
			{ type: "text", value: " hinzufuegen." },
		]);
	});

	it("parses ingredient without amount", () => {
		const { tokens } = tokenizeLine("Mit @Salz und @Pfeffer wuerzen.");
		expect(tokens).toEqual([
			{ type: "text", value: "Mit " },
			{ type: "ingredient", name: "Salz", amount: "", unit: "" },
			{ type: "text", value: " und " },
			{ type: "ingredient", name: "Pfeffer", amount: "", unit: "" },
			{ type: "text", value: " wuerzen." },
		]);
	});

	it("parses ingredient with fraction amount", () => {
		const { tokens } = tokenizeLine("@Vanilleschote{1/2} auskratzen.");
		expect(tokens).toEqual([
			{ type: "ingredient", name: "Vanilleschote", amount: "1/2", unit: "" },
			{ type: "text", value: " auskratzen." },
		]);
	});

	it("parses ingredient with comma in name", () => {
		const { tokens } = tokenizeLine("@Chili, grün{1%Stück} hacken.");
		expect(tokens).toEqual([
			{ type: "ingredient", name: "Chili, grün", amount: "1", unit: "Stück" },
			{ type: "text", value: " hacken." },
		]);
	});

	it("parses equipment", () => {
		const { tokens } = tokenizeLine("In einem #Topf erhitzen.");
		expect(tokens).toEqual([
			{ type: "text", value: "In einem " },
			{ type: "equipment", name: "Topf" },
			{ type: "text", value: " erhitzen." },
		]);
	});

	it("parses equipment with empty braces", () => {
		const { tokens } = tokenizeLine("In einer #großen Schüssel{} mischen.");
		expect(tokens).toEqual([
			{ type: "text", value: "In einer " },
			{ type: "equipment", name: "großen Schüssel" },
			{ type: "text", value: " mischen." },
		]);
	});

	it("parses timer with name", () => {
		const { tokens } = tokenizeLine("~braten{4%Minuten} braten.");
		expect(tokens).toEqual([
			{ type: "timer", name: "braten", duration: "4", unit: "Minuten" },
			{ type: "text", value: " braten." },
		]);
	});

	it("parses timer without name", () => {
		const { tokens } = tokenizeLine("~{10%Minuten} kochen.");
		expect(tokens).toEqual([
			{ type: "timer", name: "", duration: "10", unit: "Minuten" },
			{ type: "text", value: " kochen." },
		]);
	});

	it("parses timer with range duration", () => {
		const { tokens } = tokenizeLine("~simmern{5-7%Minuten} simmern.");
		expect(tokens).toEqual([
			{ type: "timer", name: "simmern", duration: "5-7", unit: "Minuten" },
			{ type: "text", value: " simmern." },
		]);
	});

	it("parses mixed tokens in complex line", () => {
		const { tokens } = tokenizeLine(
			"@Öl{2%EL} in einem #Topf erhitzen und @Hackfleisch{500%g} anbraten.",
		);
		expect(tokens).toEqual([
			{ type: "ingredient", name: "Öl", amount: "2", unit: "EL" },
			{ type: "text", value: " in einem " },
			{ type: "equipment", name: "Topf" },
			{ type: "text", value: " erhitzen und " },
			{ type: "ingredient", name: "Hackfleisch", amount: "500", unit: "g" },
			{ type: "text", value: " anbraten." },
		]);
	});

	// --- Inline comments ---

	it("parses inline comment at end of line", () => {
		const { tokens } = tokenizeLine("Zwiebel anbraten -- bis sie glasig sind");
		expect(tokens).toEqual([
			{ type: "text", value: "Zwiebel anbraten " },
			{ type: "inlineComment", value: "bis sie glasig sind" },
		]);
	});

	it("parses inline comment after ingredient", () => {
		const { tokens } = tokenizeLine(
			"@Öl{2%EL} erhitzen -- auf mittlerer Hitze",
		);
		expect(tokens).toEqual([
			{ type: "ingredient", name: "Öl", amount: "2", unit: "EL" },
			{ type: "text", value: " erhitzen " },
			{ type: "inlineComment", value: "auf mittlerer Hitze" },
		]);
	});

	it("parses line that is only an inline comment", () => {
		const { tokens } = tokenizeLine("-- Nur ein Kommentar");
		expect(tokens).toEqual([
			{ type: "inlineComment", value: "Nur ein Kommentar" },
		]);
	});

	it("parses inline comment with empty value", () => {
		const { tokens } = tokenizeLine("Text --");
		expect(tokens).toEqual([
			{ type: "text", value: "Text " },
			{ type: "inlineComment", value: "" },
		]);
	});

	// --- Block comments ---

	it("parses block comment inline", () => {
		const { tokens } = tokenizeLine("Text [- Kommentar -] weiter");
		expect(tokens).toEqual([
			{ type: "text", value: "Text " },
			{ type: "blockComment", value: "Kommentar" },
			{ type: "text", value: " weiter" },
		]);
	});

	it("parses block comment at end of line", () => {
		const { tokens } = tokenizeLine("Text [- Kommentar -]");
		expect(tokens).toEqual([
			{ type: "text", value: "Text " },
			{ type: "blockComment", value: "Kommentar" },
		]);
	});

	it("parses line that is only a block comment", () => {
		const { tokens } = tokenizeLine("[- Nur ein Block-Kommentar -]");
		expect(tokens).toEqual([
			{ type: "blockComment", value: "Nur ein Block-Kommentar" },
		]);
	});

	it("parses block comment between ingredients", () => {
		const { tokens } = tokenizeLine(
			"@Öl{2%EL} [- alternativ Butter -] in #Topf erhitzen",
		);
		expect(tokens).toEqual([
			{ type: "ingredient", name: "Öl", amount: "2", unit: "EL" },
			{ type: "text", value: " " },
			{ type: "blockComment", value: "alternativ Butter" },
			{ type: "text", value: " in " },
			{ type: "equipment", name: "Topf" },
			{ type: "text", value: " erhitzen" },
		]);
	});

	it("signals open block comment when no closing found", () => {
		const result = tokenizeLine("Text [- offener Kommentar");
		expect(result.tokens).toEqual([{ type: "text", value: "Text " }]);
		expect(result.openBlockComment).toBe(" offener Kommentar");
	});

	it("block comment takes priority over inline comment inside it", () => {
		const { tokens } = tokenizeLine("[- hat -- drin -] weiter");
		expect(tokens).toEqual([
			{ type: "blockComment", value: "hat -- drin" },
			{ type: "text", value: " weiter" },
		]);
	});
});

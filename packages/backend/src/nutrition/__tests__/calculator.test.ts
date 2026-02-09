import { describe, expect, it } from "vitest";
import type { CooklangIngredient } from "../../parser/types.js";
import {
	type MappingConfig,
	type NutrientConfig,
	convertToGrams,
} from "../calculator.js";

describe("convertToGrams", () => {
	it("converts grams directly", () => {
		expect(convertToGrams("500", "g")).toBe(500);
	});

	it("converts kilograms to grams", () => {
		expect(convertToGrams("1", "kg")).toBe(1000);
	});

	it("converts ml to grams", () => {
		expect(convertToGrams("200", "ml")).toBe(200);
	});

	it("converts liters to grams", () => {
		expect(convertToGrams("1", "l")).toBe(1000);
	});

	it("converts EL to grams using default", () => {
		expect(convertToGrams("2", "EL")).toBe(30);
	});

	it("converts TL to grams using default", () => {
		expect(convertToGrams("1", "TL")).toBe(5);
	});

	it("converts Prise to grams", () => {
		expect(convertToGrams("1", "Priese")).toBe(0.5);
	});

	it("converts Tasse to grams", () => {
		expect(convertToGrams("1", "Tasse")).toBe(250);
	});

	it("converts Dose to grams", () => {
		expect(convertToGrams("2", "Dose")).toBe(800);
	});

	it("uses ingredient-specific unit override", () => {
		const mapping = { code: "G480100", gramsPer: { Stück: 150 } };
		expect(convertToGrams("2", "Stück", mapping)).toBe(300);
	});

	it("prefers ingredient-specific over default", () => {
		const mapping = { code: "X", gramsPer: { EL: 10 } };
		expect(convertToGrams("2", "EL", mapping)).toBe(20);
	});

	it("returns null for unknown unit without mapping", () => {
		expect(convertToGrams("2", "Zehen")).toBeNull();
	});

	it("returns null for empty amount", () => {
		expect(convertToGrams("", "g")).toBeNull();
	});

	it("handles fractions", () => {
		expect(convertToGrams("1/2", "kg")).toBe(500);
	});

	it("handles decimal comma", () => {
		expect(convertToGrams("1,5", "kg")).toBe(1500);
	});
});

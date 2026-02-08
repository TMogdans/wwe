import { describe, expect, it } from "vitest";
import { scaleAmount } from "../scale-amount.js";

describe("scaleAmount", () => {
	it("scales integer amounts", () => {
		expect(scaleAmount("500", 2)).toBe("1000");
	});

	it("scales decimal amounts", () => {
		expect(scaleAmount("1.5", 2)).toBe("3");
	});

	it("formats non-integer results to 1 decimal", () => {
		expect(scaleAmount("100", 1.5)).toBe("150");
		expect(scaleAmount("3", 1.5)).toBe("4.5");
	});

	it("returns empty string for empty input", () => {
		expect(scaleAmount("", 2)).toBe("");
	});

	it("scales fractions", () => {
		expect(scaleAmount("1/2", 2)).toBe("1");
		expect(scaleAmount("1/4", 2)).toBe("0.5");
		expect(scaleAmount("3/4", 2)).toBe("1.5");
	});

	it("scales ranges", () => {
		expect(scaleAmount("5-7", 2)).toBe("10-14");
		expect(scaleAmount("2-3", 3)).toBe("6-9");
	});

	it("scales ranges with decimal results", () => {
		expect(scaleAmount("5-7", 1.5)).toBe("7.5-10.5");
	});

	it("returns text amounts unchanged", () => {
		expect(scaleAmount("Handvoll", 2)).toBe("Handvoll");
		expect(scaleAmount("kleine Dose", 3)).toBe("kleine Dose");
	});

	it("does not scale when fixed is true", () => {
		expect(scaleAmount("500", 2, true)).toBe("500");
		expect(scaleAmount("1/2", 3, true)).toBe("1/2");
		expect(scaleAmount("5-7", 2, true)).toBe("5-7");
	});

	it("returns original amount when scale is 1", () => {
		expect(scaleAmount("500", 1)).toBe("500");
		expect(scaleAmount("1/2", 1)).toBe("0.5");
		expect(scaleAmount("5-7", 1)).toBe("5-7");
	});
});

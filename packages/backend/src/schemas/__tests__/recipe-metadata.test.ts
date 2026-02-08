import { describe, expect, it } from "vitest";
import { recipeMetadataSchema } from "../recipe.js";

describe("recipeMetadataSchema", () => {
	it("accepts all spec-defined metadata fields", () => {
		const result = recipeMetadataSchema.safeParse({
			"time required": "90 Minuten",
			course: "dinner",
			servings: "4",
			tags: "italian, quick",
			source: "https://example.com",
			author: "Max Mustermann",
			"prep time": "15 Minuten",
			"cook time": "30 Minuten",
			difficulty: "easy",
			cuisine: "Italian",
			diet: "vegetarian",
			description: "A tasty dish",
		});
		expect(result.success).toBe(true);
	});

	it("accepts unknown metadata fields via catchall", () => {
		const result = recipeMetadataSchema.safeParse({
			"custom field": "custom value",
		});
		expect(result.success).toBe(true);
	});

	it("works with empty metadata", () => {
		const result = recipeMetadataSchema.safeParse({});
		expect(result.success).toBe(true);
	});
});

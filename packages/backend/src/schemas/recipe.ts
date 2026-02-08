import { z } from "zod";

export const recipeMetadataSchema = z
	.object({
		"time required": z.string().optional(),
		course: z.string().optional(),
		servings: z.string().optional(),
		tags: z.string().optional(),
		source: z.string().optional(),
		author: z.string().optional(),
		"prep time": z.string().optional(),
		"cook time": z.string().optional(),
		difficulty: z.string().optional(),
		cuisine: z.string().optional(),
		diet: z.string().optional(),
		description: z.string().optional(),
	})
	.catchall(z.string());

export const recipeSummarySchema = z.object({
	slug: z.string(),
	name: z.string(),
	metadata: recipeMetadataSchema,
});

export const createRecipeSchema = z.object({
	name: z.string().min(1),
	content: z.string(),
});

export const updateRecipeSchema = z.object({
	content: z.string(),
});

const slugEntry = z.union([
	z.string(),
	z.object({
		slug: z.string(),
		servings: z.number().positive().optional(),
	}),
]);

export const shoppingListRequestSchema = z.object({
	slugs: z.array(slugEntry).min(1),
});

export type RecipeSummary = z.infer<typeof recipeSummarySchema>;
export type CreateRecipeRequest = z.infer<typeof createRecipeSchema>;
export type UpdateRecipeRequest = z.infer<typeof updateRecipeSchema>;
export const categoriesSchema = z.array(z.string());

export type ShoppingListRequest = z.infer<typeof shoppingListRequestSchema>;

import { z } from "zod";

export const suggestionSchema = z.object({
	ingredient: z.string(),
	suggestions: z.array(
		z.object({
			code: z.string(),
			name_de: z.string(),
			name_en: z.string().nullable(),
		}),
	),
	units: z.array(z.string()),
});

export const suggestionsResponseSchema = z.array(suggestionSchema);

export const createMappingSchema = z.object({
	ingredientName: z.string().min(1),
	blsCode: z.string().min(1),
	gramsPer: z.record(z.string(), z.number().positive()).optional(),
});

export type SuggestionResponse = z.infer<typeof suggestionSchema>;
export type CreateMappingRequest = z.infer<typeof createMappingSchema>;

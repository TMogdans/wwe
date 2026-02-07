import type { CooklangRecipe, CooklangToken } from "./types.js";

/**
 * Serialize a single token back to Cooklang format.
 */
function serializeToken(token: CooklangToken): string {
	switch (token.type) {
		case "ingredient": {
			if (token.amount === "" && token.unit === "") {
				return `@${token.name}`;
			}
			return `@${token.name}{${token.amount}%${token.unit}}`;
		}
		case "equipment": {
			if (token.name.includes(" ")) {
				return `#${token.name}{}`;
			}
			return `#${token.name}`;
		}
		case "timer": {
			if (token.name === "") {
				return `~{${token.duration}%${token.unit}}`;
			}
			return `~${token.name}{${token.duration}%${token.unit}}`;
		}
		case "text": {
			return token.value;
		}
	}
}

/**
 * Serialize a structured recipe object back to Cooklang format.
 *
 * - Metadata: `>> key: value` per line
 * - Empty line after metadata (if there are steps)
 * - Per step: build text from tokens
 * - Steps separated by empty lines
 */
export function serializeRecipe(recipe: CooklangRecipe): string {
	const parts: string[] = [];

	// Serialize metadata
	const metadataKeys = Object.keys(recipe.metadata);
	for (const key of metadataKeys) {
		parts.push(`>> ${key}: ${recipe.metadata[key]}`);
	}

	// Blank line between metadata and steps
	if (metadataKeys.length > 0 && recipe.steps.length > 0) {
		parts.push("");
	}

	// Serialize steps (one per line)
	for (const step of recipe.steps) {
		const stepText = step.tokens.map(serializeToken).join("");
		parts.push(stepText);
	}

	return parts.join("\n");
}

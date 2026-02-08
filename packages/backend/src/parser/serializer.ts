import type { CooklangRecipe, CooklangToken } from "./types.js";

/**
 * Serialize a single token back to Cooklang format.
 */
function serializeToken(token: CooklangToken): string {
	switch (token.type) {
		case "ingredient": {
			let result: string;
			if (token.amount === "" && token.unit === "") {
				result = `@${token.name}`;
			} else {
				result = `@${token.name}{${token.amount}%${token.unit}}`;
			}
			if (token.preparation) {
				result += `(${token.preparation})`;
			}
			return result;
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
		case "inlineComment": {
			return `-- ${token.value}`;
		}
		case "blockComment": {
			return `[- ${token.value} -]`;
		}
	}
}

/**
 * Serialize a structured recipe object back to Cooklang format.
 *
 * - Metadata: `>> key: value` per line
 * - Empty line after metadata (if there are sections)
 * - Per section: optional `= name` header, then steps
 * - Sections and steps separated by empty lines
 */
export function serializeRecipe(recipe: CooklangRecipe): string {
	const parts: string[] = [];

	// Serialize metadata
	const metadataKeys = Object.keys(recipe.metadata);
	for (const key of metadataKeys) {
		parts.push(`>> ${key}: ${recipe.metadata[key]}`);
	}

	// Blank line between metadata and sections
	if (metadataKeys.length > 0 && recipe.sections.length > 0) {
		parts.push("");
	}

	// Serialize sections
	for (let i = 0; i < recipe.sections.length; i++) {
		const section = recipe.sections[i];

		// Add blank line between sections (not before the first one)
		if (i > 0) {
			parts.push("");
		}

		// Emit section header for named sections
		if (section.name !== "") {
			parts.push(`= ${section.name}`);
			if (section.steps.length > 0) {
				parts.push("");
			}
		}

		// Serialize steps within the section
		for (let j = 0; j < section.steps.length; j++) {
			const step = section.steps[j];
			const stepText = step.tokens.map(serializeToken).join("");
			parts.push(step.isNote ? `> ${stepText}` : stepText);
		}
	}

	return parts.join("\n");
}

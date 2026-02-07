import { tokenizeLine } from "./tokenizer.js";
import type {
	CooklangMetadata,
	CooklangRecipe,
	CooklangStep,
} from "./types.js";

/**
 * Parse a complete Cooklang recipe string into a structured recipe object.
 *
 * 1. Lines starting with `>>` are metadata (key/value split by `:`).
 *    Keys are normalized to lowercase and trimmed.
 * 2. Each non-empty, non-metadata line becomes its own step.
 * 3. Each step line is tokenized using `tokenizeLine`.
 */
export function parseRecipe(input: string): CooklangRecipe {
	const lines = input.split("\n");
	const metadata: CooklangMetadata = {};
	const steps: CooklangStep[] = [];

	for (const line of lines) {
		const trimmed = line.trim();

		if (trimmed.startsWith(">>")) {
			const content = trimmed.slice(2);
			const colonIndex = content.indexOf(":");
			if (colonIndex !== -1) {
				const key = content.slice(0, colonIndex).trim().toLowerCase();
				const value = content.slice(colonIndex + 1).trim();
				metadata[key] = value;
			}
			continue;
		}

		if (trimmed === "") {
			continue;
		}

		const tokens = tokenizeLine(trimmed);
		steps.push({ tokens });
	}

	return { metadata, steps };
}

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
 * 2. Empty lines separate steps.
 * 3. Consecutive non-empty lines (after the metadata block) are joined
 *    into a single step.
 * 4. Each step line is tokenized using `tokenizeLine`.
 */
export function parseRecipe(input: string): CooklangRecipe {
	const lines = input.split("\n");
	const metadata: CooklangMetadata = {};
	const steps: CooklangStep[] = [];

	let currentStepLines: string[] = [];

	function flushStep(): void {
		if (currentStepLines.length === 0) {
			return;
		}

		const combined = currentStepLines.join(" ");
		const tokens = tokenizeLine(combined);
		steps.push({ tokens });
		currentStepLines = [];
	}

	for (const line of lines) {
		const trimmed = line.trim();

		if (trimmed.startsWith(">>")) {
			// Metadata line: strip leading ">>" and split on first ":"
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
			// Empty line: flush any accumulated step lines
			flushStep();
			continue;
		}

		// Non-empty, non-metadata line: accumulate for current step
		currentStepLines.push(trimmed);
	}

	// Flush any remaining step lines at end of input
	flushStep();

	return { metadata, steps };
}

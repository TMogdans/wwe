import { tokenizeLine } from "./tokenizer.js";
import type {
	CooklangBlockComment,
	CooklangMetadata,
	CooklangRecipe,
	CooklangSection,
} from "./types.js";

/**
 * Parse a complete Cooklang recipe string into a structured recipe object.
 *
 * 1. Lines starting with `>>` are metadata (key/value split by `:`).
 *    Keys are normalized to lowercase and trimmed.
 * 2. Lines starting with `=` are section headers (e.g. `= Teig`, `== Teig ==`).
 * 3. Each non-empty, non-metadata, non-section line becomes its own step.
 * 4. Each step line is tokenized using `tokenizeLine`.
 * 5. Block comments (`[- ... -]`) can span multiple lines.
 *    Multi-line block comments are accumulated and emitted as a
 *    standalone step containing a single `blockComment` token.
 */
export function parseRecipe(input: string): CooklangRecipe {
	const lines = input.split("\n");
	const metadata: CooklangMetadata = {};
	const sections: CooklangSection[] = [];

	let currentSection: CooklangSection = { name: "", steps: [] };
	let insideBlockComment = false;
	let blockCommentContent = "";

	const sectionRegex = /^=+\s*(.*?)(?:\s*=+)?$/;

	for (const line of lines) {
		const trimmed = line.trim();

		// Accumulate multi-line block comment content
		if (insideBlockComment) {
			const closeIdx = trimmed.indexOf("-]");
			if (closeIdx !== -1) {
				blockCommentContent += `\n${trimmed.substring(0, closeIdx)}`;
				currentSection.steps.push({
					tokens: [
						{
							type: "blockComment",
							value: blockCommentContent.trim(),
						} as CooklangBlockComment,
					],
				});
				insideBlockComment = false;
				blockCommentContent = "";

				// Process any remaining text after -]
				const remaining = trimmed.substring(closeIdx + 2).trim();
				if (remaining) {
					const result = tokenizeLine(remaining);
					if (result.openBlockComment !== undefined) {
						if (result.tokens.length > 0) {
							currentSection.steps.push({ tokens: result.tokens });
						}
						insideBlockComment = true;
						blockCommentContent = result.openBlockComment;
					} else if (result.tokens.length > 0) {
						currentSection.steps.push({ tokens: result.tokens });
					}
				}
			} else {
				blockCommentContent += `\n${trimmed}`;
			}
			continue;
		}

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

		// Detect note lines: > (but not >>)
		if (trimmed.startsWith(">") && !trimmed.startsWith(">>")) {
			const noteContent = trimmed.slice(1).trim();
			const result = tokenizeLine(noteContent);
			currentSection.steps.push({ tokens: result.tokens, isNote: true });
			continue;
		}

		if (trimmed === "") {
			continue;
		}

		// Detect section headers: = Name, == Name ==, === Name, etc.
		const sectionMatch = trimmed.match(sectionRegex);
		if (sectionMatch) {
			// Push current section if it has steps
			if (currentSection.steps.length > 0) {
				sections.push(currentSection);
			}
			currentSection = { name: sectionMatch[1].trim(), steps: [] };
			continue;
		}

		const result = tokenizeLine(trimmed);
		if (result.openBlockComment !== undefined) {
			if (result.tokens.length > 0) {
				currentSection.steps.push({ tokens: result.tokens });
			}
			insideBlockComment = true;
			blockCommentContent = result.openBlockComment;
		} else {
			currentSection.steps.push({ tokens: result.tokens });
		}
	}

	// Push the final section if it has steps
	if (currentSection.steps.length > 0) {
		sections.push(currentSection);
	}

	return { metadata, sections };
}

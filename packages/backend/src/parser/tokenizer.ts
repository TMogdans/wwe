import type {
	CooklangEquipment,
	CooklangIngredient,
	CooklangText,
	CooklangTimer,
	CooklangToken,
} from "./types.js";

function isSpecialTrigger(ch: string): boolean {
	return ch === "@" || ch === "#" || ch === "~";
}

/**
 * Look ahead from position `start` to find the index of `{` before the next
 * special trigger character (`@`, `#`, `~`) or end of line.
 * Returns -1 if no `{` is found before the next trigger.
 */
function findBraceBeforeNextTrigger(line: string, start: number): number {
	for (let i = start; i < line.length; i++) {
		if (line[i] === "{") {
			return i;
		}
		if (isSpecialTrigger(line[i])) {
			return -1;
		}
	}
	return -1;
}

/**
 * Parse the content inside braces into amount and unit.
 * Split by `%` — left side is amount, right side is unit.
 * If no `%`, entire content is amount and unit is empty.
 */
function parseBraceContent(content: string): { amount: string; unit: string } {
	const percentIndex = content.indexOf("%");
	if (percentIndex === -1) {
		return { amount: content, unit: "" };
	}
	return {
		amount: content.substring(0, percentIndex),
		unit: content.substring(percentIndex + 1),
	};
}

/**
 * Read a single-word name starting at `start`. The word is terminated by
 * space, comma, period, or end of line.
 * Returns the name and the index of the character after the name.
 */
function readSingleWordName(
	line: string,
	start: number,
): { name: string; end: number } {
	let end = start;
	while (end < line.length) {
		const ch = line[end];
		if (ch === " " || ch === "," || ch === ".") {
			break;
		}
		end++;
	}
	return { name: line.substring(start, end), end };
}

/**
 * Tokenize a single line of Cooklang text into an array of tokens.
 */
export function tokenizeLine(line: string): CooklangToken[] {
	const tokens: CooklangToken[] = [];
	let textAccumulator = "";
	let i = 0;

	function flushText(): void {
		if (textAccumulator.length > 0) {
			tokens.push({ type: "text", value: textAccumulator } as CooklangText);
			textAccumulator = "";
		}
	}

	while (i < line.length) {
		const ch = line[i];

		if (ch === "@") {
			flushText();
			i++; // skip '@'

			const braceIndex = findBraceBeforeNextTrigger(line, i);

			if (braceIndex !== -1) {
				// Multi-word name: everything between '@' and '{' is the name
				const name = line.substring(i, braceIndex);
				// Find closing brace
				const closingBrace = line.indexOf("}", braceIndex + 1);
				if (closingBrace === -1) {
					// Malformed: treat rest as text
					textAccumulator += `@${line.substring(i)}`;
					i = line.length;
					continue;
				}
				const content = line.substring(braceIndex + 1, closingBrace);
				const { amount, unit } = parseBraceContent(content);
				tokens.push({
					type: "ingredient",
					name,
					amount,
					unit,
				} as CooklangIngredient);
				i = closingBrace + 1;
			} else {
				// Single word name
				const { name, end } = readSingleWordName(line, i);
				tokens.push({
					type: "ingredient",
					name,
					amount: "",
					unit: "",
				} as CooklangIngredient);
				i = end;
			}
		} else if (ch === "#") {
			flushText();
			i++; // skip '#'

			const braceIndex = findBraceBeforeNextTrigger(line, i);

			if (braceIndex !== -1) {
				// Multi-word name: everything between '#' and '{' is the name
				const name = line.substring(i, braceIndex);
				// Find closing brace
				const closingBrace = line.indexOf("}", braceIndex + 1);
				if (closingBrace === -1) {
					textAccumulator += `#${line.substring(i)}`;
					i = line.length;
					continue;
				}
				// Content inside braces is ignored for equipment
				tokens.push({ type: "equipment", name } as CooklangEquipment);
				i = closingBrace + 1;
			} else {
				// Single word name
				const { name, end } = readSingleWordName(line, i);
				tokens.push({ type: "equipment", name } as CooklangEquipment);
				i = end;
			}
		} else if (ch === "~") {
			flushText();
			i++; // skip '~'

			// For timers, name is between '~' and '{', and braces are required
			const braceIndex = line.indexOf("{", i);
			if (braceIndex === -1) {
				// Malformed timer: treat as text
				textAccumulator += `~${line.substring(i)}`;
				i = line.length;
				continue;
			}

			const name = line.substring(i, braceIndex);
			const closingBrace = line.indexOf("}", braceIndex + 1);
			if (closingBrace === -1) {
				textAccumulator += `~${line.substring(i)}`;
				i = line.length;
				continue;
			}

			const content = line.substring(braceIndex + 1, closingBrace);
			const { amount: duration, unit } = parseBraceContent(content);
			tokens.push({
				type: "timer",
				name,
				duration,
				unit,
			} as CooklangTimer);
			i = closingBrace + 1;
		} else {
			textAccumulator += ch;
			i++;
		}
	}

	flushText();
	return tokens;
}

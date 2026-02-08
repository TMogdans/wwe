import type { JSONContent } from "@tiptap/core";
import type { RecipeDetail } from "../api.js";

/**
 * Convert raw Cooklang text (without metadata lines) into a TipTap JSON document.
 */
export function cooklangToTiptapDoc(content: string): JSONContent {
	const blocks = content.split(/\n\n+/).filter(Boolean);
	const sectionRegex = /^=+\s*(.*?)(?:\s*=+)?$/;

	return {
		type: "doc",
		content: blocks.map((block) => {
			const trimmed = block.trim();
			const sectionMatch = trimmed.match(sectionRegex);
			if (sectionMatch) {
				return {
					type: "heading",
					attrs: { level: 2 },
					content: [{ type: "text", text: sectionMatch[1].trim() }],
				};
			}
			if (trimmed.startsWith(">") && !trimmed.startsWith(">>")) {
				const noteContent = trimmed.slice(1).trim();
				return {
					type: "note",
					content: parseCooklangTokens(noteContent),
				};
			}
			return {
				type: "paragraph",
				content: parseCooklangTokens(trimmed.replace(/\n/g, " ")),
			};
		}),
	};
}

function parseCooklangTokens(text: string): JSONContent[] {
	const nodes: JSONContent[] = [];
	let i = 0;
	let buffer = "";

	function flushBuffer() {
		if (buffer) {
			nodes.push({ type: "text", text: buffer });
			buffer = "";
		}
	}

	while (i < text.length) {
		const ch = text[i];

		// Block comment: [-
		if (ch === "[" && i + 1 < text.length && text[i + 1] === "-") {
			flushBuffer();
			const closeIdx = text.indexOf("-]", i + 2);
			if (closeIdx !== -1) {
				const value = text.substring(i + 2, closeIdx).trim();
				nodes.push({ type: "comment", attrs: { value } });
				i = closeIdx + 2;
				continue;
			}
		}

		// Inline comment: --
		if (ch === "-" && i + 1 < text.length && text[i + 1] === "-") {
			flushBuffer();
			const value = text.substring(i + 2).trim();
			nodes.push({ type: "comment", attrs: { value } });
			i = text.length;
			continue;
		}

		if (ch === "@" || ch === "#" || ch === "~") {
			flushBuffer();
			const result = parseToken(text, i);
			if (result) {
				nodes.push(result.node);
				i = result.end;
				continue;
			}
		}

		buffer += ch;
		i++;
	}

	flushBuffer();
	return nodes;
}

function parseToken(
	text: string,
	start: number,
): { node: JSONContent; end: number } | null {
	const trigger = text[start];
	let i = start + 1;

	// Read name until { or whitespace or end
	let name = "";
	while (i < text.length && text[i] !== "{" && !/\s/.test(text[i])) {
		name += text[i];
		i++;
	}

	if (text[i] === "{") {
		// Parse braces content
		const braceStart = i + 1;
		let braceEnd = text.indexOf("}", braceStart);
		if (braceEnd === -1) braceEnd = text.length;
		const braceContent = text.slice(braceStart, braceEnd);
		const end = braceEnd + 1;

		if (trigger === "@") {
			if (name.startsWith("./")) {
				const parts = braceContent.split("%");
				const amount = parts[0] ?? "";
				const unit = parts[1] ?? "";
				return {
					node: {
						type: "recipeRef",
						attrs: { ref: name, amount, unit },
					},
					end,
				};
			}
			let raw = braceContent;
			let fixed = false;
			if (raw.startsWith("=")) {
				fixed = true;
				raw = raw.substring(1);
			}
			const parts = raw.split("%");
			const amount = parts[0] ?? "";
			const unit = parts[1] ?? "";
			let preparation = "";
			let finalEnd = end;
			if (end < text.length && text[end] === "(") {
				const closeIdx = text.indexOf(")", end + 1);
				if (closeIdx !== -1) {
					preparation = text.substring(end + 1, closeIdx).trim();
					finalEnd = closeIdx + 1;
				}
			}
			return {
				node: {
					type: "ingredient",
					attrs: { name, amount, unit, preparation, fixed },
				},
				end: finalEnd,
			};
		}

		if (trigger === "~") {
			const parts = braceContent.split("%");
			const duration = parts[0] ?? "";
			const unit = parts[1] ?? "";
			return {
				node: {
					type: "timer",
					attrs: { name, duration, unit },
				},
				end,
			};
		}

		if (trigger === "#") {
			return {
				node: {
					type: "equipment",
					attrs: { name },
				},
				end,
			};
		}
	}

	// No braces: single-word token
	if (name) {
		if (trigger === "@") {
			if (name.startsWith("./")) {
				return {
					node: {
						type: "recipeRef",
						attrs: { ref: name, amount: "", unit: "" },
					},
					end: i,
				};
			}
			return {
				node: {
					type: "ingredient",
					attrs: { name, amount: "", unit: "", preparation: "", fixed: false },
				},
				end: i,
			};
		}
		if (trigger === "#") {
			return {
				node: {
					type: "equipment",
					attrs: { name },
				},
				end: i,
			};
		}
		if (trigger === "~") {
			return {
				node: {
					type: "timer",
					attrs: { name, duration: "", unit: "" },
				},
				end: i,
			};
		}
	}

	return null;
}

/**
 * Convert a TipTap JSON document back to Cooklang text format.
 */
export function tiptapDocToCooklang(doc: JSONContent): string {
	if (!doc.content) return "";

	return doc.content
		.map((node) => {
			if (node.type === "heading") {
				const text = node.content?.map((c) => c.text ?? "").join("") ?? "";
				return `= ${text}`;
			}
			if (!node.content) return "";
			const inner = node.content
				.map((child) => {
					if (child.type === "text") return child.text ?? "";
					if (child.type === "ingredient") {
						const { name, amount, unit, preparation, fixed } =
							child.attrs ?? {};
						let result: string;
						const prefix = fixed ? "=" : "";
						if (!amount && !unit && !fixed) result = `@${name}`;
						else if (unit) result = `@${name}{${prefix}${amount}%${unit}}`;
						else result = `@${name}{${prefix}${amount}}`;
						if (preparation) result += `(${preparation})`;
						return result;
					}
					if (child.type === "timer") {
						const { name, duration, unit } = child.attrs ?? {};
						if (name) return `~${name}{${duration}%${unit}}`;
						return `~{${duration}%${unit}}`;
					}
					if (child.type === "equipment") {
						const { name } = child.attrs ?? {};
						if (name?.includes(" ")) return `#${name}{}`;
						return `#${name}`;
					}
					if (child.type === "comment") {
						const { value } = child.attrs ?? {};
						return `[- ${value} -]`;
					}
					if (child.type === "recipeRef") {
						const { ref, amount, unit } = child.attrs ?? {};
						if (!amount && !unit) return `@${ref}`;
						return `@${ref}{${amount}%${unit}}`;
					}
					return "";
				})
				.join("");
			if (node.type === "note") {
				return `> ${inner}`;
			}
			return inner;
		})
		.join("\n\n");
}

type Token =
	RecipeDetail["sections"][number]["steps"][number]["tokens"][number];

/**
 * Convert API step tokens into TipTap JSON content nodes for a paragraph.
 */
function tokenToTiptapNode(token: Token): JSONContent {
	switch (token.type) {
		case "text":
			return { type: "text", text: token.value };
		case "ingredient":
			return {
				type: "ingredient",
				attrs: {
					name: token.name,
					amount: token.amount,
					unit: token.unit,
					preparation: token.preparation,
					fixed: token.fixed ?? false,
				},
			};
		case "timer":
			return {
				type: "timer",
				attrs: {
					name: token.name,
					duration: token.duration,
					unit: token.unit,
				},
			};
		case "equipment":
			return {
				type: "equipment",
				attrs: { name: token.name },
			};
		case "inlineComment":
		case "blockComment":
			return {
				type: "comment",
				attrs: { value: token.value },
			};
		case "recipeRef":
			return {
				type: "recipeRef",
				attrs: {
					ref: token.ref,
					amount: token.amount,
					unit: token.unit,
				},
			};
		default:
			return { type: "text", text: "" };
	}
}

/**
 * Convert an API RecipeDetail's sections array into a TipTap JSON document.
 */
export function sectionsToTiptapDoc(
	sections: RecipeDetail["sections"],
): JSONContent {
	const content: JSONContent[] = [];

	for (const section of sections) {
		if (section.name) {
			content.push({
				type: "heading",
				attrs: { level: 2 },
				content: [{ type: "text", text: section.name }],
			});
		}
		for (const step of section.steps) {
			content.push({
				type: step.isNote ? "note" : "paragraph",
				content: step.tokens.map(tokenToTiptapNode),
			});
		}
	}

	return { type: "doc", content };
}

/**
 * Build the full Cooklang file content from metadata and TipTap doc.
 */
export function buildCooklangFile(
	metadata: Record<string, string>,
	doc: JSONContent,
): string {
	const metaLines = Object.entries(metadata)
		.filter(([, value]) => value.trim() !== "")
		.map(([key, value]) => `>> ${key}: ${value}`);

	const steps = tiptapDocToCooklang(doc);

	if (metaLines.length === 0) return steps;
	return `${metaLines.join("\n")}\n\n${steps}`;
}

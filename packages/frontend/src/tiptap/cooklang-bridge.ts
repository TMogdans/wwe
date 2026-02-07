import type { JSONContent } from "@tiptap/core";
import type { RecipeDetail } from "../api.js";

/**
 * Convert raw Cooklang text (without metadata lines) into a TipTap JSON document.
 */
export function cooklangToTiptapDoc(content: string): JSONContent {
	const paragraphs = content.split(/\n\n+/).filter(Boolean);

	return {
		type: "doc",
		content: paragraphs.map((para) => ({
			type: "paragraph",
			content: parseCooklangTokens(para.replace(/\n/g, " ")),
		})),
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
			const parts = braceContent.split("%");
			const amount = parts[0] ?? "";
			const unit = parts[1] ?? "";
			return {
				node: {
					type: "ingredient",
					attrs: { name, amount, unit },
				},
				end,
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
			return {
				node: {
					type: "ingredient",
					attrs: { name, amount: "", unit: "" },
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
		.map((paragraph) => {
			if (!paragraph.content) return "";
			return paragraph.content
				.map((node) => {
					if (node.type === "text") return node.text ?? "";
					if (node.type === "ingredient") {
						const { name, amount, unit } = node.attrs ?? {};
						if (!amount && !unit) return `@${name}`;
						if (unit) return `@${name}{${amount}%${unit}}`;
						return `@${name}{${amount}}`;
					}
					if (node.type === "timer") {
						const { name, duration, unit } = node.attrs ?? {};
						if (name) return `~${name}{${duration}%${unit}}`;
						return `~{${duration}%${unit}}`;
					}
					if (node.type === "equipment") {
						const { name } = node.attrs ?? {};
						if (name?.includes(" ")) return `#${name}{}`;
						return `#${name}`;
					}
					return "";
				})
				.join("");
		})
		.join("\n\n");
}

type Token = RecipeDetail["steps"][number]["tokens"][number];

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
				attrs: { name: token.name, amount: token.amount, unit: token.unit },
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
		default:
			return { type: "text", text: "" };
	}
}

/**
 * Convert an API RecipeDetail's steps array into a TipTap JSON document.
 */
export function stepsToTiptapDoc(steps: RecipeDetail["steps"]): JSONContent {
	return {
		type: "doc",
		content: steps.map((step) => ({
			type: "paragraph",
			content: step.tokens.map(tokenToTiptapNode),
		})),
	};
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

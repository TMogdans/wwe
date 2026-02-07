import { Node, mergeAttributes } from "@tiptap/core";
import { ReactNodeViewRenderer } from "@tiptap/react";
import { IngredientComponent } from "./ingredient-component.js";

declare module "@tiptap/core" {
	interface Commands<ReturnType> {
		ingredient: {
			insertIngredient: (attrs: {
				name: string;
				amount: string;
				unit: string;
			}) => ReturnType;
		};
	}
}

export const IngredientExtension = Node.create({
	name: "ingredient",
	group: "inline",
	inline: true,
	atom: true,

	addAttributes() {
		return {
			name: { default: "" },
			amount: { default: "" },
			unit: { default: "" },
		};
	},

	parseHTML() {
		return [{ tag: 'span[data-type="ingredient"]' }];
	},

	renderHTML({ HTMLAttributes }) {
		return [
			"span",
			mergeAttributes(HTMLAttributes, {
				"data-type": "ingredient",
				class: "ingredient-chip",
			}),
		];
	},

	addNodeView() {
		return ReactNodeViewRenderer(IngredientComponent);
	},

	addCommands() {
		return {
			insertIngredient:
				(attrs: { name: string; amount: string; unit: string }) =>
				({ commands }) => {
					return commands.insertContent({
						type: this.name,
						attrs,
					});
				},
		};
	},
});

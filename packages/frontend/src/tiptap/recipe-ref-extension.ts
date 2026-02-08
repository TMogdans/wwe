import { Node, mergeAttributes } from "@tiptap/core";
import { ReactNodeViewRenderer } from "@tiptap/react";
import { RecipeRefComponent } from "./recipe-ref-component.js";

declare module "@tiptap/core" {
	interface Commands<ReturnType> {
		recipeRef: {
			insertRecipeRef: (attrs: {
				ref: string;
				amount: string;
				unit: string;
			}) => ReturnType;
		};
	}
}

export const RecipeRefExtension = Node.create({
	name: "recipeRef",
	group: "inline",
	inline: true,
	atom: true,

	addAttributes() {
		return {
			ref: { default: "" },
			amount: { default: "" },
			unit: { default: "" },
		};
	},

	parseHTML() {
		return [{ tag: 'span[data-type="recipe-ref"]' }];
	},

	renderHTML({ HTMLAttributes }) {
		return [
			"span",
			mergeAttributes(HTMLAttributes, {
				"data-type": "recipe-ref",
				class: "recipe-ref-chip",
			}),
		];
	},

	addNodeView() {
		return ReactNodeViewRenderer(RecipeRefComponent);
	},

	addCommands() {
		return {
			insertRecipeRef:
				(attrs: { ref: string; amount: string; unit: string }) =>
				({ commands }) => {
					return commands.insertContent({
						type: this.name,
						attrs,
					});
				},
		};
	},
});

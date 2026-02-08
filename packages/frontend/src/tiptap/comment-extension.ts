import { Node, mergeAttributes } from "@tiptap/core";
import { ReactNodeViewRenderer } from "@tiptap/react";
import { CommentComponent } from "./comment-component.js";

declare module "@tiptap/core" {
	interface Commands<ReturnType> {
		comment: {
			insertComment: (attrs: { value: string }) => ReturnType;
		};
	}
}

export const CommentExtension = Node.create({
	name: "comment",
	group: "inline",
	inline: true,
	atom: true,

	addAttributes() {
		return {
			value: { default: "" },
		};
	},

	parseHTML() {
		return [{ tag: 'span[data-type="comment"]' }];
	},

	renderHTML({ HTMLAttributes }) {
		return [
			"span",
			mergeAttributes(HTMLAttributes, {
				"data-type": "comment",
				class: "comment-chip",
			}),
		];
	},

	addNodeView() {
		return ReactNodeViewRenderer(CommentComponent);
	},

	addCommands() {
		return {
			insertComment:
				(attrs: { value: string }) =>
				({ commands }) => {
					return commands.insertContent({
						type: this.name,
						attrs,
					});
				},
		};
	},
});

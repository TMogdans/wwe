import { Node, mergeAttributes } from "@tiptap/core";
import { ReactNodeViewRenderer } from "@tiptap/react";
import { NoteComponent } from "./note-component.js";

declare module "@tiptap/core" {
	interface Commands<ReturnType> {
		note: {
			setNote: () => ReturnType;
		};
	}
}

export const NoteExtension = Node.create({
	name: "note",
	group: "block",
	content: "inline*",

	parseHTML() {
		return [{ tag: 'div[data-type="note"]' }];
	},

	renderHTML({ HTMLAttributes }) {
		return [
			"div",
			mergeAttributes(HTMLAttributes, {
				"data-type": "note",
				class: "note-block",
			}),
			0,
		];
	},

	addNodeView() {
		return ReactNodeViewRenderer(NoteComponent);
	},

	addCommands() {
		return {
			setNote:
				() =>
				({ commands }) => {
					return commands.setNode(this.name);
				},
		};
	},
});

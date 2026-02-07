import { Node, mergeAttributes } from "@tiptap/core";
import { ReactNodeViewRenderer } from "@tiptap/react";
import { EquipmentComponent } from "./equipment-component.js";

declare module "@tiptap/core" {
	interface Commands<ReturnType> {
		equipment: {
			insertEquipment: (attrs: { name: string }) => ReturnType;
		};
	}
}

export const EquipmentExtension = Node.create({
	name: "equipment",
	group: "inline",
	inline: true,
	atom: true,

	addAttributes() {
		return {
			name: { default: "" },
		};
	},

	parseHTML() {
		return [{ tag: 'span[data-type="equipment"]' }];
	},

	renderHTML({ HTMLAttributes }) {
		return [
			"span",
			mergeAttributes(HTMLAttributes, {
				"data-type": "equipment",
				class: "equipment-chip",
			}),
		];
	},

	addNodeView() {
		return ReactNodeViewRenderer(EquipmentComponent);
	},

	addCommands() {
		return {
			insertEquipment:
				(attrs: { name: string }) =>
				({ commands }) => {
					return commands.insertContent({
						type: this.name,
						attrs,
					});
				},
		};
	},
});

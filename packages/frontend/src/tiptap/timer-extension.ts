import { Node, mergeAttributes } from "@tiptap/core";
import { ReactNodeViewRenderer } from "@tiptap/react";
import { TimerComponent } from "./timer-component.js";

declare module "@tiptap/core" {
	interface Commands<ReturnType> {
		timer: {
			insertTimer: (attrs: {
				name: string;
				duration: string;
				unit: string;
			}) => ReturnType;
		};
	}
}

export const TimerExtension = Node.create({
	name: "timer",
	group: "inline",
	inline: true,
	atom: true,

	addAttributes() {
		return {
			name: { default: "" },
			duration: { default: "" },
			unit: { default: "" },
		};
	},

	parseHTML() {
		return [{ tag: 'span[data-type="timer"]' }];
	},

	renderHTML({ HTMLAttributes }) {
		return [
			"span",
			mergeAttributes(HTMLAttributes, {
				"data-type": "timer",
				class: "timer-chip",
			}),
		];
	},

	addNodeView() {
		return ReactNodeViewRenderer(TimerComponent);
	},

	addCommands() {
		return {
			insertTimer:
				(attrs: { name: string; duration: string; unit: string }) =>
				({ commands }) => {
					return commands.insertContent({
						type: this.name,
						attrs,
					});
				},
		};
	},
});

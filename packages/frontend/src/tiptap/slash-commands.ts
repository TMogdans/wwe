import { Extension, InputRule } from "@tiptap/core";

export const SlashCommands = Extension.create({
	name: "slashCommands",

	addInputRules() {
		return [
			new InputRule({
				find: /\/zutat\s$/,
				handler: ({ state, range, chain }) => {
					chain()
						.deleteRange(range)
						.insertIngredient({ name: "", amount: "", unit: "" })
						.run();
				},
			}),
			new InputRule({
				find: /\/timer\s$/,
				handler: ({ state, range, chain }) => {
					chain()
						.deleteRange(range)
						.insertTimer({ name: "", duration: "", unit: "" })
						.run();
				},
			}),
			new InputRule({
				find: /\/equipment\s$/,
				handler: ({ state, range, chain }) => {
					chain().deleteRange(range).insertEquipment({ name: "" }).run();
				},
			}),
		];
	},
});

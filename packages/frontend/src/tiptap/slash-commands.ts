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
						.insertIngredient({
							name: "",
							amount: "",
							unit: "",
							preparation: "",
						})
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
			new InputRule({
				find: /\/kommentar\s$/,
				handler: ({ state, range, chain }) => {
					chain().deleteRange(range).insertComment({ value: "" }).run();
				},
			}),
			new InputRule({
				find: /\/notiz\s$/,
				handler: ({ state, range, chain }) => {
					chain().deleteRange(range).setNote().run();
				},
			}),
			new InputRule({
				find: /\/rezept\s$/,
				handler: ({ state, range, chain }) => {
					chain()
						.deleteRange(range)
						.insertRecipeRef({ ref: "./", amount: "", unit: "" })
						.run();
				},
			}),
		];
	},
});

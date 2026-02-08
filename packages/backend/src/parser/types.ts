export interface CooklangMetadata {
	[key: string]: string;
}

export interface CooklangIngredient {
	type: "ingredient";
	name: string;
	amount: string;
	unit: string;
	preparation: string;
	fixed?: boolean;
}

export interface CooklangTimer {
	type: "timer";
	name: string;
	duration: string;
	unit: string;
}

export interface CooklangEquipment {
	type: "equipment";
	name: string;
}

export interface CooklangText {
	type: "text";
	value: string;
}

export interface CooklangInlineComment {
	type: "inlineComment";
	value: string;
}

export interface CooklangBlockComment {
	type: "blockComment";
	value: string;
}

export interface CooklangRecipeRef {
	type: "recipeRef";
	ref: string;
	amount: string;
	unit: string;
}

export type CooklangToken =
	| CooklangIngredient
	| CooklangTimer
	| CooklangEquipment
	| CooklangText
	| CooklangInlineComment
	| CooklangBlockComment
	| CooklangRecipeRef;

export interface CooklangStep {
	tokens: CooklangToken[];
	isNote?: boolean;
}

export interface CooklangSection {
	name: string;
	steps: CooklangStep[];
}

export interface CooklangRecipe {
	metadata: CooklangMetadata;
	sections: CooklangSection[];
}

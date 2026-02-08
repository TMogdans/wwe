export interface CooklangMetadata {
	[key: string]: string;
}

export interface CooklangIngredient {
	type: "ingredient";
	name: string;
	amount: string;
	unit: string;
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

export type CooklangToken =
	| CooklangIngredient
	| CooklangTimer
	| CooklangEquipment
	| CooklangText
	| CooklangInlineComment
	| CooklangBlockComment;

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

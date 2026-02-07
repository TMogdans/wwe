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

export type CooklangToken =
	| CooklangIngredient
	| CooklangTimer
	| CooklangEquipment
	| CooklangText;

export interface CooklangStep {
	tokens: CooklangToken[];
}

export interface CooklangRecipe {
	metadata: CooklangMetadata;
	steps: CooklangStep[];
}

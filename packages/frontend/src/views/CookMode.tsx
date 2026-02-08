import { useCallback, useEffect, useRef, useState } from "react";
import { type RecipeDetail, fetchRecipe } from "../api.js";
import "../styles/cook-mode.css";

interface CookModeProps {
	slug: string;
	portionen?: number;
}

type Token =
	RecipeDetail["sections"][number]["steps"][number]["tokens"][number];

type CookStep = {
	sectionName: string;
	tokens: RecipeDetail["sections"][number]["steps"][number]["tokens"];
	isFirstInSection: boolean;
};

function flattenSections(sections: RecipeDetail["sections"]): CookStep[] {
	const result: CookStep[] = [];
	for (const section of sections) {
		let isFirst = true;
		for (let i = 0; i < section.steps.length; i++) {
			if (section.steps[i].isNote) continue;
			result.push({
				sectionName: section.name,
				tokens: section.steps[i].tokens,
				isFirstInSection: isFirst && section.name !== "",
			});
			isFirst = false;
		}
	}
	return result;
}

const SWIPE_THRESHOLD = 50;
const MAX_FONT_SIZE = 32;
const MIN_FONT_SIZE = 14;

function tokenKey(token: Token, index: number): string {
	switch (token.type) {
		case "text":
			return `text-${index}-${token.value.slice(0, 20)}`;
		case "ingredient":
			return `ing-${index}-${token.name}`;
		case "timer":
			return `timer-${index}-${token.duration}-${token.unit}`;
		case "equipment":
			return `equip-${index}-${token.name}`;
		default:
			return `unknown-${index}`;
	}
}

function scaleAmount(amount: string, scale: number): string {
	if (!amount) return "";
	const num = Number(amount);
	if (!Number.isNaN(num)) {
		const scaled = num * scale;
		return scaled % 1 === 0 ? String(scaled) : scaled.toFixed(1);
	}
	const fractionMatch = amount.match(/^(\d+)\/(\d+)$/);
	if (fractionMatch) {
		const decimal = Number(fractionMatch[1]) / Number(fractionMatch[2]);
		const scaled = decimal * scale;
		return scaled % 1 === 0 ? String(scaled) : scaled.toFixed(1);
	}
	return amount;
}

function renderToken(token: Token, index: number, scale: number) {
	const key = tokenKey(token, index);
	switch (token.type) {
		case "text":
			return <span key={key}>{token.value}</span>;
		case "ingredient":
			return (
				<span key={key} className="token-ingredient">
					{token.amount ? `${scaleAmount(token.amount, scale)} ` : ""}
					{token.unit ? `${token.unit} ` : ""}
					{token.name}
				</span>
			);
		case "timer":
			return (
				<span key={key} className="token-timer">
					{token.duration} {token.unit}
				</span>
			);
		case "equipment":
			return (
				<span key={key} className="token-equipment">
					{token.name}
				</span>
			);
		default:
			return null;
	}
}

function useFitText(deps: unknown[]) {
	const containerRef = useRef<HTMLDivElement>(null);
	const textRef = useRef<HTMLParagraphElement>(null);

	useEffect(() => {
		const container = containerRef.current;
		const text = textRef.current;
		if (!container || !text) return;

		let size = MAX_FONT_SIZE;
		text.style.fontSize = `${size}px`;

		while (text.scrollHeight > container.clientHeight && size > MIN_FONT_SIZE) {
			size -= 1;
			text.style.fontSize = `${size}px`;
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, deps);

	return { containerRef, textRef };
}

function parseServings(value: string | undefined): number {
	if (!value) return 4;
	const match = value.match(/^(\d+)/);
	return match ? Number(match[1]) : 4;
}

export function CookMode({ slug, portionen }: CookModeProps) {
	const [recipe, setRecipe] = useState<RecipeDetail | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [currentStep, setCurrentStep] = useState(0);
	const touchStartX = useRef(0);

	const { containerRef, textRef } = useFitText([currentStep, recipe]);

	useEffect(() => {
		setRecipe(null);
		setError(null);
		setCurrentStep(0);
		fetchRecipe(slug)
			.then(setRecipe)
			.catch(() => setError("Rezept konnte nicht geladen werden."));
	}, [slug]);

	const flatSteps = recipe ? flattenSections(recipe.sections) : [];
	const totalSteps = flatSteps.length;
	const isFirstStep = currentStep === 0;
	const isLastStep = currentStep === totalSteps - 1;

	const handleBack = useCallback(() => {
		if (!isFirstStep) {
			setCurrentStep((prev) => prev - 1);
		}
	}, [isFirstStep]);

	const handleNext = useCallback(() => {
		if (isLastStep) {
			window.location.hash = `/rezept/${slug}`;
		} else {
			setCurrentStep((prev) => prev + 1);
		}
	}, [isLastStep, slug]);

	function handleTouchStart(e: React.TouchEvent) {
		touchStartX.current = e.touches[0].clientX;
	}

	function handleTouchEnd(e: React.TouchEvent) {
		const diff = e.changedTouches[0].clientX - touchStartX.current;
		if (diff > SWIPE_THRESHOLD) {
			handleBack();
		} else if (diff < -SWIPE_THRESHOLD) {
			handleNext();
		}
	}

	const backUrl = `#/rezept/${slug}`;

	if (error) {
		return (
			<div className="cook-mode">
				<div className="cook-mode__header">
					<span>Fehler</span>
					<a href={backUrl} className="cook-mode__close">
						&times;
					</a>
				</div>
				<div className="cook-mode__step">
					<p>{error}</p>
				</div>
			</div>
		);
	}

	if (!recipe) {
		return (
			<div className="cook-mode">
				<div className="cook-mode__header">
					<span>Lade Rezept...</span>
				</div>
				<div className="cook-mode__step">
					<p>Lade Rezept...</p>
				</div>
			</div>
		);
	}

	const baseServings = parseServings(recipe.metadata.servings);
	const scale = portionen ? portionen / baseServings : 1;

	const progressPercent =
		totalSteps > 1 ? ((currentStep + 1) / totalSteps) * 100 : 100;
	const step = flatSteps[currentStep];

	return (
		<div
			className="cook-mode"
			onTouchStart={handleTouchStart}
			onTouchEnd={handleTouchEnd}
		>
			<div className="cook-mode__header">
				<span>
					Schritt {currentStep + 1} von {totalSteps} &ndash;{" "}
					{step.sectionName ? `${step.sectionName} \u2013 ` : ""}
					{recipe.name}
				</span>
				<a href={backUrl} className="cook-mode__close">
					&times;
				</a>
			</div>
			<div className="cook-mode__progress">
				<div
					className="cook-mode__progress-bar"
					style={{ width: `${progressPercent}%` }}
				/>
			</div>
			<div className="cook-mode__step" ref={containerRef}>
				<p ref={textRef}>
					{step.tokens.map((token, i) => renderToken(token, i, scale))}
				</p>
			</div>
			<div className="cook-mode__nav">
				<button type="button" onClick={handleBack} disabled={isFirstStep}>
					Zurueck
				</button>
				<button type="button" className="primary" onClick={handleNext}>
					{isLastStep ? "Fertig" : "Weiter"}
				</button>
			</div>
		</div>
	);
}

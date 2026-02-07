import { useCallback, useEffect, useRef, useState } from "react";
import { type RecipeDetail, fetchRecipe } from "../api.js";
import "../styles/cook-mode.css";

interface CookModeProps {
	slug: string;
}

type Token = RecipeDetail["steps"][number]["tokens"][number];

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

function renderToken(token: Token, index: number) {
	const key = tokenKey(token, index);
	switch (token.type) {
		case "text":
			return <span key={key}>{token.value}</span>;
		case "ingredient":
			return (
				<span key={key} className="token-ingredient">
					{token.amount ? `${token.amount} ` : ""}
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

export function CookMode({ slug }: CookModeProps) {
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

	const totalSteps = recipe?.steps.length ?? 0;
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

	const progressPercent =
		totalSteps > 1 ? ((currentStep + 1) / totalSteps) * 100 : 100;
	const step = recipe.steps[currentStep];

	return (
		<div
			className="cook-mode"
			onTouchStart={handleTouchStart}
			onTouchEnd={handleTouchEnd}
		>
			<div className="cook-mode__header">
				<span>
					Schritt {currentStep + 1} von {totalSteps} &ndash; {recipe.name}
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
					{step.tokens.map((token, i) => renderToken(token, i))}
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

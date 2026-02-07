import { useEffect, useState } from "react";
import { type RecipeDetail, fetchRecipe } from "../api.js";
import "../styles/cook-mode.css";

interface CookModeProps {
	slug: string;
}

type Token = RecipeDetail["steps"][number]["tokens"][number];

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

export function CookMode({ slug }: CookModeProps) {
	const [recipe, setRecipe] = useState<RecipeDetail | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [currentStep, setCurrentStep] = useState(0);

	useEffect(() => {
		setRecipe(null);
		setError(null);
		setCurrentStep(0);
		fetchRecipe(slug)
			.then(setRecipe)
			.catch(() => setError("Rezept konnte nicht geladen werden."));
	}, [slug]);

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

	const totalSteps = recipe.steps.length;
	const isFirstStep = currentStep === 0;
	const isLastStep = currentStep === totalSteps - 1;
	const progressPercent =
		totalSteps > 1 ? ((currentStep + 1) / totalSteps) * 100 : 100;

	const step = recipe.steps[currentStep];

	function handleBack() {
		if (!isFirstStep) {
			setCurrentStep((prev) => prev - 1);
		}
	}

	function handleNext() {
		if (isLastStep) {
			window.location.hash = `/rezept/${slug}`;
		} else {
			setCurrentStep((prev) => prev + 1);
		}
	}

	return (
		<div className="cook-mode">
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
			<div className="cook-mode__step">
				<p>{step.tokens.map((token, i) => renderToken(token, i))}</p>
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

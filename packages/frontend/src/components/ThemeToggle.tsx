import { useTheme } from "../hooks/useTheme.js";
import "../styles/theme-toggle.css";

const THEME_ICONS = {
	light: "☀️",
	dark: "🌙",
	system: "💻",
};

const THEME_LABELS = {
	light: "Light Mode",
	dark: "Dark Mode",
	system: "System Theme",
};

export function ThemeToggle() {
	const { theme, setTheme } = useTheme();

	const cycleTheme = () => {
		const cycle = {
			system: "light",
			light: "dark",
			dark: "system",
		} as const;

		const nextTheme = cycle[theme as keyof typeof cycle];
		if (nextTheme) {
			setTheme(nextTheme);
		}
	};

	return (
		<button
			type="button"
			className="theme-toggle"
			onClick={cycleTheme}
			aria-label={`Current theme: ${THEME_LABELS[theme]}. Click to change.`}
			title={THEME_LABELS[theme]}
		>
			<span className="theme-toggle__icon" aria-hidden="true">
				{THEME_ICONS[theme]}
			</span>
			<span className="theme-toggle__label">{theme}</span>
		</button>
	);
}

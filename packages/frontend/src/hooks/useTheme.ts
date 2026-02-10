import { useEffect, useState } from "react";

export type Theme = "light" | "dark" | "system";
type ResolvedTheme = "light" | "dark";

const STORAGE_KEY = "theme-preference";

function getSystemTheme(): ResolvedTheme {
	if (typeof window === "undefined") return "light";
	return window.matchMedia("(prefers-color-scheme: dark)").matches
		? "dark"
		: "light";
}

function getStoredTheme(): Theme | null {
	if (typeof window === "undefined") return null;
	const stored = localStorage.getItem(STORAGE_KEY);
	if (stored === "light" || stored === "dark" || stored === "system") {
		return stored;
	}
	return null;
}

function resolveTheme(theme: Theme): ResolvedTheme {
	if (theme === "system") {
		return getSystemTheme();
	}
	return theme;
}

export function useTheme() {
	const [theme, setThemeState] = useState<Theme>(() => {
		return getStoredTheme() ?? "system";
	});
	const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>(() =>
		resolveTheme(theme),
	);

	// Update data-theme attribute when theme changes
	useEffect(() => {
		const resolved = resolveTheme(theme);
		setResolvedTheme(resolved);
		document.documentElement.setAttribute("data-theme", resolved);
	}, [theme]);

	// Listen to system theme changes when theme is "system"
	useEffect(() => {
		if (theme !== "system") return;

		const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
		const handleChange = (event: MediaQueryListEvent) => {
			const resolved = event.matches ? "dark" : "light";
			setResolvedTheme(resolved);
			document.documentElement.setAttribute("data-theme", resolved);
		};

		mediaQuery.addEventListener("change", handleChange);
		return () => mediaQuery.removeEventListener("change", handleChange);
	}, [theme]);

	const setTheme = (newTheme: Theme) => {
		setThemeState(newTheme);
		setResolvedTheme(resolveTheme(newTheme));
		localStorage.setItem(STORAGE_KEY, newTheme);
	};

	return { theme, resolvedTheme, setTheme };
}

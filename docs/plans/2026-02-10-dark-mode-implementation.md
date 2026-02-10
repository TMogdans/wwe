# Dark Mode Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Implement dark mode with automatic system detection and manual toggle for the WWE recipe app.

**Architecture:** CSS Custom Properties with theme-specific values, React hook for theme state management with localStorage persistence, and a floating toggle button. System preference detection via prefers-color-scheme media query with manual override capability.

**Tech Stack:** React 19, TypeScript, CSS Custom Properties, localStorage API, matchMedia API

---

## Task 1: Create Dark Mode CSS Variables

**Files:**
- Create: `packages/frontend/src/styles/themes.css`
- Modify: `packages/frontend/src/styles/variables.css`
- Modify: `packages/frontend/src/styles/global.css:1`

**Step 1: Create themes.css with dark mode variables**

Create `packages/frontend/src/styles/themes.css`:

```css
/* Light theme (default) */
:root {
	--color-bg-light: #fafaf9;
	--color-surface-light: #ffffff;
	--color-text-light: #1c1917;
	--color-border-light: #d6d3d1;
	--color-ingredient-light: #ea580c;
	--color-equipment-light: #2563eb;
	--color-timer-light: #059669;
	--color-comment-light: #78716c;
	--color-primary-light: #ea580c;
}

/* Dark theme */
:root {
	--color-bg-dark: #1c1917;
	--color-surface-dark: #292524;
	--color-text-dark: #fafaf9;
	--color-border-dark: #44403c;
	--color-ingredient-dark: #fb923c;
	--color-equipment-dark: #60a5fa;
	--color-timer-dark: #34d399;
	--color-comment-dark: #a8a29e;
	--color-primary-dark: #fb923c;
}

/* Apply light theme by default */
:root,
:root[data-theme="light"] {
	--color-bg: var(--color-bg-light);
	--color-surface: var(--color-surface-light);
	--color-text: var(--color-text-light);
	--color-border: var(--color-border-light);
	--color-ingredient: var(--color-ingredient-light);
	--color-equipment: var(--color-equipment-light);
	--color-timer: var(--color-timer-light);
	--color-comment: var(--color-comment-light);
	--color-primary: var(--color-primary-light);
}

/* Apply dark theme */
:root[data-theme="dark"] {
	--color-bg: var(--color-bg-dark);
	--color-surface: var(--color-surface-dark);
	--color-text: var(--color-text-dark);
	--color-border: var(--color-border-dark);
	--color-ingredient: var(--color-ingredient-dark);
	--color-equipment: var(--color-equipment-dark);
	--color-timer: var(--color-timer-dark);
	--color-comment: var(--color-comment-dark);
	--color-primary: var(--color-primary-dark);
}

/* System preference fallback */
@media (prefers-color-scheme: dark) {
	:root:not([data-theme]) {
		--color-bg: var(--color-bg-dark);
		--color-surface: var(--color-surface-dark);
		--color-text: var(--color-text-dark);
		--color-border: var(--color-border-dark);
		--color-ingredient: var(--color-ingredient-dark);
		--color-equipment: var(--color-equipment-dark);
		--color-timer: var(--color-timer-dark);
		--color-comment: var(--color-comment-dark);
		--color-primary: var(--color-primary-dark);
	}
}

/* Smooth transitions */
@media (prefers-reduced-motion: no-preference) {
	:root {
		transition: background-color 0.3s ease, color 0.3s ease;
	}
}
```

**Step 2: Update variables.css to keep only non-color tokens**

Modify `packages/frontend/src/styles/variables.css`:

```css
:root {
	--radius: 8px;
	--font-base: system-ui, -apple-system, sans-serif;
}
```

**Step 3: Import themes.css in global.css**

Modify `packages/frontend/src/styles/global.css` line 1:

```css
@import "./variables.css";
@import "./themes.css";

*,
*::before,
*::after {
	margin: 0;
	padding: 0;
	box-sizing: border-box;
}

body {
	font-family: var(--font-base);
	background: var(--color-bg);
	color: var(--color-text);
	line-height: 1.6;
	transition: background-color 0.3s ease, color 0.3s ease;
}

a {
	color: var(--color-primary);
	text-decoration: none;
}
```

**Step 4: Test CSS changes in browser**

1. Run `pnpm dev` in packages/frontend
2. Open browser dev tools
3. Manually add `data-theme="dark"` to `<html>` element
4. Verify background changes to dark
5. Remove `data-theme` attribute
6. Verify it reverts to light (or dark if system is dark)

**Step 5: Commit**

```bash
git add packages/frontend/src/styles/themes.css packages/frontend/src/styles/variables.css packages/frontend/src/styles/global.css
git commit -m "feat: add dark mode CSS variables and theme system

- Create themes.css with light/dark color tokens
- Refactor variables.css to only contain non-color tokens
- Import themes.css in global.css
- Add smooth transitions respecting prefers-reduced-motion
- Support data-theme attribute and prefers-color-scheme fallback"
```

---

## Task 2: Create useTheme Hook

**Files:**
- Create: `packages/frontend/src/hooks/useTheme.ts`

**Step 1: Create useTheme hook with type definitions**

Create `packages/frontend/src/hooks/useTheme.ts`:

```typescript
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

	const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>(() => {
		return resolveTheme(theme);
	});

	// Update resolved theme when theme changes
	useEffect(() => {
		const resolved = resolveTheme(theme);
		setResolvedTheme(resolved);
		document.documentElement.setAttribute("data-theme", resolved);
	}, [theme]);

	// Listen to system theme changes when in system mode
	useEffect(() => {
		if (theme !== "system") return;

		const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
		const handleChange = () => {
			const resolved = getSystemTheme();
			setResolvedTheme(resolved);
			document.documentElement.setAttribute("data-theme", resolved);
		};

		mediaQuery.addEventListener("change", handleChange);
		return () => mediaQuery.removeEventListener("change", handleChange);
	}, [theme]);

	const setTheme = (newTheme: Theme) => {
		setThemeState(newTheme);
		localStorage.setItem(STORAGE_KEY, newTheme);
	};

	return { theme, resolvedTheme, setTheme };
}
```

**Step 2: Test hook in browser console**

1. Import and use hook in App.tsx temporarily
2. Run `pnpm dev`
3. Open browser console
4. Verify `data-theme` attribute is set on `<html>`
5. Change system theme preference
6. Verify theme updates when in system mode
7. Remove temporary test code

**Step 3: Commit**

```bash
git add packages/frontend/src/hooks/useTheme.ts
git commit -m "feat: add useTheme hook for theme management

- Support light, dark, and system theme modes
- Persist preference in localStorage
- Listen to system theme changes
- Update data-theme attribute on html element"
```

---

## Task 3: Create ThemeToggle Component

**Files:**
- Create: `packages/frontend/src/components/ThemeToggle.tsx`
- Create: `packages/frontend/src/styles/theme-toggle.css`

**Step 1: Create ThemeToggle component**

Create `packages/frontend/src/components/ThemeToggle.tsx`:

```typescript
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
		const cycle: Record<string, "light" | "dark" | "system"> = {
			system: "light",
			light: "dark",
			dark: "system",
		};
		setTheme(cycle[theme]);
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
```

**Step 2: Create ThemeToggle styles**

Create `packages/frontend/src/styles/theme-toggle.css`:

```css
.theme-toggle {
	position: fixed;
	bottom: 20px;
	right: 20px;
	z-index: 1000;

	display: flex;
	align-items: center;
	gap: 8px;

	padding: 12px 16px;
	border: 1px solid var(--color-border);
	border-radius: var(--radius);
	background: var(--color-surface);
	color: var(--color-text);

	font-family: var(--font-base);
	font-size: 14px;
	font-weight: 500;

	cursor: pointer;
	box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);

	transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.theme-toggle:hover {
	transform: translateY(-2px);
	box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.theme-toggle:active {
	transform: translateY(0);
}

.theme-toggle:focus-visible {
	outline: 2px solid var(--color-primary);
	outline-offset: 2px;
}

.theme-toggle__icon {
	font-size: 18px;
	line-height: 1;
}

.theme-toggle__label {
	text-transform: capitalize;
	user-select: none;
}

@media (max-width: 640px) {
	.theme-toggle {
		bottom: 16px;
		right: 16px;
		padding: 10px 12px;
	}

	.theme-toggle__label {
		display: none;
	}
}

@media (prefers-reduced-motion: reduce) {
	.theme-toggle {
		transition: none;
	}
}
```

**Step 3: Test component rendering**

1. Import ThemeToggle in App.tsx
2. Add `<ThemeToggle />` before routing
3. Run `pnpm dev`
4. Verify button appears in bottom-right
5. Click button and verify theme cycles: system → light → dark → system
6. Verify localStorage updates
7. Reload page and verify theme persists

**Step 4: Commit**

```bash
git add packages/frontend/src/components/ThemeToggle.tsx packages/frontend/src/styles/theme-toggle.css
git commit -m "feat: add ThemeToggle floating button component

- Cycle through system/light/dark themes
- Show current mode with icon and label
- Floating bottom-right position
- Responsive design (hide label on mobile)
- Accessibility support with aria-label and focus styles"
```

---

## Task 4: Integrate ThemeToggle in App

**Files:**
- Modify: `packages/frontend/src/App.tsx`

**Step 1: Add ThemeToggle to App component**

Modify `packages/frontend/src/App.tsx`:

```typescript
import { useEffect, useState } from "react";
import "./styles/global.css";
import { ThemeToggle } from "./components/ThemeToggle.js";
import { CookMode } from "./views/CookMode.js";
import { RecipeDetail } from "./views/RecipeDetail.js";
import { RecipeEditor } from "./views/RecipeEditor.js";
import { RecipeOverview } from "./views/RecipeOverview.js";

function useHashRoute() {
	const [hash, setHash] = useState(window.location.hash.slice(1) || "/");

	useEffect(() => {
		const onHashChange = () => setHash(window.location.hash.slice(1) || "/");
		window.addEventListener("hashchange", onHashChange);
		return () => window.removeEventListener("hashchange", onHashChange);
	}, []);

	return hash;
}

export function App() {
	const route = useHashRoute();

	return (
		<>
			<ThemeToggle />
			{renderRoute(route)}
		</>
	);
}

function renderRoute(route: string) {
	if (route === "/" || route === "") {
		return <RecipeOverview />;
	}

	const cookMatch = route.match(/^\/rezept\/(.+)\/kochen(?:\?(.*))?$/);
	if (cookMatch) {
		const params = new URLSearchParams(cookMatch[2] ?? "");
		const portionen = params.get("portionen");
		return (
			<CookMode
				slug={decodeURIComponent(cookMatch[1])}
				portionen={portionen ? Number(portionen) : undefined}
			/>
		);
	}

	const editMatch = route.match(/^\/rezept\/(.+)\/bearbeiten$/);
	if (editMatch) {
		return <RecipeEditor slug={decodeURIComponent(editMatch[1])} />;
	}

	const detailMatch = route.match(/^\/rezept\/(.+)$/);
	if (detailMatch) {
		return <RecipeDetail slug={decodeURIComponent(detailMatch[1])} />;
	}

	if (route === "/neu") {
		return <RecipeEditor />;
	}

	return <div>404 – Seite nicht gefunden</div>;
}
```

**Step 2: Test in all views**

1. Run `pnpm dev`
2. Test in RecipeOverview (/)
3. Navigate to a recipe detail
4. Navigate to cook mode
5. Navigate to editor
6. Verify ThemeToggle works in all views
7. Verify theme persists across navigation

**Step 3: Commit**

```bash
git add packages/frontend/src/App.tsx
git commit -m "feat: integrate ThemeToggle in App component

- Add ThemeToggle as persistent component across all routes
- Refactor route rendering into separate function for clarity"
```

---

## Task 5: Manual Testing & Verification

**Step 1: Test theme switching**

1. Run `pnpm dev`
2. Click theme toggle through all modes
3. Verify smooth transitions
4. Verify icons and labels update correctly

**Step 2: Test localStorage persistence**

1. Set theme to "dark"
2. Reload page
3. Verify theme is still "dark"
4. Set to "system"
5. Reload and verify still "system"

**Step 3: Test system theme detection**

1. Set theme to "system"
2. Change OS theme (macOS: System Settings → Appearance)
3. Verify app theme updates automatically
4. Change back and verify again

**Step 4: Test in all views**

1. Navigate through all routes:
   - Overview (/)
   - Recipe detail (/rezept/slug)
   - Cook mode (/rezept/slug/kochen)
   - Editor (/neu and /rezept/slug/bearbeiten)
2. Verify dark mode looks good in each view
3. Check for any hardcoded colors that weren't converted

**Step 5: Test responsive design**

1. Open browser dev tools
2. Switch to mobile viewport (375px)
3. Verify toggle label is hidden
4. Verify button still works
5. Test on tablet size (768px)

**Step 6: Test accessibility**

1. Tab to theme toggle button
2. Verify focus outline is visible
3. Press Enter to activate
4. Verify theme changes
5. Use screen reader to verify aria-label

**Step 7: Document any issues**

Create a checklist of what was tested:

```markdown
## Dark Mode Testing Checklist

- [x] Theme toggle cycles through system/light/dark
- [x] localStorage persists theme preference
- [x] System theme detection works
- [x] Smooth transitions (unless prefers-reduced-motion)
- [x] Works in Overview
- [x] Works in Recipe Detail
- [x] Works in Cook Mode
- [x] Works in Editor
- [x] Responsive on mobile (label hidden)
- [x] Keyboard navigation works
- [x] Focus styles visible
- [x] Screen reader accessible
```

**Step 8: Run full test suite**

```bash
pnpm test
```

Expected: All tests pass (no regressions)

**Step 9: Final commit**

```bash
git commit --allow-empty -m "test: verify dark mode implementation

Manual testing completed:
- Theme switching works in all modes
- localStorage persistence verified
- System theme detection confirmed
- All views tested (Overview, Detail, Cook, Editor)
- Responsive design verified
- Accessibility tested"
```

---

## Completion

Once all tasks are complete:

1. Run `pnpm test` to ensure no regressions
2. Run `pnpm build` to verify production build works
3. Test the production build locally
4. Review the design document and verify all success criteria are met
5. Use @superpowers:finishing-a-development-branch to decide on merge/PR strategy

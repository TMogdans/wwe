# Screen Wake Lock Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Bildschirm bleibt aktiv, solange ein Rezept auf der Detail- oder Kochmodus-Seite geöffnet ist.

**Architecture:** Ein `useWakeLock`-Hook kapselt die Screen Wake Lock API. Wird als parameterloser Side-Effect-Hook in `RecipeDetail` und `CookMode` aufgerufen. Feature Detection + try/catch für graceful degradation.

**Tech Stack:** React 19, Screen Wake Lock API, Vitest

---

### Task 1: useWakeLock Hook — Test schreiben

**Files:**
- Create: `packages/frontend/src/hooks/__tests__/useWakeLock.test.ts`

**Step 1: Test-Datei erstellen**

```ts
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { renderHook } from "vitest-browser-react";
import { useWakeLock } from "../useWakeLock.js";

function createMockSentinel() {
	return { released: false, release: vi.fn().mockResolvedValue(undefined) };
}

describe("useWakeLock", () => {
	let mockSentinel: ReturnType<typeof createMockSentinel>;

	beforeEach(() => {
		mockSentinel = createMockSentinel();
		Object.defineProperty(navigator, "wakeLock", {
			value: { request: vi.fn().mockResolvedValue(mockSentinel) },
			writable: true,
			configurable: true,
		});
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it("requests a screen wake lock on mount", async () => {
		renderHook(() => useWakeLock());
		await vi.waitFor(() => {
			expect(navigator.wakeLock.request).toHaveBeenCalledWith("screen");
		});
	});

	it("releases the wake lock on unmount", async () => {
		const { unmount } = renderHook(() => useWakeLock());
		await vi.waitFor(() => {
			expect(navigator.wakeLock.request).toHaveBeenCalled();
		});
		unmount();
		expect(mockSentinel.release).toHaveBeenCalled();
	});

	it("re-requests wake lock when page becomes visible again", async () => {
		renderHook(() => useWakeLock());
		await vi.waitFor(() => {
			expect(navigator.wakeLock.request).toHaveBeenCalledTimes(1);
		});

		Object.defineProperty(document, "visibilityState", {
			value: "visible",
			writable: true,
			configurable: true,
		});
		document.dispatchEvent(new Event("visibilitychange"));

		await vi.waitFor(() => {
			expect(navigator.wakeLock.request).toHaveBeenCalledTimes(2);
		});
	});

	it("does not request when page is hidden", async () => {
		renderHook(() => useWakeLock());
		await vi.waitFor(() => {
			expect(navigator.wakeLock.request).toHaveBeenCalledTimes(1);
		});

		Object.defineProperty(document, "visibilityState", {
			value: "hidden",
			writable: true,
			configurable: true,
		});
		document.dispatchEvent(new Event("visibilitychange"));

		// Should still be 1, not 2
		expect(navigator.wakeLock.request).toHaveBeenCalledTimes(1);
	});

	it("does nothing when API is not supported", async () => {
		Object.defineProperty(navigator, "wakeLock", {
			value: undefined,
			writable: true,
			configurable: true,
		});
		// Should not throw
		const { unmount } = renderHook(() => useWakeLock());
		unmount();
	});
});
```

**Step 2: Tests ausführen, Fehlschlag bestätigen**

Run: `cd packages/frontend && pnpm test`
Expected: FAIL — `useWakeLock` ist noch nicht definiert.

---

### Task 2: useWakeLock Hook — Implementierung

**Files:**
- Create: `packages/frontend/src/hooks/useWakeLock.ts`

**Step 3: Hook implementieren**

```ts
import { useEffect, useRef } from "react";

export function useWakeLock(): void {
	const sentinelRef = useRef<WakeLockSentinel | null>(null);

	useEffect(() => {
		if (!("wakeLock" in navigator)) return;

		async function requestWakeLock() {
			try {
				sentinelRef.current = await navigator.wakeLock.request("screen");
			} catch {
				// Browser kann Lock ablehnen (z.B. niedriger Akkustand)
			}
		}

		function handleVisibilityChange() {
			if (document.visibilityState === "visible") {
				requestWakeLock();
			}
		}

		requestWakeLock();
		document.addEventListener("visibilitychange", handleVisibilityChange);

		return () => {
			document.removeEventListener("visibilitychange", handleVisibilityChange);
			sentinelRef.current?.release();
			sentinelRef.current = null;
		};
	}, []);
}
```

**Step 4: Tests ausführen, Erfolg bestätigen**

Run: `cd packages/frontend && pnpm test`
Expected: PASS — alle 5 Tests grün.

**Step 5: Commit**

```bash
git add packages/frontend/src/hooks/useWakeLock.ts packages/frontend/src/hooks/__tests__/useWakeLock.test.ts
git commit -m "feat: add useWakeLock hook with tests"
```

---

### Task 3: useWakeLock in RecipeDetail integrieren

**Files:**
- Modify: `packages/frontend/src/views/RecipeDetail.tsx:1-14` (Imports)
- Modify: `packages/frontend/src/views/RecipeDetail.tsx:26` (Hook-Aufruf)

**Step 6: Import hinzufügen**

In `RecipeDetail.tsx`, nach den bestehenden Imports (Zeile 14) einfügen:

```ts
import { useWakeLock } from "../hooks/useWakeLock.js";
```

**Step 7: Hook aufrufen**

In der `RecipeDetail`-Funktion (Zeile 26), als erste Zeile im Funktionskörper vor den State-Hooks:

```ts
useWakeLock();
```

**Step 8: Build prüfen**

Run: `cd packages/frontend && pnpm build`
Expected: Keine Fehler.

**Step 9: Commit**

```bash
git add packages/frontend/src/views/RecipeDetail.tsx
git commit -m "feat: activate wake lock on recipe detail page"
```

---

### Task 4: useWakeLock in CookMode integrieren

**Files:**
- Modify: `packages/frontend/src/views/CookMode.tsx:1-4` (Imports)
- Modify: `packages/frontend/src/views/CookMode.tsx:116` (Hook-Aufruf)

**Step 10: Import hinzufügen**

In `CookMode.tsx`, nach Zeile 4 (`import "../styles/cook-mode.css";`) einfügen:

```ts
import { useWakeLock } from "../hooks/useWakeLock.js";
```

**Step 11: Hook aufrufen**

In der `CookMode`-Funktion (Zeile 116), als erste Zeile nach der öffnenden Klammer:

```ts
useWakeLock();
```

**Step 12: Build prüfen**

Run: `cd packages/frontend && pnpm build`
Expected: Keine Fehler.

**Step 13: Alle Tests ausführen**

Run: `cd packages/frontend && pnpm test`
Expected: Alle Tests PASS.

**Step 14: Commit**

```bash
git add packages/frontend/src/views/CookMode.tsx
git commit -m "feat: activate wake lock in cook mode"
```

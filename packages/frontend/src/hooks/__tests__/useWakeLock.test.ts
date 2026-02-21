// @vitest-environment jsdom
import { cleanup, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useWakeLock } from "../useWakeLock.js";

function createMockSentinel() {
	return { release: vi.fn().mockResolvedValue(undefined) };
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
		cleanup();
		vi.restoreAllMocks();
	});

	it("requests a screen wake lock on mount", async () => {
		const { unmount } = renderHook(() => useWakeLock());
		await vi.waitFor(() => {
			expect(navigator.wakeLock.request).toHaveBeenCalledWith("screen");
		});
		unmount();
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
		const { unmount } = renderHook(() => useWakeLock());
		await vi.waitFor(() => {
			expect(navigator.wakeLock.request).toHaveBeenCalledWith("screen");
		});

		vi.mocked(navigator.wakeLock.request).mockClear();

		Object.defineProperty(document, "visibilityState", {
			value: "visible",
			writable: true,
			configurable: true,
		});
		document.dispatchEvent(new Event("visibilitychange"));

		await vi.waitFor(() => {
			expect(navigator.wakeLock.request).toHaveBeenCalledTimes(1);
		});
		unmount();
	});

	it("does not request when page is hidden", async () => {
		const { unmount } = renderHook(() => useWakeLock());
		await vi.waitFor(() => {
			expect(navigator.wakeLock.request).toHaveBeenCalledWith("screen");
		});

		vi.mocked(navigator.wakeLock.request).mockClear();

		Object.defineProperty(document, "visibilityState", {
			value: "hidden",
			writable: true,
			configurable: true,
		});
		document.dispatchEvent(new Event("visibilitychange"));

		// Should not have been called after clearing
		expect(navigator.wakeLock.request).not.toHaveBeenCalled();
		unmount();
	});

	it("does not re-request after unmount", async () => {
		const { unmount } = renderHook(() => useWakeLock());
		await vi.waitFor(() => {
			expect(navigator.wakeLock.request).toHaveBeenCalled();
		});
		unmount();

		vi.mocked(navigator.wakeLock.request).mockClear();

		Object.defineProperty(document, "visibilityState", {
			value: "visible",
			writable: true,
			configurable: true,
		});
		document.dispatchEvent(new Event("visibilitychange"));

		expect(navigator.wakeLock.request).not.toHaveBeenCalled();
	});

	it("handles request rejection gracefully", async () => {
		vi.mocked(navigator.wakeLock.request).mockRejectedValueOnce(
			new DOMException("Low battery", "NotAllowedError"),
		);
		const { unmount } = renderHook(() => useWakeLock());
		await vi.waitFor(() => {
			expect(navigator.wakeLock.request).toHaveBeenCalled();
		});
		unmount();
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

import { useEffect } from "react";

export function useWakeLock(): void {
	useEffect(() => {
		if (!("wakeLock" in navigator)) return;

		let cancelled = false;
		let sentinel: WakeLockSentinel | null = null;

		async function requestWakeLock() {
			try {
				const s = await navigator.wakeLock.request("screen");
				if (cancelled) {
					s.release();
				} else {
					sentinel = s;
				}
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
			cancelled = true;
			document.removeEventListener("visibilitychange", handleVisibilityChange);
			sentinel?.release();
		};
	}, []);
}

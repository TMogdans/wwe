import { useEffect, useState } from "react";
import "./styles/global.css";

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

	if (route === "/" || route === "") {
		return <div>Rezeptuebersicht (Placeholder)</div>;
	}

	const cookMatch = route.match(/^\/rezept\/(.+)\/kochen$/);
	if (cookMatch) {
		return (
			<div>Kochmodus: {decodeURIComponent(cookMatch[1])} (Placeholder)</div>
		);
	}

	const editMatch = route.match(/^\/rezept\/(.+)\/bearbeiten$/);
	if (editMatch) {
		return <div>Editor: {decodeURIComponent(editMatch[1])} (Placeholder)</div>;
	}

	const detailMatch = route.match(/^\/rezept\/(.+)$/);
	if (detailMatch) {
		return (
			<div>
				Rezeptdetail: {decodeURIComponent(detailMatch[1])} (Placeholder)
			</div>
		);
	}

	if (route === "/neu") {
		return <div>Neues Rezept (Placeholder)</div>;
	}

	return <div>404 – Seite nicht gefunden</div>;
}

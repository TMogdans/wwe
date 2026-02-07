import { useEffect, useState } from "react";
import "./styles/global.css";
import { CookMode } from "./views/CookMode.js";
import { RecipeDetail } from "./views/RecipeDetail.js";
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

	if (route === "/" || route === "") {
		return <RecipeOverview />;
	}

	const cookMatch = route.match(/^\/rezept\/(.+)\/kochen$/);
	if (cookMatch) {
		return <CookMode slug={decodeURIComponent(cookMatch[1])} />;
	}

	const editMatch = route.match(/^\/rezept\/(.+)\/bearbeiten$/);
	if (editMatch) {
		return <div>Editor: {decodeURIComponent(editMatch[1])} (Placeholder)</div>;
	}

	const detailMatch = route.match(/^\/rezept\/(.+)$/);
	if (detailMatch) {
		return <RecipeDetail slug={decodeURIComponent(detailMatch[1])} />;
	}

	if (route === "/neu") {
		return <div>Neues Rezept (Placeholder)</div>;
	}

	return <div>404 – Seite nicht gefunden</div>;
}

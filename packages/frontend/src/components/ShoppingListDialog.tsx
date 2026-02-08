import * as Dialog from "@radix-ui/react-dialog";
import { useState } from "react";
import type { AggregatedIngredient } from "../api.js";

interface ShoppingListDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	items: AggregatedIngredient[];
}

function formatAsPlainText(items: AggregatedIngredient[]): string {
	const lines: string[] = [];
	for (const item of items) {
		for (const entry of item.entries) {
			const prep = entry.preparation ? `, ${entry.preparation}` : "";
			lines.push(
				`${entry.amount} ${entry.unit} ${item.name}${prep} (${entry.recipeName})`,
			);
		}
	}
	return lines.join("\n");
}

function copyToClipboard(text: string): boolean {
	if (navigator.clipboard) {
		navigator.clipboard.writeText(text);
		return true;
	}
	const textarea = document.createElement("textarea");
	textarea.value = text;
	textarea.style.position = "fixed";
	textarea.style.opacity = "0";
	document.body.appendChild(textarea);
	textarea.select();
	const success = document.execCommand("copy");
	document.body.removeChild(textarea);
	return success;
}

export function ShoppingListDialog({
	open,
	onOpenChange,
	items,
}: ShoppingListDialogProps) {
	const [copied, setCopied] = useState(false);

	function handleCopy() {
		const text = formatAsPlainText(items);
		if (copyToClipboard(text)) {
			setCopied(true);
			setTimeout(() => setCopied(false), 2000);
		}
	}

	return (
		<Dialog.Root open={open} onOpenChange={onOpenChange}>
			<Dialog.Portal>
				<Dialog.Overlay className="dialog-overlay" />
				<Dialog.Content className="dialog-content">
					<Dialog.Title className="dialog-title">Einkaufsliste</Dialog.Title>
					<ul className="shopping-list">
						{items.map((item) => (
							<li key={item.name} className="shopping-list-item">
								<span className="shopping-list-item-name">{item.name}</span>
								{item.entries.map((entry) => (
									<div
										key={`${entry.recipeName}-${entry.amount}-${entry.unit}`}
										className="shopping-list-entry"
									>
										{entry.amount} {entry.unit}
										{entry.preparation && `, ${entry.preparation}`} (
										{entry.recipeName})
									</div>
								))}
							</li>
						))}
					</ul>
					<div className="dialog-actions">
						<button
							type="button"
							className="dialog-btn dialog-btn-primary"
							onClick={handleCopy}
						>
							{copied ? "Kopiert!" : "Kopieren"}
						</button>
						<Dialog.Close asChild>
							<button type="button" className="dialog-btn">
								Schliessen
							</button>
						</Dialog.Close>
					</div>
				</Dialog.Content>
			</Dialog.Portal>
		</Dialog.Root>
	);
}

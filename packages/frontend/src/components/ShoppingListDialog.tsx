import * as Dialog from "@radix-ui/react-dialog";
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
			lines.push(
				`${entry.amount} ${entry.unit} ${item.name} (${entry.recipeName})`,
			);
		}
	}
	return lines.join("\n");
}

export function ShoppingListDialog({
	open,
	onOpenChange,
	items,
}: ShoppingListDialogProps) {
	async function handleCopy() {
		const text = formatAsPlainText(items);
		await navigator.clipboard.writeText(text);
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
										{entry.amount} {entry.unit} ({entry.recipeName})
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
							Kopieren
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

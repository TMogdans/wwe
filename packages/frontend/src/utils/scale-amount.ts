function formatScaled(value: number): string {
	return value % 1 === 0 ? String(value) : value.toFixed(1);
}

export function scaleAmount(
	amount: string,
	scale: number,
	fixed?: boolean,
): string {
	if (!amount) return "";
	if (fixed) return amount;

	// Range like "5-7"
	const rangeMatch = amount.match(/^(\d+(?:\.\d+)?)-(\d+(?:\.\d+)?)$/);
	if (rangeMatch) {
		const low = Number(rangeMatch[1]) * scale;
		const high = Number(rangeMatch[2]) * scale;
		return `${formatScaled(low)}-${formatScaled(high)}`;
	}

	// Fraction like "1/2"
	const fractionMatch = amount.match(/^(\d+)\/(\d+)$/);
	if (fractionMatch) {
		const decimal = Number(fractionMatch[1]) / Number(fractionMatch[2]);
		return formatScaled(decimal * scale);
	}

	// Simple number
	const num = Number(amount);
	if (!Number.isNaN(num)) {
		return formatScaled(num * scale);
	}

	// Text amounts – don't scale
	return amount;
}

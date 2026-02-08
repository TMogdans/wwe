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

	const rangeMatch = amount.match(/^(\d+(?:\.\d+)?)-(\d+(?:\.\d+)?)$/);
	if (rangeMatch) {
		const low = Number(rangeMatch[1]) * scale;
		const high = Number(rangeMatch[2]) * scale;
		return `${formatScaled(low)}-${formatScaled(high)}`;
	}

	const num = Number(amount);
	if (!Number.isNaN(num)) {
		return formatScaled(num * scale);
	}

	const fractionMatch = amount.match(/^(\d+)\/(\d+)$/);
	if (fractionMatch) {
		const decimal = Number(fractionMatch[1]) / Number(fractionMatch[2]);
		return formatScaled(decimal * scale);
	}

	return amount;
}

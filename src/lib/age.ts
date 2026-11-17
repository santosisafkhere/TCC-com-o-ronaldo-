import { t, type Locale } from '$lib/i18n';

/** Whole months between a YYYY-MM-DD birth date and `now`, never negative. */
export function ageInMonths(dob: string, now: Date = new Date()): number {
	const [y, m, d] = dob.split('-').map(Number);
	let months = (now.getFullYear() - y) * 12 + (now.getMonth() + 1 - m);
	if (now.getDate() < d) months -= 1;
	return Math.max(0, months);
}

/** "3 meses", "1 ano", "2 anos e 4 meses" — or "Idade desconhecida". */
export function formatAge(dob: string | null, locale: Locale, now: Date = new Date()): string {
	if (!dob) return t(locale, 'age.unknown');
	const months = ageInMonths(dob, now);
	const years = Math.floor(months / 12);
	const rest = months % 12;
	const monthsText = t(locale, rest === 1 ? 'age.month' : 'age.months', { n: rest });
	if (years === 0) {
		return t(locale, months === 1 ? 'age.month' : 'age.months', { n: months });
	}
	const yearsText = t(locale, years === 1 ? 'age.year' : 'age.years', { n: years });
	return rest === 0
		? yearsText
		: t(locale, 'age.yearsAndMonths', { years: yearsText, months: monthsText });
}

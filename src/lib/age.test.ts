import { describe, it, expect } from 'vitest';
import { ageInMonths, formatAge } from './age';

const now = new Date(2026, 10, 17); // 17 Nov 2026

describe('formatAge', () => {
	it('reads naturally in Portuguese', () => {
		expect(formatAge(null, 'pt', now)).toBe('Idade desconhecida');
		expect(formatAge('2026-10-17', 'pt', now)).toBe('1 mês');
		expect(formatAge('2026-05-17', 'pt', now)).toBe('6 meses');
		expect(formatAge('2025-11-17', 'pt', now)).toBe('1 ano');
		expect(formatAge('2022-07-01', 'pt', now)).toBe('4 anos e 4 meses');
	});

	it('works in English', () => {
		expect(formatAge(null, 'en', now)).toBe('Unknown age');
		expect(formatAge('2024-10-17', 'en', now)).toBe('2 years and 1 month');
	});

	it('does not count a month that has not completed yet', () => {
		expect(ageInMonths('2026-10-18', now)).toBe(0);
		expect(formatAge('2026-11-17', 'pt', now)).toBe('0 meses');
	});
});

import { describe, it, expect } from 'vitest';
import { checkRateLimit, clearRateLimit, purgeExpiredRateLimits } from './rate-limit';

describe('checkRateLimit (database-backed)', () => {
	it('allows exactly `limit` attempts per window', async () => {
		const results = [];
		for (let i = 0; i < 5; i++) results.push(await checkRateLimit('t:limit', 3));
		expect(results).toEqual([true, true, true, false, false]);
	});

	it('keeps separate budgets per key', async () => {
		expect(await checkRateLimit('t:a', 1)).toBe(true);
		expect(await checkRateLimit('t:a', 1)).toBe(false);
		expect(await checkRateLimit('t:b', 1)).toBe(true);
	});

	it('starts a fresh window once the old one has expired', async () => {
		expect(await checkRateLimit('t:window', 1, 50)).toBe(true);
		expect(await checkRateLimit('t:window', 1, 50)).toBe(false);
		await new Promise((r) => setTimeout(r, 80));
		expect(await checkRateLimit('t:window', 1, 50)).toBe(true);
	});

	it('clearRateLimit resets the budget (successful login)', async () => {
		expect(await checkRateLimit('t:clear', 1)).toBe(true);
		expect(await checkRateLimit('t:clear', 1)).toBe(false);
		await clearRateLimit('t:clear');
		expect(await checkRateLimit('t:clear', 1)).toBe(true);
	});

	it('counts concurrent attempts without losing any', async () => {
		const results = await Promise.all(
			Array.from({ length: 10 }, () => checkRateLimit('t:concurrent', 4))
		);
		expect(results.filter(Boolean)).toHaveLength(4);
	});

	it('purges only expired windows', async () => {
		await checkRateLimit('t:purge-old', 5, 1);
		await checkRateLimit('t:purge-live', 5, 60_000);
		await new Promise((r) => setTimeout(r, 20));
		expect(await purgeExpiredRateLimits()).toBeGreaterThanOrEqual(1);
		// The live window survived: its budget is still being counted.
		const after = [];
		for (let i = 0; i < 5; i++) after.push(await checkRateLimit('t:purge-live', 5, 60_000));
		expect(after.filter(Boolean)).toHaveLength(4);
	});
});

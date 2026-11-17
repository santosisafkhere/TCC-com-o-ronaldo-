import { describe, it, expect, beforeAll } from 'vitest';
import { db, schema } from '$lib/server/db';
import { search, buildMatchQuery, buildFilterClause, hasActiveFilters } from './search';
import type { SearchFilters } from './search';

function q(partial: Partial<SearchFilters>): SearchFilters {
	return { text: '', companionIds: [], types: [], ...partial };
}

describe('buildMatchQuery', () => {
	it('rejects short and empty input', async () => {
		expect(buildMatchQuery('')).toBeNull();
		expect(buildMatchQuery(' a ')).toBeNull();
	});

	it('quotes and prefixes tokens', async () => {
		expect(buildMatchQuery('vet visit')).toBe('vet:* & visit:*');
	});

	it('neutralizes tsquery operators and quotes', async () => {
		expect(buildMatchQuery('a" OR "b')).toBe('a:* & OR:* & b:*');
		expect(buildMatchQuery("x & !y | (z):* <-> 'w'")).toBe('x:* & y:* & z:* & w:*');
		expect(buildMatchQuery('""')).toBeNull();
		expect(buildMatchQuery('" "')).toBeNull();
	});
});

describe('buildFilterClause', () => {
	it('is empty for no filters', async () => {
		expect(buildFilterClause(q({}))).toEqual({ sql: '', params: [] });
	});
	it('ORs within a kind, ANDs across kinds, params in order', async () => {
		const r = buildFilterClause(
			q({
				companionIds: ['c1', 'c2'],
				types: ['health'],
				after: '2026-01-01',
				before: '2026-12-31'
			})
		);
		expect(r.sql).toBe(
			's.companion_id IN (?, ?) AND s.entity_type IN (?) AND s.event_date >= ? AND s.event_date <= ?'
		);
		expect(r.params).toEqual(['c1', 'c2', 'health', '2026-01-01', '2026-12-31']);
	});
});

describe('hasActiveFilters', () => {
	it('detects any filter', async () => {
		expect(hasActiveFilters(q({}))).toBe(false);
		expect(hasActiveFilters(q({ types: ['health'] }))).toBe(true);
		expect(hasActiveFilters(q({ after: '2026-01-01' }))).toBe(true);
	});
});

describe('search index + query', () => {
	beforeAll(async () => {
		await db.insert(schema.users).values({
			id: 'u-s',
			username: 'search-user',
			displayName: 'S User',
			role: 'member'
		} as typeof schema.users.$inferInsert);
		await db.insert(schema.companions).values({
			id: 'c-s',
			name: 'Searchy'
		} as typeof schema.companions.$inferInsert);
	});

	it('triggers index journal inserts, updates, deletes', async () => {
		await db.insert(schema.journalEntries).values({
			id: 'j-s1',
			companionId: 'c-s',
			date: '2026-04-01',
			body: 'zephyr quince walk',
			loggedBy: 'u-s'
		} as typeof schema.journalEntries.$inferInsert);
		expect((await search(q({ text: 'zephyr' }))).length).toBe(1);
		expect((await search(q({ text: 'zephyr' })))[0]).toMatchObject({
			type: 'journal',
			companionName: 'Searchy',
			href: '/c-s/journal/2026-04-01'
		});

		const { eq } = await import('drizzle-orm');
		await db
			.update(schema.journalEntries)
			.set({ body: 'flummox walk' })
			.where(eq(schema.journalEntries.id, 'j-s1'));
		expect((await search(q({ text: 'zephyr' }))).length).toBe(0);
		expect((await search(q({ text: 'flummox' }))).length).toBe(1);

		await db.delete(schema.journalEntries).where(eq(schema.journalEntries.id, 'j-s1'));
		expect((await search(q({ text: 'flummox' }))).length).toBe(0);
	});

	it('indexes every entity type', async () => {
		await db.insert(schema.healthEvents).values({
			id: 'h-s1',
			companionId: 'c-s',
			title: 'xylograph checkup',
			type: 'vet_visit',
			occurredAt: new Date('2026-04-02T10:00:00Z'),
			loggedBy: 'u-s'
		} as typeof schema.healthEvents.$inferInsert);
		await db.insert(schema.reminders).values({
			id: 'r-s1',
			companionId: 'c-s',
			title: 'quibble pill',
			type: 'medication',
			dueAt: new Date('2026-04-03T09:00:00Z'),
			loggedBy: 'u-s'
		} as typeof schema.reminders.$inferInsert);
		await db.insert(schema.dailyEvents).values({
			id: 'd-s1',
			companionId: 'c-s',
			type: 'walk',
			notes: 'gargoyle sighting',
			loggedAt: new Date('2026-04-04T12:00:00Z'),
			loggedBy: 'u-s'
		} as typeof schema.dailyEvents.$inferInsert);
		await db.insert(schema.weightEntries).values({
			id: 'w-s1',
			companionId: 'c-s',
			weight: 12,
			unit: 'kg',
			notes: 'plimsoll weigh-in',
			recordedAt: new Date('2026-04-05T12:00:00Z'),
			loggedBy: 'u-s'
		} as typeof schema.weightEntries.$inferInsert);

		expect((await search(q({ text: 'xylograph' })))[0]?.type).toBe('health');
		expect((await search(q({ text: 'quibble' })))[0]?.type).toBe('reminder');
		expect((await search(q({ text: 'gargoyle' })))[0]?.type).toBe('daily');
		expect((await search(q({ text: 'plimsoll' })))[0]?.type).toBe('weight');
		// health event_date derived from occurredAt
		expect((await search(q({ text: 'xylograph' })))[0]?.date).toBe('2026-04-02');
		// deep-link hrefs
		expect((await search(q({ text: 'xylograph' })))[0]?.href).toBe('/c-s/health?detailHealth=h-s1');
		expect((await search(q({ text: 'quibble' })))[0]?.href).toBe('/c-s/reminders?detail=r-s1');
		expect((await search(q({ text: 'gargoyle' })))[0]?.href).toBe('/c-s/journal/2026-04-04');
		expect((await search(q({ text: 'plimsoll' })))[0]?.href).toBe('/c-s/health?detailWeight=w-s1');
	});

	it('snippet carries sentinel markers around the match', async () => {
		const r = (await search(q({ text: 'gargoyle' })))[0];
		expect(r.snippet).toContain('\x01gargoyle\x02');
	});

	it('matches regardless of accents and highlights the accented word', async () => {
		await db.insert(schema.healthEvents).values({
			id: 'h-s-acc',
			companionId: 'c-s',
			title: 'Reforço',
			notes: 'Vacinação antirrábica anual',
			type: 'vaccination',
			occurredAt: new Date('2026-04-06T10:00:00Z'),
			loggedBy: 'u-s'
		} as typeof schema.healthEvents.$inferInsert);
		const plain = await search(q({ text: 'vacinacao' }));
		expect(plain.map((r) => r.id)).toContain('h-s-acc');
		expect(plain[0].snippet).toContain('Vacinação');
		expect((await search(q({ text: 'ANTIRRÁB' }))).map((r) => r.id)).toContain('h-s-acc');
		// title-only match
		expect((await search(q({ text: 'reforco' }))).map((r) => r.id)).toContain('h-s-acc');
	});

	it('indexes journal media captions', async () => {
		const { eq } = await import('drizzle-orm');
		await db.insert(schema.journalEntries).values({
			id: 'j-s-media',
			companionId: 'c-s',
			date: '2026-04-09',
			body: 'ordinary entry',
			loggedBy: 'u-s'
		} as typeof schema.journalEntries.$inferInsert);
		await db.insert(schema.journalPhotos).values({
			id: 'p-s1',
			entryId: 'j-s-media',
			filename: 'sphinx.jpg',
			mimeType: 'image/jpeg',
			sizeBytes: 12345,
			notes: 'sphinx caption here'
		} as typeof schema.journalPhotos.$inferInsert);

		expect((await search(q({ text: 'sphinx' }))).length).toBe(1);
		expect((await search(q({ text: 'sphinx' })))[0]).toMatchObject({
			type: 'media',
			href: '/c-s/journal/2026-04-09?media=p-s1'
		});

		// update: old term gone, new term found
		await db
			.update(schema.journalPhotos)
			.set({ notes: 'marmot updated' })
			.where(eq(schema.journalPhotos.id, 'p-s1'));
		expect((await search(q({ text: 'sphinx' }))).length).toBe(0);
		expect((await search(q({ text: 'marmot' }))).length).toBe(1);
		expect((await search(q({ text: 'marmot' })))[0]?.type).toBe('media');

		// delete: gone
		await db.delete(schema.journalPhotos).where(eq(schema.journalPhotos.id, 'p-s1'));
		expect((await search(q({ text: 'marmot' }))).length).toBe(0);
	});

	it('ranks the stronger match first', async () => {
		await db.insert(schema.journalEntries).values([
			{
				id: 'j-s2',
				companionId: 'c-s',
				date: '2026-04-06',
				body: 'brontide brontide brontide',
				loggedBy: 'u-s'
			},
			{
				id: 'j-s3',
				companionId: 'c-s',
				date: '2026-04-07',
				body: 'one brontide among many other plain words here',
				loggedBy: 'u-s'
			}
		] as (typeof schema.journalEntries.$inferInsert)[]);
		const results = await search(q({ text: 'brontide' }));
		expect(results[0].id).toBe('j-s2');
	});

	describe('search filters', () => {
		it('text + type filter narrows to that type', async () => {
			expect((await search(q({ text: 'xylograph' }))).some((r) => r.type === 'health')).toBe(true);
			expect(await search(q({ text: 'xylograph', types: ['journal'] }))).toHaveLength(0);
		});
		it('filter-only browse returns that type, no text', async () => {
			const health = await search(q({ types: ['health'] }));
			expect(health.length).toBeGreaterThan(0);
			expect(health.every((r) => r.type === 'health')).toBe(true);
		});
		it('companion filter restricts', async () => {
			const mine = await search(q({ companionIds: ['c-s'], types: ['health'] }));
			expect(mine.every((r) => r.companionId === 'c-s')).toBe(true);
			expect(await search(q({ companionIds: ['nope'], types: ['health'] }))).toHaveLength(0);
		});
		it('date range bounds are inclusive', async () => {
			expect(
				(await search(q({ types: ['health'], after: '2026-04-02', before: '2026-04-02' }))).some(
					(r) => r.date === '2026-04-02'
				)
			).toBe(true);
			expect(
				(await search(q({ types: ['health'], after: '2026-04-03' }))).some(
					(r) => r.date === '2026-04-02'
				)
			).toBe(false);
		});
		it('empty everything returns nothing', async () => {
			expect(await search(q({}))).toEqual([]);
		});
	});
});

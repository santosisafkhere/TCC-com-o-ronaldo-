import { describe, it, expect, beforeAll } from 'vitest';
import { sha256 } from '@oslojs/crypto/sha2';
import { encodeHexLowerCase } from '@oslojs/encoding';
import { db, schema } from '$lib/server/db';
import * as companions from './companions/+server';
import * as companion from './companions/[id]/+server';
import * as weights from './companions/[id]/weight-entries/+server';
import * as weight from './companions/[id]/weight-entries/[wid]/+server';
import * as reminders from './companions/[id]/reminders/+server';
import * as healthEvents from './companions/[id]/health-events/+server';
import * as healthEvent from './companions/[id]/health-events/[eid]/+server';

// End-to-end through the v1 handlers against the real (in-memory) database:
// key validation, ownership scoping and the write paths.

const KEY_A = 'gp_' + 'a'.repeat(48);
const KEY_B = 'gp_' + 'b'.repeat(48);

function hash(key: string) {
	return encodeHexLowerCase(sha256(new TextEncoder().encode(key)));
}

type Handler = (event: never) => Promise<Response> | Response;

async function call(
	handler: Handler,
	key: string | null,
	params: Record<string, string>,
	body?: unknown,
	query = ''
): Promise<{ status: number; body: Record<string, unknown> }> {
	const url = new URL(`http://test.local/api/v1/x${query}`);
	const request = new Request(url, {
		method: body === undefined ? 'GET' : 'POST',
		headers: {
			...(key ? { authorization: `Bearer ${key}` } : {}),
			'content-type': 'application/json'
		},
		body: body === undefined ? undefined : JSON.stringify(body)
	});
	let res: Response;
	try {
		res = await handler({ request, params, url } as never);
	} catch (err) {
		// SvelteKit error() throws an HttpError carrying the status.
		const e = err as { status?: number; body?: Record<string, unknown> };
		if (typeof e.status === 'number') return { status: e.status, body: e.body ?? {} };
		throw err;
	}
	return { status: res.status, body: (await res.json().catch(() => ({}))) as never };
}

describe('REST API v1', () => {
	beforeAll(async () => {
		await db.insert(schema.users).values([
			{ id: 'api-a', username: 'api-a', displayName: 'A', role: 'member' },
			{ id: 'api-b', username: 'api-b', displayName: 'B', role: 'member' }
		]);
		await db.insert(schema.companions).values([
			{ id: 'api-pet-a', name: 'Apet', ownerId: 'api-a' },
			{ id: 'api-pet-b', name: 'Bpet', ownerId: 'api-b' }
		]);
		await db.insert(schema.apiKeys).values([
			{
				id: 'k-a',
				userId: 'api-a',
				name: 'a',
				keyHash: hash(KEY_A),
				keyPrefix: KEY_A.slice(0, 11)
			},
			{ id: 'k-b', userId: 'api-b', name: 'b', keyHash: hash(KEY_B), keyPrefix: KEY_B.slice(0, 11) }
		]);
	});

	it('rejects a missing or unknown key', async () => {
		expect((await call(companions.GET as Handler, null, {})).status).toBe(401);
		expect((await call(companions.GET as Handler, 'gp_' + 'z'.repeat(48), {})).status).toBe(401);
	});

	it('lists only the caller’s companions and records key use', async () => {
		const res = await call(companions.GET as Handler, KEY_A, {});
		expect(res.status).toBe(200);
		expect((res.body.data as { id: string }[]).map((c) => c.id)).toEqual(['api-pet-a']);
		expect((res.body.pagination as { total: number }).total).toBe(1);
		const key = await db.query.apiKeys.findFirst({ where: (k, { eq }) => eq(k.id, 'k-a') });
		expect(key?.lastUsedAt).toBeInstanceOf(Date);
	});

	it('hides another owner’s companion', async () => {
		expect((await call(companion.GET as Handler, KEY_A, { id: 'api-pet-b' })).status).toBe(404);
		expect((await call(weights.GET as Handler, KEY_A, { id: 'api-pet-b' })).status).toBe(404);
		expect(
			(await call(weights.POST as Handler, KEY_A, { id: 'api-pet-b' }, { weight: 1 })).status
		).toBe(404);
	});

	it('creates, reads and deletes a weight entry', async () => {
		const created = await call(
			weights.POST as Handler,
			KEY_A,
			{ id: 'api-pet-a' },
			{ weight: 12.9, unit: 'kg', recordedAt: '2026-11-15T10:00:00Z' }
		);
		expect(created.status).toBe(201);
		const row = created.body.data as { id: string; weight: number; recordedAt: string };
		expect(row.weight).toBe(12.9);
		expect(new Date(row.recordedAt).toISOString()).toBe('2026-11-15T10:00:00.000Z');

		const list = await call(weights.GET as Handler, KEY_A, { id: 'api-pet-a' });
		expect((list.body.data as unknown[]).length).toBe(1);

		const del = await call(weight.DELETE as Handler, KEY_A, { id: 'api-pet-a', wid: row.id });
		expect(del.status).toBeLessThan(300);
		const after = await call(weights.GET as Handler, KEY_A, { id: 'api-pet-a' });
		expect((after.body.data as unknown[]).length).toBe(0);
	});

	it('creates a reminder and a health event, then fetches the event', async () => {
		const rem = await call(
			reminders.POST as Handler,
			KEY_A,
			{ id: 'api-pet-a' },
			{ title: 'API reminder', type: 'other', dueAt: '2026-12-01T10:00:00Z' }
		);
		expect(rem.status).toBe(201);

		const ev = await call(
			healthEvents.POST as Handler,
			KEY_A,
			{ id: 'api-pet-a' },
			{ title: 'Checkup', type: 'vet_visit', occurredAt: '2026-11-01T10:00:00Z' }
		);
		expect(ev.status).toBe(201);
		const id = (ev.body.data as { id: string }).id;

		const one = await call(healthEvent.GET as Handler, KEY_A, { id: 'api-pet-a', eid: id });
		expect(one.status).toBe(200);
		expect((one.body.data as { title: string }).title).toBe('Checkup');
		// Another owner's key cannot read it.
		expect(
			(await call(healthEvent.GET as Handler, KEY_B, { id: 'api-pet-a', eid: id })).status
		).toBe(404);
	});
});

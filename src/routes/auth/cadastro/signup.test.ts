import { describe, it, expect, vi } from 'vitest';
import { isRedirect, isActionFailure } from '@sveltejs/kit';

vi.mock('$env/dynamic/private', () => ({
	env: new Proxy({} as Record<string, string | undefined>, {
		get: (_t, k: string) => process.env[k]
	})
}));

const { actions } = await import('./+page.server');
const { db, schema } = await import('$lib/server/db');
const { eq } = await import('drizzle-orm');

let ipCounter = 0;

async function submit(fields: Record<string, string>, ip = `10.0.0.${++ipCounter}`) {
	const body = new FormData();
	for (const [k, v] of Object.entries(fields)) body.set(k, v);
	const cookies = { set: vi.fn() };
	const event = {
		request: new Request('http://test.local/auth/cadastro', { method: 'POST', body }),
		cookies,
		getClientAddress: () => ip,
		locals: { locale: 'pt' }
	};
	try {
		const result = await actions.default(event as never);
		return { result, cookies };
	} catch (thrown) {
		return { result: thrown, cookies };
	}
}

const valid = {
	displayName: 'Ana',
	username: 'ana_pets',
	email: 'ana@example.com',
	password: 'segredo-123',
	confirmPassword: 'segredo-123'
};

describe('open sign-up', () => {
	it('creates a member account, signs it in and goes to add a pet', async () => {
		const { result, cookies } = await submit(valid);
		expect(isRedirect(result)).toBe(true);
		expect((result as { location: string }).location).toBe('/companions/new');
		expect(cookies.set).toHaveBeenCalledOnce();

		const user = await db.query.users.findFirst({ where: eq(schema.users.username, 'ana_pets') });
		expect(user?.role).toBe('member');
		expect(user?.email).toBe('ana@example.com');
		expect(user?.passwordHash).not.toBe('segredo-123');
	});

	it('rejects a username or email that is already taken', async () => {
		const dupUser = await submit({ ...valid, email: '' });
		expect(isActionFailure(dupUser.result)).toBe(true);
		expect((dupUser.result as { data: { error: string } }).data.error).toMatch(/usuário/i);

		const dupEmail = await submit({ ...valid, username: 'outra_ana' });
		expect(isActionFailure(dupEmail.result)).toBe(true);
		expect((dupEmail.result as { data: { error: string } }).data.error).toMatch(/e-mail|email/i);
	});

	it('validates username, email and password', async () => {
		for (const bad of [
			{ username: 'ab' },
			{ username: 'com espaço' },
			{ email: 'nao-e-email' },
			{ password: 'curta', confirmPassword: 'curta' },
			{ confirmPassword: 'diferente-123' }
		]) {
			const { result } = await submit({ ...valid, username: 'novo_user', email: '', ...bad });
			expect(isActionFailure(result), JSON.stringify(bad)).toBe(true);
		}
	});

	it('refuses bots that fill the hidden field', async () => {
		const { result } = await submit({
			...valid,
			username: 'robo',
			email: '',
			website: 'http://spam'
		});
		expect(isActionFailure(result)).toBe(true);
		const user = await db.query.users.findFirst({ where: eq(schema.users.username, 'robo') });
		expect(user).toBeUndefined();
	});

	it('limits sign-ups per network', async () => {
		const statuses = [];
		for (let i = 0; i < 6; i++) {
			const { result } = await submit({ ...valid, username: `lote_${i}`, email: '' }, '10.9.9.9');
			statuses.push(isRedirect(result) ? 'ok' : (result as { status: number }).status);
		}
		expect(statuses).toEqual(['ok', 'ok', 'ok', 'ok', 'ok', 429]);
	});
});

import { describe, it, expect, vi, beforeEach } from 'vitest';

const secretEnv: { CRON_SECRET?: string } = {};
vi.mock('$env/dynamic/private', () => ({
	env: new Proxy({} as Record<string, string | undefined>, {
		get: (_t, k: string) => (k === 'CRON_SECRET' ? secretEnv.CRON_SECRET : process.env[k])
	})
}));

const runNotifyCycle = vi.fn(async () => ({ recovered: 0 }));
vi.mock('$lib/server/notify/scheduler', () => ({
	isNotifyConfigured: () => true,
	runNotifyCycle: () => runNotifyCycle()
}));

const { GET, POST } = await import('./+server');

function call(handler: typeof GET, auth?: string) {
	const request = new Request('http://test.local/api/cron/notify', {
		headers: auth ? { authorization: auth } : {}
	});
	return handler({ request } as never) as Promise<Response>;
}

const SECRET = 's'.repeat(32);

describe('/api/cron/notify', () => {
	beforeEach(() => {
		runNotifyCycle.mockClear();
		secretEnv.CRON_SECRET = SECRET;
	});

	it('is hidden when CRON_SECRET is unset or too short', async () => {
		secretEnv.CRON_SECRET = undefined;
		expect((await call(GET, `Bearer ${SECRET}`)).status).toBe(404);
		secretEnv.CRON_SECRET = 'short';
		expect((await call(GET, 'Bearer short')).status).toBe(404);
		expect(runNotifyCycle).not.toHaveBeenCalled();
	});

	it('rejects a missing or wrong secret', async () => {
		expect((await call(GET)).status).toBe(401);
		expect((await call(GET, `Bearer ${'x'.repeat(32)}`)).status).toBe(401);
		expect((await call(GET, SECRET)).status).toBe(401);
		expect(runNotifyCycle).not.toHaveBeenCalled();
	});

	it('runs a cycle with the right secret, via GET or POST', async () => {
		const res = await call(GET, `Bearer ${SECRET}`);
		expect(res.status).toBe(200);
		expect(await res.json()).toMatchObject({ ok: true, notify: { recovered: 0 } });
		expect((await call(POST, `Bearer ${SECRET}`)).status).toBe(200);
		expect(runNotifyCycle).toHaveBeenCalledTimes(2);
	});
});

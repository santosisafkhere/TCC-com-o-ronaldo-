import { json } from '@sveltejs/kit';
import { timingSafeEqual } from 'node:crypto';
import type { RequestHandler } from './$types';
import { env } from '$env/dynamic/private';
import { isNotifyConfigured, runNotifyCycle } from '$lib/server/notify/scheduler';
import { purgeExpiredRateLimits } from '$lib/server/auth/rate-limit';

// Periodic maintenance entry point for hosts without a long-running process
// (Vercel). Called every minute or few by an external scheduler — Supabase
// pg_cron + pg_net, Vercel Cron (Pro), or any uptime pinger — with
//   Authorization: Bearer <CRON_SECRET>
// Each call queues newly due reminder/shift notifications, delivers them, and
// purges expired rate-limit windows. Safe to call concurrently.
//
// Disabled (404) unless CRON_SECRET is set, so it is never an open trigger.

function authorized(header: string | null, secret: string): boolean {
	if (!header?.startsWith('Bearer ')) return false;
	const given = Buffer.from(header.slice(7).trim());
	const expected = Buffer.from(secret);
	return given.length === expected.length && timingSafeEqual(given, expected);
}

const handler: RequestHandler = async ({ request }) => {
	const secret = env.CRON_SECRET?.trim();
	if (!secret || secret.length < 16) return new Response('Not found', { status: 404 });
	if (!authorized(request.headers.get('authorization'), secret)) {
		return new Response('Unauthorized', { status: 401 });
	}

	const startedAt = Date.now();
	const purged = await purgeExpiredRateLimits().catch((err) => {
		console.error('[cron] rate-limit purge failed:', err);
		return 0;
	});
	const notify = isNotifyConfigured() ? await runNotifyCycle() : null;

	return json(
		{
			ok: true,
			notify: notify ?? 'not configured',
			purgedRateLimits: purged,
			ms: Date.now() - startedAt
		},
		{ headers: { 'Cache-Control': 'no-store' } }
	);
};

// Vercel Cron issues GET; pg_net and most pingers can do either.
export const GET = handler;
export const POST = handler;

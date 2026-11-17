import { json } from '@sveltejs/kit';
import { db, schema } from '$lib/server/db';
import { eq, desc } from 'drizzle-orm';
import { validateApiKey } from '$lib/server/api/validate';
import { companionForApiUser } from '$lib/server/api/access';
import { notFound } from '$lib/server/api/errors';
import crypto from 'crypto';

export async function GET({ request, params, url }) {
	const auth = await validateApiKey(request);
	if (!auth) return json({ error: 'Unauthorized' }, { status: 401 });
	if (!(await companionForApiUser(params.id, auth.userId))) notFound('Companion');

	const limit = Math.min(100, Number(url.searchParams.get('limit')) || 20);

	const rows = await db
		.select()
		.from(schema.journalEntries)
		.where(eq(schema.journalEntries.companionId, params.id))
		.orderBy(desc(schema.journalEntries.date))
		.limit(limit);

	return json({ data: rows });
}

export async function POST({ request, params }) {
	const auth = await validateApiKey(request);
	if (!auth) return json({ error: 'Unauthorized' }, { status: 401 });
	if (!(await companionForApiUser(params.id, auth.userId))) notFound('Companion');

	if (!(await db.select().from(schema.companions).where(eq(schema.companions.id, params.id)))[0]) {
		notFound('Companion');
	}

	const body = await request.json().catch(() => null);
	if (!body) return json({ error: 'Invalid JSON' }, { status: 400 });

	const id = crypto.randomUUID();
	const today = new Date().toISOString().slice(0, 10);

	await db.insert(schema.journalEntries).values({
		id,
		companionId: params.id,
		date: body.date || today,
		body: body.body || '',
		mood: body.mood || null,
		loggedBy: auth.userId
	});

	const entry = (
		await db.select().from(schema.journalEntries).where(eq(schema.journalEntries.id, id))
	)[0];
	return json({ data: entry }, { status: 201 });
}

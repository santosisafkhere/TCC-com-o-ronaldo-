import { json } from '@sveltejs/kit';
import { db, schema } from '$lib/server/db';
import { eq, desc } from 'drizzle-orm';
import { validateApiKey } from '$lib/server/api/validate';
import { companionForApiUser } from '$lib/server/api/access';
import { notFound } from '$lib/server/api/errors';
import crypto from 'crypto';

export function GET({ request, params, url }) {
	const auth = validateApiKey(request);
	if (!auth) return json({ error: 'Unauthorized' }, { status: 401 });
	if (!companionForApiUser(params.id, auth.userId)) notFound('Companion');

	const limit = Math.min(100, Number(url.searchParams.get('limit')) || 20);

	const rows = db
		.select()
		.from(schema.journalEntries)
		.where(eq(schema.journalEntries.companionId, params.id))
		.orderBy(desc(schema.journalEntries.date))
		.limit(limit)
		.all();

	return json({ data: rows });
}

export async function POST({ request, params }) {
	const auth = validateApiKey(request);
	if (!auth) return json({ error: 'Unauthorized' }, { status: 401 });
	if (!companionForApiUser(params.id, auth.userId)) notFound('Companion');

	if (!db.select().from(schema.companions).where(eq(schema.companions.id, params.id)).get()) {
		notFound('Companion');
	}

	const body = await request.json().catch(() => null);
	if (!body) return json({ error: 'Invalid JSON' }, { status: 400 });

	const id = crypto.randomUUID();
	const today = new Date().toISOString().slice(0, 10);

	db.insert(schema.journalEntries).values({
		id,
		companionId: params.id,
		date: body.date || today,
		body: body.body || '',
		mood: body.mood || null,
		loggedBy: auth.userId
	}).run();

	const entry = db.select().from(schema.journalEntries).where(eq(schema.journalEntries.id, id)).get();
	return json({ data: entry }, { status: 201 });
}

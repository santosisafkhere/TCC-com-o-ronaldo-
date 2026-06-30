import { json } from '@sveltejs/kit';
import { db, schema } from '$lib/server/db';
import { eq, and, desc } from 'drizzle-orm';
import { validateApiKey } from '$lib/server/api/validate';
import { companionForApiUser } from '$lib/server/api/access';
import { notFound } from '$lib/server/api/errors';
import { parseDailyEventType } from '$lib/server/validation';
import crypto from 'crypto';

export function GET({ request, params, url }) {
	const auth = validateApiKey(request);
	if (!auth) return json({ error: 'Unauthorized' }, { status: 401 });
	if (!companionForApiUser(params.id, auth.userId)) notFound('Companion');

	const typeFilter = parseDailyEventType(url.searchParams.get('type') ?? '');
	const conditions = [eq(schema.dailyEvents.companionId, params.id)];
	if (typeFilter) conditions.push(eq(schema.dailyEvents.type, typeFilter));

	const rows = db
		.select()
		.from(schema.dailyEvents)
		.where(and(...conditions))
		.orderBy(desc(schema.dailyEvents.loggedAt))
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
	if (!body.type) return json({ error: 'type is required' }, { status: 400 });

	const validTypes = ['walk', 'meal', 'bathroom', 'treat', 'play', 'grooming', 'other'];
	if (!validTypes.includes(body.type)) {
		return json({ error: `type must be one of: ${validTypes.join(', ')}` }, { status: 400 });
	}

	const id = crypto.randomUUID();
	db.insert(schema.dailyEvents).values({
		id,
		companionId: params.id,
		type: body.type,
		notes: body.notes || null,
		durationMinutes: body.durationMinutes || null,
		loggedAt: body.loggedAt ? new Date(body.loggedAt) : new Date(),
		loggedBy: auth.userId
	}).run();

	const event = db.select().from(schema.dailyEvents).where(eq(schema.dailyEvents.id, id)).get();
	return json({ data: event }, { status: 201 });
}

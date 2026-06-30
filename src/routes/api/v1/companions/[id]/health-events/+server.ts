import { json } from '@sveltejs/kit';
import { db, schema } from '$lib/server/db';
import { eq, desc } from 'drizzle-orm';
import { validateApiKey } from '$lib/server/api/validate';
import { companionForApiUser } from '$lib/server/api/access';
import { notFound } from '$lib/server/api/errors';
import crypto from 'crypto';

export function GET({ request, params }) {
	const auth = validateApiKey(request);
	if (!auth) return json({ error: 'Unauthorized' }, { status: 401 });
	if (!companionForApiUser(params.id, auth.userId)) notFound('Companion');

	const rows = db
		.select()
		.from(schema.healthEvents)
		.where(eq(schema.healthEvents.companionId, params.id))
		.orderBy(desc(schema.healthEvents.occurredAt))
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
	if (!body.type || !body.title) {
		return json({ error: 'type and title are required' }, { status: 400 });
	}

	const validTypes = ['vet_visit', 'vaccination', 'medication', 'procedure', 'other'];
	if (!validTypes.includes(body.type)) {
		return json({ error: `type must be one of: ${validTypes.join(', ')}` }, { status: 400 });
	}

	const id = crypto.randomUUID();
	db.insert(schema.healthEvents).values({
		id,
		companionId: params.id,
		type: body.type,
		title: body.title,
		notes: body.notes || null,
		occurredAt: body.occurredAt ? new Date(body.occurredAt) : new Date(),
		vetName: body.vetName || null,
		vetClinic: body.vetClinic || null,
		loggedBy: auth.userId
	}).run();

	const event = db.select().from(schema.healthEvents).where(eq(schema.healthEvents.id, id)).get();
	return json({ data: event }, { status: 201 });
}

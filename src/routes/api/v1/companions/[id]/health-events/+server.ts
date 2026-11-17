import { json } from '@sveltejs/kit';
import { db, schema } from '$lib/server/db';
import { eq, desc } from 'drizzle-orm';
import { validateApiKey } from '$lib/server/api/validate';
import { companionForApiUser } from '$lib/server/api/access';
import { notFound } from '$lib/server/api/errors';
import crypto from 'crypto';

export async function GET({ request, params }) {
	const auth = await validateApiKey(request);
	if (!auth) return json({ error: 'Unauthorized' }, { status: 401 });
	if (!(await companionForApiUser(params.id, auth.userId))) notFound('Companion');

	const rows = await db
		.select()
		.from(schema.healthEvents)
		.where(eq(schema.healthEvents.companionId, params.id))
		.orderBy(desc(schema.healthEvents.occurredAt));

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
	if (!body.type || !body.title) {
		return json({ error: 'type and title are required' }, { status: 400 });
	}

	const validTypes = ['vet_visit', 'vaccination', 'medication', 'procedure', 'other'];
	if (!validTypes.includes(body.type)) {
		return json({ error: `type must be one of: ${validTypes.join(', ')}` }, { status: 400 });
	}

	const id = crypto.randomUUID();
	await db.insert(schema.healthEvents).values({
		id,
		companionId: params.id,
		type: body.type,
		title: body.title,
		notes: body.notes || null,
		occurredAt: body.occurredAt ? new Date(body.occurredAt) : new Date(),
		vetName: body.vetName || null,
		vetClinic: body.vetClinic || null,
		loggedBy: auth.userId
	});

	const event = (
		await db.select().from(schema.healthEvents).where(eq(schema.healthEvents.id, id))
	)[0];
	return json({ data: event }, { status: 201 });
}

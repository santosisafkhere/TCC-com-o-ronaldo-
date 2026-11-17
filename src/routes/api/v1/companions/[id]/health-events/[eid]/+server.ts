import { json } from '@sveltejs/kit';
import { db, schema } from '$lib/server/db';
import { eq, and } from 'drizzle-orm';
import { validateApiKey } from '$lib/server/api/validate';
import { companionForApiUser } from '$lib/server/api/access';
import { notFound } from '$lib/server/api/errors';

export async function GET({ request, params }) {
	const auth = await validateApiKey(request);
	if (!auth) return json({ error: 'Unauthorized' }, { status: 401 });
	if (!(await companionForApiUser(params.id, auth.userId))) notFound('Companion');

	const event = (
		await db
			.select()
			.from(schema.healthEvents)
			.where(
				and(eq(schema.healthEvents.id, params.eid), eq(schema.healthEvents.companionId, params.id))
			)
	)[0];

	if (!event) notFound('Health event');

	return json({ data: event });
}

export async function PUT({ request, params }) {
	const auth = await validateApiKey(request);
	if (!auth) return json({ error: 'Unauthorized' }, { status: 401 });
	if (!(await companionForApiUser(params.id, auth.userId))) notFound('Companion');

	const existing = (
		await db
			.select()
			.from(schema.healthEvents)
			.where(
				and(eq(schema.healthEvents.id, params.eid), eq(schema.healthEvents.companionId, params.id))
			)
	)[0];

	if (!existing) notFound('Health event');

	const body = await request.json().catch(() => null);
	if (!body) return json({ error: 'Invalid JSON' }, { status: 400 });

	const updateFields: Record<string, unknown> = {};
	const allowed = ['type', 'title', 'notes', 'occurredAt', 'vetName', 'vetClinic'];
	for (const field of allowed) {
		if (body[field] !== undefined) updateFields[field] = body[field];
	}
	if (body.occurredAt) updateFields.occurredAt = new Date(body.occurredAt);

	if (Object.keys(updateFields).length > 0) {
		await db
			.update(schema.healthEvents)
			.set(updateFields)
			.where(eq(schema.healthEvents.id, params.eid));
	}

	const event = (
		await db.select().from(schema.healthEvents).where(eq(schema.healthEvents.id, params.eid))
	)[0];

	return json({ data: event });
}

export async function DELETE({ request, params }) {
	const auth = await validateApiKey(request);
	if (!auth) return json({ error: 'Unauthorized' }, { status: 401 });
	if (!(await companionForApiUser(params.id, auth.userId))) notFound('Companion');

	const existing = (
		await db
			.select()
			.from(schema.healthEvents)
			.where(
				and(eq(schema.healthEvents.id, params.eid), eq(schema.healthEvents.companionId, params.id))
			)
	)[0];

	if (!existing) notFound('Health event');

	await db.delete(schema.healthEvents).where(eq(schema.healthEvents.id, params.eid));

	return json({ data: { id: params.eid, deleted: true } });
}

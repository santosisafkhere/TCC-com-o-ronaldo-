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

	const reminder = (
		await db
			.select()
			.from(schema.reminders)
			.where(and(eq(schema.reminders.id, params.rid), eq(schema.reminders.companionId, params.id)))
	)[0];

	if (!reminder) notFound('Reminder');

	return json({ data: reminder });
}

export async function PATCH({ request, params }) {
	const auth = await validateApiKey(request);
	if (!auth) return json({ error: 'Unauthorized' }, { status: 401 });
	if (!(await companionForApiUser(params.id, auth.userId))) notFound('Companion');

	const existing = (
		await db
			.select()
			.from(schema.reminders)
			.where(and(eq(schema.reminders.id, params.rid), eq(schema.reminders.companionId, params.id)))
	)[0];

	if (!existing) notFound('Reminder');

	const body = await request.json().catch(() => null);
	if (!body) return json({ error: 'Invalid JSON' }, { status: 400 });

	const updateFields: Record<string, unknown> = {};

	if (body.completed !== undefined) {
		if (body.completed) {
			updateFields.completedAt = new Date();
			updateFields.completedBy = auth.userId;
		} else {
			updateFields.completedAt = null;
			updateFields.completedBy = null;
		}
	}

	const allowed = [
		'title',
		'description',
		'type',
		'dueAt',
		'isRecurring',
		'recurrenceUnit',
		'recurrenceInterval'
	];
	for (const field of allowed) {
		if (body[field] !== undefined) updateFields[field] = body[field];
	}
	if (body.dueAt) updateFields.dueAt = new Date(body.dueAt);

	if (Object.keys(updateFields).length > 0) {
		await db.update(schema.reminders).set(updateFields).where(eq(schema.reminders.id, params.rid));
	}

	const reminder = (
		await db.select().from(schema.reminders).where(eq(schema.reminders.id, params.rid))
	)[0];
	return json({ data: reminder });
}

export async function DELETE({ request, params }) {
	const auth = await validateApiKey(request);
	if (!auth) return json({ error: 'Unauthorized' }, { status: 401 });
	if (!(await companionForApiUser(params.id, auth.userId))) notFound('Companion');

	const existing = (
		await db
			.select()
			.from(schema.reminders)
			.where(and(eq(schema.reminders.id, params.rid), eq(schema.reminders.companionId, params.id)))
	)[0];

	if (!existing) notFound('Reminder');

	await db.delete(schema.reminders).where(eq(schema.reminders.id, params.rid));

	return json({ data: { id: params.rid, deleted: true } });
}

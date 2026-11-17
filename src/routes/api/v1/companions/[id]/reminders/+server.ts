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
		.from(schema.reminders)
		.where(eq(schema.reminders.companionId, params.id))
		.orderBy(desc(schema.reminders.dueAt));

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
	if (!body.title || !body.type || !body.dueAt) {
		return json({ error: 'title, type, and dueAt are required' }, { status: 400 });
	}

	const validTypes = ['vet', 'medication', 'vaccination', 'grooming', 'other'];
	if (!validTypes.includes(body.type)) {
		return json({ error: `type must be one of: ${validTypes.join(', ')}` }, { status: 400 });
	}

	const id = crypto.randomUUID();
	await db.insert(schema.reminders).values({
		id,
		companionId: params.id,
		title: body.title,
		description: body.description || null,
		type: body.type,
		dueAt: new Date(body.dueAt),
		isRecurring: body.isRecurring || false,
		recurrenceUnit: body.recurrenceUnit || null,
		recurrenceInterval: body.recurrenceInterval || null,
		loggedBy: auth.userId
	});

	const reminder = (await db.select().from(schema.reminders).where(eq(schema.reminders.id, id)))[0];
	return json({ data: reminder }, { status: 201 });
}

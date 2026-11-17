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
		.from(schema.weightEntries)
		.where(eq(schema.weightEntries.companionId, params.id))
		.orderBy(desc(schema.weightEntries.recordedAt));

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
	if (body.weight === undefined || body.weight === null) {
		return json({ error: 'weight is required' }, { status: 400 });
	}

	const id = crypto.randomUUID();
	await db.insert(schema.weightEntries).values({
		id,
		companionId: params.id,
		weight: Number(body.weight),
		unit: body.unit || 'kg',
		recordedAt: body.recordedAt ? new Date(body.recordedAt) : new Date(),
		notes: body.notes || null,
		loggedBy: auth.userId
	});

	const entry = (
		await db.select().from(schema.weightEntries).where(eq(schema.weightEntries.id, id))
	)[0];
	return json({ data: entry }, { status: 201 });
}

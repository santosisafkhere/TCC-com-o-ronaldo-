import { json } from '@sveltejs/kit';
import { db, schema } from '$lib/server/db';
import { eq } from 'drizzle-orm';
import { validateApiKey } from '$lib/server/api/validate';
import { companionForApiUser } from '$lib/server/api/access';
import { notFound } from '$lib/server/api/errors';

export async function GET({ request, params }) {
	const auth = await validateApiKey(request);
	if (!auth) return json({ error: 'Unauthorized' }, { status: 401 });
	if (!(await companionForApiUser(params.id, auth.userId))) notFound('Companion');

	const companion = (
		await db.select().from(schema.companions).where(eq(schema.companions.id, params.id))
	)[0];

	if (!companion) notFound('Companion');

	return json({ data: companion });
}

export async function PUT({ request, params }) {
	const auth = await validateApiKey(request);
	if (!auth) return json({ error: 'Unauthorized' }, { status: 401 });
	if (!(await companionForApiUser(params.id, auth.userId))) notFound('Companion');

	const body = await request.json().catch(() => null);
	if (!body) return json({ error: 'Invalid JSON' }, { status: 400 });

	const existing = (
		await db.select().from(schema.companions).where(eq(schema.companions.id, params.id))
	)[0];

	if (!existing) notFound('Companion');

	const updateFields: Record<string, unknown> = {};
	const allowed = [
		'name',
		'species',
		'breed',
		'dob',
		'sex',
		'weightUnit',
		'microchip',
		'bio',
		'vetName',
		'vetClinic',
		'vetPhone',
		'emergencyContactName',
		'emergencyContactPhone',
		'notesForSitter',
		'feedingSchedule',
		'walkSchedule'
	];

	for (const field of allowed) {
		if (body[field] !== undefined) updateFields[field] = body[field];
	}

	if (Object.keys(updateFields).length > 0) {
		await db.update(schema.companions).set(updateFields).where(eq(schema.companions.id, params.id));
	}

	const companion = (
		await db.select().from(schema.companions).where(eq(schema.companions.id, params.id))
	)[0];

	return json({ data: companion });
}

export async function DELETE({ request, params }) {
	const auth = await validateApiKey(request);
	if (!auth) return json({ error: 'Unauthorized' }, { status: 401 });
	if (!(await companionForApiUser(params.id, auth.userId))) notFound('Companion');

	const existing = (
		await db.select().from(schema.companions).where(eq(schema.companions.id, params.id))
	)[0];

	if (!existing) notFound('Companion');

	await db
		.update(schema.companions)
		.set({ isActive: false, archivedAt: new Date() })
		.where(eq(schema.companions.id, params.id));

	return json({ data: { id: params.id, deleted: true } });
}

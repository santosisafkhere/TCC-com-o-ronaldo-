import { json } from '@sveltejs/kit';
import { db, schema } from '$lib/server/db';
import { eq } from 'drizzle-orm';
import { validateApiKey } from '$lib/server/api/validate';
import { companionForApiUser } from '$lib/server/api/access';
import { notFound } from '$lib/server/api/errors';

export function GET({ request, params }) {
	const auth = validateApiKey(request);
	if (!auth) return json({ error: 'Unauthorized' }, { status: 401 });
	if (!companionForApiUser(params.id, auth.userId)) notFound('Companion');

	const companion = db
		.select()
		.from(schema.companions)
		.where(eq(schema.companions.id, params.id))
		.get();

	if (!companion) notFound('Companion');

	return json({ data: companion });
}

export async function PUT({ request, params }) {
	const auth = validateApiKey(request);
	if (!auth) return json({ error: 'Unauthorized' }, { status: 401 });
	if (!companionForApiUser(params.id, auth.userId)) notFound('Companion');

	const body = await request.json().catch(() => null);
	if (!body) return json({ error: 'Invalid JSON' }, { status: 400 });

	const existing = db
		.select()
		.from(schema.companions)
		.where(eq(schema.companions.id, params.id))
		.get();

	if (!existing) notFound('Companion');

	const updateFields: Record<string, unknown> = {};
	const allowed = ['name', 'species', 'breed', 'dob', 'sex', 'weightUnit', 'microchip',
		'bio', 'vetName', 'vetClinic', 'vetPhone', 'emergencyContactName',
		'emergencyContactPhone', 'notesForSitter', 'feedingSchedule', 'walkSchedule'];

	for (const field of allowed) {
		if (body[field] !== undefined) updateFields[field] = body[field];
	}

	if (Object.keys(updateFields).length > 0) {
		db.update(schema.companions)
			.set(updateFields)
			.where(eq(schema.companions.id, params.id))
			.run();
	}

	const companion = db
		.select()
		.from(schema.companions)
		.where(eq(schema.companions.id, params.id))
		.get();

	return json({ data: companion });
}

export function DELETE({ request, params }) {
	const auth = validateApiKey(request);
	if (!auth) return json({ error: 'Unauthorized' }, { status: 401 });
	if (!companionForApiUser(params.id, auth.userId)) notFound('Companion');

	const existing = db
		.select()
		.from(schema.companions)
		.where(eq(schema.companions.id, params.id))
		.get();

	if (!existing) notFound('Companion');

	db.update(schema.companions)
		.set({ isActive: false, archivedAt: new Date() })
		.where(eq(schema.companions.id, params.id))
		.run();

	return json({ data: { id: params.id, deleted: true } });
}

import { json } from '@sveltejs/kit';
import { db, schema } from '$lib/server/db';
import { eq, desc, inArray } from 'drizzle-orm';
import { validateApiKey } from '$lib/server/api/validate';
import { visibleCompanionIds } from '$lib/server/api/access';
import crypto from 'crypto';

export function GET({ request, url }) {
	const auth = validateApiKey(request);
	if (!auth) return json({ error: 'Unauthorized' }, { status: 401 });

	const page = Math.max(1, Number(url.searchParams.get('page')) || 1);
	const limit = Math.min(100, Math.max(1, Number(url.searchParams.get('limit')) || 20));
	const offset = (page - 1) * limit;

	// Ownership scoping: a key only ever sees pets its user owns or is shared.
	const ids = visibleCompanionIds(auth.userId);
	if (ids.length === 0) {
		return json({ data: [], pagination: { page, limit, total: 0, pages: 0 } });
	}

	const rows = db
		.select()
		.from(schema.companions)
		.where(inArray(schema.companions.id, ids))
		.limit(limit)
		.offset(offset)
		.orderBy(desc(schema.companions.createdAt))
		.all();

	const total = db
		.select({ count: schema.companions.id })
		.from(schema.companions)
		.where(inArray(schema.companions.id, ids))
		.all().length;

	return json({
		data: rows,
		pagination: { page, limit, total, pages: Math.ceil(total / limit) }
	});
}

export async function POST({ request }) {
	const auth = validateApiKey(request);
	if (!auth) return json({ error: 'Unauthorized' }, { status: 401 });

	const body = await request.json().catch(() => null);
	if (!body) return json({ error: 'Invalid JSON' }, { status: 400 });
	if (!body.name) return json({ error: 'name is required' }, { status: 400 });

	const id = crypto.randomUUID();

	db.insert(schema.companions).values({
		id,
		ownerId: auth.userId,
		name: body.name,
		species: body.species || 'dog',
		breed: body.breed || null,
		dob: body.dob || null,
		sex: body.sex || null,
		weightUnit: body.weightUnit || 'kg',
		microchip: body.microchip || null,
		bio: body.bio || null,
		vetName: body.vetName || null,
		vetClinic: body.vetClinic || null,
		vetPhone: body.vetPhone || null,
		emergencyContactName: body.emergencyContactName || null,
		emergencyContactPhone: body.emergencyContactPhone || null,
		notesForSitter: body.notesForSitter || null
	}).run();

	const companion = db.select().from(schema.companions).where(eq(schema.companions.id, id)).get();

	return json({ data: companion }, { status: 201 });
}

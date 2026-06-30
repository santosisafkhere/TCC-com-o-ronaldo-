import { json } from '@sveltejs/kit';
import { db, schema } from '$lib/server/db';
import { eq, and } from 'drizzle-orm';
import { validateApiKey } from '$lib/server/api/validate';
import { companionForApiUser } from '$lib/server/api/access';
import { notFound } from '$lib/server/api/errors';

export function GET({ request, params }) {
	const auth = validateApiKey(request);
	if (!auth) return json({ error: 'Unauthorized' }, { status: 401 });
	if (!companionForApiUser(params.id, auth.userId)) notFound('Companion');

	const entry = db
		.select()
		.from(schema.weightEntries)
		.where(and(eq(schema.weightEntries.id, params.wid), eq(schema.weightEntries.companionId, params.id)))
		.get();

	if (!entry) notFound('Weight entry');

	return json({ data: entry });
}

export function DELETE({ request, params }) {
	const auth = validateApiKey(request);
	if (!auth) return json({ error: 'Unauthorized' }, { status: 401 });
	if (!companionForApiUser(params.id, auth.userId)) notFound('Companion');

	const existing = db
		.select()
		.from(schema.weightEntries)
		.where(and(eq(schema.weightEntries.id, params.wid), eq(schema.weightEntries.companionId, params.id)))
		.get();

	if (!existing) notFound('Weight entry');

	db.delete(schema.weightEntries).where(eq(schema.weightEntries.id, params.wid)).run();

	return json({ data: { id: params.wid, deleted: true } });
}

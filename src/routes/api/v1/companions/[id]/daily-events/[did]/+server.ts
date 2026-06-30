import { json } from '@sveltejs/kit';
import { db, schema } from '$lib/server/db';
import { eq, and } from 'drizzle-orm';
import { validateApiKey } from '$lib/server/api/validate';
import { companionForApiUser } from '$lib/server/api/access';
import { notFound } from '$lib/server/api/errors';

export function DELETE({ request, params }) {
	const auth = validateApiKey(request);
	if (!auth) return json({ error: 'Unauthorized' }, { status: 401 });
	if (!companionForApiUser(params.id, auth.userId)) notFound('Companion');

	const existing = db
		.select()
		.from(schema.dailyEvents)
		.where(and(eq(schema.dailyEvents.id, params.did), eq(schema.dailyEvents.companionId, params.id)))
		.get();

	if (!existing) notFound('Daily event');

	db.delete(schema.dailyEvents).where(eq(schema.dailyEvents.id, params.did)).run();

	return json({ data: { id: params.did, deleted: true } });
}

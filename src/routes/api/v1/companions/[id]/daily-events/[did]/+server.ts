import { json } from '@sveltejs/kit';
import { db, schema } from '$lib/server/db';
import { eq, and } from 'drizzle-orm';
import { validateApiKey } from '$lib/server/api/validate';
import { companionForApiUser } from '$lib/server/api/access';
import { notFound } from '$lib/server/api/errors';

export async function DELETE({ request, params }) {
	const auth = await validateApiKey(request);
	if (!auth) return json({ error: 'Unauthorized' }, { status: 401 });
	if (!(await companionForApiUser(params.id, auth.userId))) notFound('Companion');

	const existing = (
		await db
			.select()
			.from(schema.dailyEvents)
			.where(
				and(eq(schema.dailyEvents.id, params.did), eq(schema.dailyEvents.companionId, params.id))
			)
	)[0];

	if (!existing) notFound('Daily event');

	await db.delete(schema.dailyEvents).where(eq(schema.dailyEvents.id, params.did));

	return json({ data: { id: params.did, deleted: true } });
}

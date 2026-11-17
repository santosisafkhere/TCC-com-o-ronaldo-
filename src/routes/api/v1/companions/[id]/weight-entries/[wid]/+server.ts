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

	const entry = (
		await db
			.select()
			.from(schema.weightEntries)
			.where(
				and(
					eq(schema.weightEntries.id, params.wid),
					eq(schema.weightEntries.companionId, params.id)
				)
			)
	)[0];

	if (!entry) notFound('Weight entry');

	return json({ data: entry });
}

export async function DELETE({ request, params }) {
	const auth = await validateApiKey(request);
	if (!auth) return json({ error: 'Unauthorized' }, { status: 401 });
	if (!(await companionForApiUser(params.id, auth.userId))) notFound('Companion');

	const existing = (
		await db
			.select()
			.from(schema.weightEntries)
			.where(
				and(
					eq(schema.weightEntries.id, params.wid),
					eq(schema.weightEntries.companionId, params.id)
				)
			)
	)[0];

	if (!existing) notFound('Weight entry');

	await db.delete(schema.weightEntries).where(eq(schema.weightEntries.id, params.wid));

	return json({ data: { id: params.wid, deleted: true } });
}

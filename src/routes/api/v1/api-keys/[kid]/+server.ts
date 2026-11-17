import { json } from '@sveltejs/kit';
import { db, schema } from '$lib/server/db';
import { eq, and } from 'drizzle-orm';
import { validateApiKey } from '$lib/server/api/validate';
import { notFound } from '$lib/server/api/errors';

export async function DELETE({ request, params }) {
	const auth = await validateApiKey(request);
	if (!auth) return json({ error: 'Unauthorized' }, { status: 401 });

	const existing = (
		await db
			.select()
			.from(schema.apiKeys)
			.where(and(eq(schema.apiKeys.id, params.kid), eq(schema.apiKeys.userId, auth.userId)))
	)[0];

	if (!existing) notFound('API key');

	await db.delete(schema.apiKeys).where(eq(schema.apiKeys.id, params.kid));

	return json({ data: { id: params.kid, deleted: true } });
}

import { json } from '@sveltejs/kit';
import { db, schema } from '$lib/server/db';
import { eq, and } from 'drizzle-orm';
import { validateApiKey } from '$lib/server/api/validate';
import { notFound } from '$lib/server/api/errors';

export function DELETE({ request, params }) {
	const auth = validateApiKey(request);
	if (!auth) return json({ error: 'Unauthorized' }, { status: 401 });

	const existing = db
		.select()
		.from(schema.apiKeys)
		.where(and(eq(schema.apiKeys.id, params.kid), eq(schema.apiKeys.userId, auth.userId)))
		.get();

	if (!existing) notFound('API key');

	db.delete(schema.apiKeys).where(eq(schema.apiKeys.id, params.kid)).run();

	return json({ data: { id: params.kid, deleted: true } });
}

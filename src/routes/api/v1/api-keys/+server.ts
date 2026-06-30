import { json } from '@sveltejs/kit';
import { db, schema } from '$lib/server/db';
import { eq, desc } from 'drizzle-orm';
import { validateApiKey } from '$lib/server/api/validate';
import crypto from 'crypto';
import { sha256 } from '@oslojs/crypto/sha2';
import { encodeHexLowerCase } from '@oslojs/encoding';

export function GET({ request }) {
	const auth = validateApiKey(request);
	if (!auth) return json({ error: 'Unauthorized' }, { status: 401 });

	const rows = db
		.select({
			id: schema.apiKeys.id,
			name: schema.apiKeys.name,
			keyPrefix: schema.apiKeys.keyPrefix,
			lastUsedAt: schema.apiKeys.lastUsedAt,
			createdAt: schema.apiKeys.createdAt
		})
		.from(schema.apiKeys)
		.where(eq(schema.apiKeys.userId, auth.userId))
		.orderBy(desc(schema.apiKeys.createdAt))
		.all();

	return json({ data: rows });
}

export async function POST({ request }) {
	const localAuth = validateApiKey(request);
	if (!localAuth) return json({ error: 'Unauthorized' }, { status: 401 });

	const body = await request.json().catch(() => null);
	const name = body?.name || 'Default';

	const id = crypto.randomUUID();
	const rawKey = `gp_${crypto.randomBytes(24).toString('hex')}`;
	const keyPrefix = rawKey.slice(0, 11);
	const keyHash = encodeHexLowerCase(sha256(new TextEncoder().encode(rawKey)));

	db.insert(schema.apiKeys).values({
		id,
		userId: localAuth.userId,
		name,
		keyHash,
		keyPrefix
	}).run();

	return json({
		data: { id, name, keyPrefix, createdAt: new Date() },
		rawKey: rawKey
	}, { status: 201 });
}

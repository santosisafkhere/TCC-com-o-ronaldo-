import { sha256 } from '@oslojs/crypto/sha2';
import { encodeHexLowerCase } from '@oslojs/encoding';
import { db, schema } from '$lib/server/db';
import { eq } from 'drizzle-orm';

export interface ApiAuth {
	userId: string;
	keyId: string;
}

export function validateApiKey(request: Request): ApiAuth | null {
	const auth = request.headers.get('authorization');
	if (!auth || !auth.startsWith('Bearer ')) return null;

	const key = auth.slice(7).trim();
	if (!key.startsWith('gp_')) return null;

	const prefix = key.slice(0, 11);
	const hash = encodeHexLowerCase(sha256(new TextEncoder().encode(key)));

	const row = db
		.select()
		.from(schema.apiKeys)
		.where(eq(schema.apiKeys.keyPrefix, prefix))
		.get();

	if (!row || row.keyHash !== hash) return null;

	db.update(schema.apiKeys)
		.set({ lastUsedAt: new Date() })
		.where(eq(schema.apiKeys.id, row.id))
		.run();

	return { userId: row.userId, keyId: row.id };
}

import { and, eq, gt, isNull, or } from 'drizzle-orm';
import { db, schema } from '$lib/server/db';

export type ShareScope = 'read' | 'write';

// A share counts only while it hasn't expired. Null expiresAt = never expires.
// Exported so the sync REST-API access layer can reuse the same predicate.
export function shareNotExpired(now: Date) {
	return or(isNull(schema.companionShares.expiresAt), gt(schema.companionShares.expiresAt, now));
}

// Scope of the active share of `companionId` with `userId`, or null when there
// is none. 'write' implies read.
export async function activeShareScope(
	companionId: string,
	userId: string,
	now: Date = new Date()
): Promise<ShareScope | null> {
	const row = await db.query.companionShares.findFirst({
		where: and(
			eq(schema.companionShares.companionId, companionId),
			eq(schema.companionShares.granteeUserId, userId),
			shareNotExpired(now)
		),
		columns: { scope: true }
	});
	return row?.scope ?? null;
}

// Companion ids actively shared with `userId` (any scope).
export async function sharedCompanionIds(
	userId: string,
	now: Date = new Date()
): Promise<string[]> {
	const rows = await db.query.companionShares.findMany({
		where: and(eq(schema.companionShares.granteeUserId, userId), shareNotExpired(now)),
		columns: { companionId: true }
	});
	return rows.map((r) => r.companionId);
}

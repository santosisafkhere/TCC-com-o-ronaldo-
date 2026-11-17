import { eq, lt, sql } from 'drizzle-orm';
import { db, schema } from '$lib/server/db';

// Fixed-window attempt counter, stored in the database so the limit holds
// across serverless instances and restarts (an in-memory Map would give every
// instance its own fresh budget).
//
// One atomic upsert per attempt: a new or expired window restarts at 1,
// otherwise the counter goes up. The attempt is allowed while the counter is
// within `limit`, i.e. the first `limit` attempts of each window pass.

export async function checkRateLimit(
	key: string,
	limit = 5,
	windowMs = 15 * 60 * 1000
): Promise<boolean> {
	const [row] = await rateLimitUpsert(key, windowMs);
	return (row?.count ?? 1) <= limit;
}

/** The upsert behind checkRateLimit, exposed so tests can inspect its SQL. */
export function rateLimitUpsert(key: string, windowMs: number, now = new Date()) {
	const resetAt = new Date(now.getTime() + windowMs);
	const t = schema.rateLimits;
	// Raw-SQL parameters bypass the column's date mapping: postgres.js would
	// send a Date as its toString() ("Tue Nov 17 2026 …"), which Postgres
	// rejects. Send ISO strings with an explicit cast instead.
	const nowSql = sql`${now.toISOString()}::timestamptz`;
	const resetAtSql = sql`${resetAt.toISOString()}::timestamptz`;
	const expired = sql`${t.resetAt} <= ${nowSql}`;

	return db
		.insert(t)
		.values({ key, count: 1, resetAt })
		.onConflictDoUpdate({
			target: t.key,
			set: {
				count: sql`CASE WHEN ${expired} THEN 1 ELSE ${t.count} + 1 END`,
				resetAt: sql`CASE WHEN ${expired} THEN ${resetAtSql} ELSE ${t.resetAt} END`
			}
		})
		.returning({ count: t.count });
}

export async function clearRateLimit(key: string): Promise<void> {
	await db.delete(schema.rateLimits).where(eq(schema.rateLimits.key, key));
}

/** Drop windows that have already ended. Called from the periodic cron run. */
export async function purgeExpiredRateLimits(now = new Date()): Promise<number> {
	const removed = await db
		.delete(schema.rateLimits)
		.where(lt(schema.rateLimits.resetAt, now))
		.returning({ key: schema.rateLimits.key });
	return removed.length;
}

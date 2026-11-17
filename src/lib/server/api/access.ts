import { db, schema } from '$lib/server/db';
import { and, eq } from 'drizzle-orm';
import type { Companion } from '$lib/server/db/schema';
import { shareNotExpired } from '$lib/server/shares';

// An active (non-expired) share row for this companion + user, or undefined.
async function activeShare(companionId: string, userId: string, now: Date) {
	return (
		await db
			.select()
			.from(schema.companionShares)
			.where(
				and(
					eq(schema.companionShares.companionId, companionId),
					eq(schema.companionShares.granteeUserId, userId),
					shareNotExpired(now)
				)
			)
	)[0];
}

// Ownership scoping for the REST API. An API key belongs to a user; that user
// may reach a companion only when they own it, are assigned to it (a sitter),
// or have it shared with them (e.g. a clinic). Returns the companion when access
// is allowed, else null.
export async function companionForApiUser(
	companionId: string,
	userId: string
): Promise<Companion | null> {
	const companion = (
		await db.select().from(schema.companions).where(eq(schema.companions.id, companionId))
	)[0];
	if (!companion) return null;
	if (companion.ownerId === userId) return companion;

	const assigned = (
		await db
			.select()
			.from(schema.companionCaretakers)
			.where(
				and(
					eq(schema.companionCaretakers.companionId, companionId),
					eq(schema.companionCaretakers.userId, userId)
				)
			)
	)[0];
	if (assigned) return companion;

	return (await activeShare(companionId, userId, new Date())) ? companion : null;
}

// Companion ids the API user may see (owned + assigned + shared). Used to scope
// list endpoints without leaking other owners' pets.
export async function visibleCompanionIds(userId: string): Promise<string[]> {
	const now = new Date();
	const owned = await db
		.select({ id: schema.companions.id })
		.from(schema.companions)
		.where(eq(schema.companions.ownerId, userId));
	const assigned = await db
		.select({ id: schema.companionCaretakers.companionId })
		.from(schema.companionCaretakers)
		.where(eq(schema.companionCaretakers.userId, userId));
	const shared = await db
		.select({ id: schema.companionShares.companionId })
		.from(schema.companionShares)
		.where(and(eq(schema.companionShares.granteeUserId, userId), shareNotExpired(now)));
	return [
		...new Set([
			...owned.map((r) => r.id),
			...assigned.map((r) => r.id),
			...shared.map((r) => r.id)
		])
	];
}

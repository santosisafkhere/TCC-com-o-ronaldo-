import { db, schema } from '$lib/server/db';
import { and, eq } from 'drizzle-orm';
import type { Companion } from '$lib/server/db/schema';

// Ownership scoping for the REST API. An API key belongs to a user; that user
// may reach a companion only when they own it or are assigned to it (a shared
// caretaker/clinic). Returns the companion when access is allowed, else null.
// Synchronous to match the v1 endpoints' better-sqlite3 style.
export function companionForApiUser(companionId: string, userId: string): Companion | null {
	const companion = db
		.select()
		.from(schema.companions)
		.where(eq(schema.companions.id, companionId))
		.get();
	if (!companion) return null;
	if (companion.ownerId === userId) return companion;

	const assigned = db
		.select()
		.from(schema.companionCaretakers)
		.where(
			and(
				eq(schema.companionCaretakers.companionId, companionId),
				eq(schema.companionCaretakers.userId, userId)
			)
		)
		.get();
	return assigned ? companion : null;
}

// Companion ids the API user may see (owned + shared). Used to scope list
// endpoints without leaking other owners' pets.
export function visibleCompanionIds(userId: string): string[] {
	const owned = db
		.select({ id: schema.companions.id })
		.from(schema.companions)
		.where(eq(schema.companions.ownerId, userId))
		.all();
	const shared = db
		.select({ id: schema.companionCaretakers.companionId })
		.from(schema.companionCaretakers)
		.where(eq(schema.companionCaretakers.userId, userId))
		.all();
	return [...new Set([...owned.map((r) => r.id), ...shared.map((r) => r.id)])];
}

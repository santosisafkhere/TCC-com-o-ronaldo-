import bcrypt from 'bcryptjs';
import { eq } from 'drizzle-orm';
import type { PgDatabase, PgQueryResultHKT } from 'drizzle-orm/pg-core';
import * as schema from '$lib/server/db/schema';

// A fixed, well-known account for local development and manual testing. It is
// ONLY provisioned (and only surfaced on the login screen) when TEST_LOGIN is
// enabled — off by default, so a real deployment never ships this backdoor.
// The password satisfies the setup rules (>= 8 chars) so it is a valid login.
export const TEST_LOGIN = {
	username: 'teste',
	password: 'teste123',
	displayName: 'Usuário de Teste'
} as const;

// Stable id so re-running the seed never creates duplicates.
const TEST_USER_ID = 'test-login-user';

type Db = PgDatabase<PgQueryResultHKT, typeof schema>;

/**
 * Idempotently ensures the test-login member account exists. Safe to call on
 * every boot: it inserts the row only when absent and leaves any existing row
 * (including a changed password) untouched. Returns true if it created the row.
 */
export async function ensureTestUser(db: Db): Promise<boolean> {
	const existing = await db.query.users.findFirst({
		where: eq(schema.users.id, TEST_USER_ID),
		columns: { id: true }
	});
	if (existing) return false;

	await db.insert(schema.users).values({
		id: TEST_USER_ID,
		username: TEST_LOGIN.username,
		displayName: TEST_LOGIN.displayName,
		passwordHash: bcrypt.hashSync(TEST_LOGIN.password, 12),
		role: 'member'
	});
	return true;
}

import type { Config } from 'drizzle-kit';

// `generate` only diffs the schema and needs no connection. `migrate` applies
// ./drizzle to the Postgres named by DATABASE_URL (use the direct/session
// connection string for migrations, not the transaction pooler).
export default {
	schema: './src/lib/server/db/schema.ts',
	out: './drizzle',
	dialect: 'postgresql',
	// Keep drizzle's own bookkeeping inside the app schema too.
	migrations: { schema: 'achei', table: '__drizzle_migrations' },
	schemaFilter: ['achei'],
	dbCredentials: {
		url: process.env.DATABASE_URL ?? ''
	}
} satisfies Config;

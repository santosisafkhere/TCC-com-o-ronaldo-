import { drizzle as drizzlePostgres } from 'drizzle-orm/postgres-js';
import type { PgDatabase, PgQueryResultHKT } from 'drizzle-orm/pg-core';
import { sql, type SQL } from 'drizzle-orm';
import postgres from 'postgres';
import { mkdirSync, existsSync } from 'fs';
import { resolve } from 'path';
import { env } from '$env/dynamic/private';
import * as schema from './schema';

// Two drivers, one Postgres dialect:
//
//   - DATABASE_URL = postgres://… (Supabase, any hosted Postgres) -> postgres.js.
//     Schema migrations are NOT applied at boot: serverless instances start
//     often and concurrently, so run `npm run db:migrate` at deploy time.
//   - anything else -> PGlite, an in-process Postgres. Used for local dev (data
//     persisted under ./data/pgdata) and for tests (DATABASE_URL=memory://).
//     Migrations are applied at import, so a fresh checkout just works.
//
// Both expose the same drizzle pg-core query API, so app code never branches.

export type Db = PgDatabase<PgQueryResultHKT, typeof schema>;

const MIGRATIONS_DIR = './drizzle';
// process.env wins (production, tests); `vite dev` only exposes .env through
// SvelteKit's env module, so fall back to that.
const rawUrl = (process.env.DATABASE_URL ?? env.DATABASE_URL ?? '').trim();
const isPostgresUrl = /^postgres(ql)?:\/\//i.test(rawUrl);

async function openPglite(): Promise<Db> {
	let dataDir: string | undefined;
	if (rawUrl === 'memory://') {
		dataDir = undefined;
	} else {
		// A leftover SQLite path (pre-Postgres installs) is not a PGlite data
		// directory; ignore it rather than writing a cluster next to the .db file.
		const custom = rawUrl && !/\.(db|sqlite3?)$/i.test(rawUrl) ? rawUrl : '';
		dataDir = resolve(custom || './data/pgdata');
		mkdirSync(dataDir, { recursive: true });
	}

	if (process.env.NODE_ENV !== 'production') {
		console.info(`[einvault] Database: PGlite (${dataDir ?? 'in-memory'})`);
		console.info('[einvault] For Tippy and Molly 🐾 and Ein who keeps watch');
	}

	// Loaded lazily: the embedded Postgres (WASM, several MB) is never needed
	// when DATABASE_URL points at a real server, e.g. on Vercel.
	const [{ PGlite }, { unaccent }, { drizzle: drizzlePglite }, { migrate: migratePglite }] =
		await Promise.all([
			import('@electric-sql/pglite'),
			import('@electric-sql/pglite/contrib/unaccent'),
			import('drizzle-orm/pglite'),
			import('drizzle-orm/pglite/migrator')
		]);
	const client = new PGlite({ dataDir, extensions: { unaccent } });
	const pglite = drizzlePglite(client, { schema });
	if (existsSync(MIGRATIONS_DIR)) {
		await migratePglite(pglite, {
			migrationsFolder: MIGRATIONS_DIR,
			migrationsSchema: schema.DB_SCHEMA
		});
	} else {
		console.warn('[einvault] No migrations found: run `npm run db:generate` then restart.');
	}
	return pglite as unknown as Db;
}

function openPostgres(): Db {
	if (process.env.NODE_ENV !== 'production') {
		console.info(`[einvault] Database: Postgres (${new URL(rawUrl).host})`);
	}
	const client = postgres(rawUrl, {
		// Supabase's transaction-mode pooler (port 6543) does not support
		// prepared statements.
		prepare: false,
		// One serverless instance handles one request at a time; a small pool
		// keeps the total connection count under the pooler's limit.
		max: Number(process.env.DATABASE_POOL_MAX) || 5,
		idle_timeout: 20
	});
	return drizzlePostgres(client, { schema }) as unknown as Db;
}

export const db: Db = isPostgresUrl ? openPostgres() : await openPglite();

// Run a raw query and get plain row objects, whichever driver is active
// (postgres.js resolves to an array of rows, PGlite to `{ rows }`).
export async function rawRows<T>(query: SQL): Promise<T[]> {
	const res = (await db.execute(query)) as unknown;
	if (Array.isArray(res)) return res as T[];
	return (res as { rows: T[] }).rows;
}

// Postgres unique-constraint violation, optionally narrowed to one constraint
// (index) name. Drivers may wrap the original error, so walk `cause`.
export function isUniqueViolation(err: unknown, constraint?: string): boolean {
	for (let e = err as { code?: string; constraint?: string; cause?: unknown } | undefined; e; ) {
		if (e.code === '23505') {
			return !constraint || !e.constraint || e.constraint === constraint;
		}
		e = e.cause as typeof e;
	}
	return false;
}

export { schema };

// Serialize a count-then-insert critical section on `key` for the rest of the
// current transaction (replaces SQLite's BEGIN IMMEDIATE). Concurrent
// transactions taking the same key queue up; the lock is released at commit or
// rollback, so there is nothing to clean up.
export async function lockInTransaction(
	tx: { execute: (query: SQL) => PromiseLike<unknown> },
	key: string
): Promise<void> {
	await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${key}))`);
}

import { drizzle as drizzlePostgres } from 'drizzle-orm/postgres-js';
import type { PgDatabase, PgQueryResultHKT } from 'drizzle-orm/pg-core';
import { sql, type SQL } from 'drizzle-orm';
import postgres from 'postgres';
import { mkdirSync, existsSync } from 'fs';
import { resolve } from 'path';
import { env } from '$env/dynamic/private';
import { building } from '$app/environment';
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
const rawUrl = cleanDatabaseUrl((process.env.DATABASE_URL ?? env.DATABASE_URL ?? '').trim());
const isPostgresUrl = /^postgres(ql)?:\/\//i.test(rawUrl);

// Values pasted into a terminal prompt (e.g. `vercel env add`) can carry
// invisible bracketed-paste control sequences or stray prompt text around the
// connection string. Keep just the postgres:// URL when one is embedded, and
// say so in the log (without printing the value, which holds a password).
export function cleanDatabaseUrl(value: string): string {
	if (/^postgres(ql)?:\/\/[^\s\x00-\x1f\x7f]+$/i.test(value)) return value;
	const match = value.match(/postgres(?:ql)?:\/\/[^\s\x00-\x1f\x7f"']+/i);
	if (!match) {
		// Copied without its scheme: "user:password@host:port/database".
		if (/^[^\s/@:]+:[^\s@]+@[a-z0-9.-]+:\d+\/[^\s/]+$/i.test(value)) {
			console.warn(
				'[einvault] DATABASE_URL is missing its "postgresql://" prefix; adding it. ' +
					'Fix the stored value when convenient.'
			);
			return `postgresql://${value}`;
		}
		return value;
	}
	console.warn(
		'[einvault] DATABASE_URL had extra characters around the connection string ' +
			'(often from pasting into a terminal); using only the postgres:// part.'
	);
	return match[0];
}

// Serverless hosts have a read-only, throwaway disk: the embedded database
// cannot live there. Fail with an explanation in the function logs instead of
// an opaque "read-only file system" crash. Not while building: SvelteKit loads
// server modules at build time to analyse routes, and runtime-only variables
// (DATABASE_URL) need not exist then — that analysis uses an in-memory DB.
const isServerless = !!process.env.VERCEL && !building;
if (isServerless && !isPostgresUrl) {
	throw new Error(
		rawUrl
			? '[einvault] DATABASE_URL must be a postgresql:// connection string on Vercel ' +
					'(the embedded database cannot run on a read-only filesystem). The current value ' +
					`has ${rawUrl.length} characters and starts with char codes ` +
					`${[...rawUrl.slice(0, 3)].map((c) => c.charCodeAt(0)).join(',')}.`
			: '[einvault] DATABASE_URL is not set. On Vercel, add it under Project Settings -> ' +
					'Environment Variables, using the Supabase "Transaction pooler" string ' +
					'(port 6543), then redeploy.'
	);
}
if (isServerless && /^db\.[a-z0-9]+\.supabase\.co$/i.test(safeHost(rawUrl))) {
	// The direct host resolves to IPv6 only; Vercel functions have no IPv6, so
	// every query would fail to connect.
	console.error(
		'[einvault] DATABASE_URL uses the direct Supabase host (db.<ref>.supabase.co), which ' +
			'is IPv6-only and unreachable from Vercel. Use the "Transaction pooler" connection ' +
			'string (…pooler.supabase.com:6543) instead.'
	);
}

function safeHost(url: string): string {
	try {
		return new URL(url).hostname;
	} catch {
		return '';
	}
}

async function openPglite(): Promise<Db> {
	let dataDir: string | undefined;
	if (rawUrl === 'memory://' || building) {
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

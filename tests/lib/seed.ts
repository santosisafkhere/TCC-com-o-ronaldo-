import fs from 'node:fs';
import path from 'node:path';
import { PGlite } from '@electric-sql/pglite';
import { unaccent } from '@electric-sql/pglite/contrib/unaccent';
import { drizzle } from 'drizzle-orm/pglite';
import { migrate } from 'drizzle-orm/pglite/migrator';
import * as schema from '../../src/lib/server/db/schema';
import { seedRows, copyDemoPhotoFiles } from '../../src/lib/server/db/demo-seed';

export { SEED } from '../../src/lib/server/db/demo-seed';

export type Role = 'admin' | 'member' | 'caretaker';

const MIGRATIONS_FOLDER = path.resolve(import.meta.dirname, '../../drizzle');

// The app server opens the same directory with PGlite (any DATABASE_URL that is
// not a postgres:// URL is a PGlite data dir), and its parent doubles as DATA_DIR.
async function openMigrated(dir: string) {
	fs.rmSync(dir, { recursive: true, force: true });
	fs.mkdirSync(dir, { recursive: true });
	const dbPath = path.join(dir, 'pgdata');
	const client = new PGlite({ dataDir: dbPath, extensions: { unaccent } });
	const db = drizzle(client, { schema });
	await migrate(db, { migrationsFolder: MIGRATIONS_FOLDER, migrationsSchema: schema.DB_SCHEMA });
	return { client, db, dbPath };
}

/** Creates dir, migrates a fresh DB at dir/pgdata, seeds it, closes. */
export async function createSeededDb(dir: string): Promise<string> {
	const { client, db, dbPath } = await openMigrated(dir);

	const now = Date.now();
	await seedRows(db as never, { now });

	// Copy photo assets so e2e photo routes resolve.
	copyDemoPhotoFiles(path.join(dir, 'uploads'), now);

	await client.close(); // flush to disk before the server opens the directory
	return dbPath;
}

/**
 * Like createSeededDb but omits the active caretaker shift.
 * Use for off-shift caretaker tests that need a dedicated per-test server.
 */
export async function createSeededDbNoShift(dir: string): Promise<string> {
	const { client, db, dbPath } = await openMigrated(dir);
	const now = Date.now();
	await seedRows(db as never, { now });
	copyDemoPhotoFiles(path.join(dir, 'uploads'), now);
	await client.query("DELETE FROM achei.caretaker_shifts WHERE id = 'seed-shift-active'");
	await client.close();
	return dbPath;
}

/** Migrates an empty DB (pristine instance for the setup wizard project). */
export async function createEmptyDb(dir: string): Promise<string> {
	const { client, dbPath } = await openMigrated(dir);
	await client.close();
	return dbPath;
}

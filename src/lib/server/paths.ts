import { env } from '$env/dynamic/private';
import { dirname, resolve } from 'path';

// Where local uploads and scratch files live. DATA_DIR wins when set. The old
// behaviour (the directory holding the SQLite file named by DATABASE_URL) is
// kept only for file-path values; a postgres:// URL has no directory.
function resolveDataDir(): string {
	if (env.DATA_DIR) return resolve(env.DATA_DIR);
	const url = env.DATABASE_URL?.trim();
	if (url && !/^[a-z][a-z0-9+.-]*:\/\//i.test(url)) return dirname(resolve(url));
	return resolve('./data');
}

export const DATA_DIR = resolveDataDir();

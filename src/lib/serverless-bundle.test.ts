import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';

// Vercel's function loader cannot require() ESM, and its file tracer misses
// require() calls left inside bundled code. sanitize-html is therefore bundled
// into the server build together with its whole dependency tree (vite.config
// ssr.noExternal). Forgetting one package broke production twice; this test
// fails as soon as a dependency of a bundled package is missing from the list.

const ROOT = resolve(import.meta.dirname, '../..');
const BUNDLED_ROOTS = ['sanitize-html'];

function noExternalList(): string[] {
	const config = readFileSync(join(ROOT, 'vite.config.ts'), 'utf8');
	const block = config.match(/noExternal:\s*\[([\s\S]*?)\]/);
	if (!block) throw new Error('ssr.noExternal not found in vite.config.ts');
	return [...block[1].matchAll(/'([^']+)'/g)].map((m) => m[1]);
}

// Resolve a dependency the way Node does: nearest node_modules upwards.
function findPackageDir(name: string, fromDir: string): string {
	for (let dir = fromDir; ; dir = dirname(dir)) {
		const candidate = join(dir, 'node_modules', name);
		if (existsSync(join(candidate, 'package.json'))) return candidate;
		if (dirname(dir) === dir) throw new Error(`cannot resolve ${name} from ${fromDir}`);
	}
}

function dependencyTree(root: string): Set<string> {
	const seen = new Set<string>();
	const queue: [string, string][] = [[root, ROOT]];
	while (queue.length) {
		const [name, from] = queue.shift()!;
		const dir = findPackageDir(name, from);
		if (seen.has(name)) continue;
		seen.add(name);
		const pkg = JSON.parse(readFileSync(join(dir, 'package.json'), 'utf8'));
		for (const dep of Object.keys(pkg.dependencies ?? {})) queue.push([dep, dir]);
	}
	return seen;
}

describe('serverless bundle', () => {
	it('bundles the full dependency tree of packages that must not load at runtime', () => {
		const listed = new Set(noExternalList());
		for (const root of BUNDLED_ROOTS) {
			const missing = [...dependencyTree(root)].filter((dep) => !listed.has(dep));
			expect(missing, `add to ssr.noExternal in vite.config.ts`).toEqual([]);
		}
	});
});

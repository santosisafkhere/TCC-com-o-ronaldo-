import { describe, it, expect } from 'vitest';
import { POSTGRES_OPTIONS } from './index';

// Production runs on postgres.js behind Supabase's transaction pooler, which
// the in-memory test database cannot imitate. These settings were each found
// the hard way in production; keep them pinned.
describe('hosted Postgres connection options', () => {
	it('never pipelines queries on one connection (pooler hangs on pipelining)', () => {
		expect(POSTGRES_OPTIONS.max_pipeline).toBe(1);
	});

	it('does not use prepared statements (unsupported by the pooler)', () => {
		expect(POSTGRES_OPTIONS.prepare).toBe(false);
	});

	it('fails stuck queries instead of waiting forever', () => {
		expect(POSTGRES_OPTIONS.query_timeout).toBeGreaterThan(0);
		expect(POSTGRES_OPTIONS.query_timeout).toBeLessThan(60);
	});
});

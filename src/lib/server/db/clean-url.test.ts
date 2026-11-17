import { describe, it, expect, vi } from 'vitest';
import { cleanDatabaseUrl } from './index';

const URL_OK = 'postgresql://postgres.ref:p%40ss@aws-1-us-east-1.pooler.supabase.com:6543/postgres';

describe('cleanDatabaseUrl', () => {
	it('leaves a clean connection string untouched', () => {
		expect(cleanDatabaseUrl(URL_OK)).toBe(URL_OK);
		expect(cleanDatabaseUrl('memory://')).toBe('memory://');
		expect(cleanDatabaseUrl('./data/pgdata')).toBe('./data/pgdata');
	});

	it('strips bracketed-paste markers and prompt text around the URL', () => {
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
		expect(cleanDatabaseUrl(`\x1b[200~${URL_OK}\x1b[201~`)).toBe(URL_OK);
		expect(cleanDatabaseUrl(`PS C:\\api_pet> \n${URL_OK}`)).toBe(URL_OK);
		expect(cleanDatabaseUrl(`"${URL_OK}"`)).toBe(URL_OK);
		expect(warn).toHaveBeenCalled();
		// The warning never contains the value itself.
		for (const call of warn.mock.calls) expect(String(call[0])).not.toContain('p%40ss');
		warn.mockRestore();
	});
});

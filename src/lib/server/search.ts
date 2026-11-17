import { sql, type SQL } from 'drizzle-orm';
import { rawRows } from '$lib/server/db';

export const SEARCH_ENTITY_TYPES = [
	'journal',
	'health',
	'reminder',
	'document',
	'daily',
	'weight',
	'media'
] as const;
export type SearchEntityType = (typeof SEARCH_ENTITY_TYPES)[number];

export interface SearchFilters {
	text: string;
	companionIds: string[];
	types: SearchEntityType[];
	after?: string; // YYYY-MM-DD inclusive lower bound on event_date
	before?: string; // YYYY-MM-DD inclusive upper bound
	// Ownership scope: the companion ids the caller may read. Always enforced
	// when present (undefined = unrestricted, e.g. admins). Empty = nothing
	// visible, so the query matches no rows. The index holds every owner's data,
	// so this is what keeps one owner's records out of another's results.
	allowedCompanionIds?: string[];
}

export function hasActiveFilters(f: SearchFilters): boolean {
	return f.companionIds.length > 0 || f.types.length > 0 || !!f.after || !!f.before;
}

/**
 * Build the shared filter WHERE fragment + bound params. Same-kind lists are OR
 * (IN), different kinds are AND. Returns an empty sql string when no filters.
 */
export function buildFilterClause(f: SearchFilters): { sql: string; params: string[] } {
	const parts: string[] = [];
	const params: string[] = [];
	// Ownership scope first — enforced whenever provided, regardless of the
	// user-supplied companion filter below.
	if (f.allowedCompanionIds !== undefined) {
		if (f.allowedCompanionIds.length === 0) {
			parts.push('1 = 0');
		} else {
			parts.push(`s.companion_id IN (${f.allowedCompanionIds.map(() => '?').join(', ')})`);
			params.push(...f.allowedCompanionIds);
		}
	}
	if (f.companionIds.length) {
		parts.push(`s.companion_id IN (${f.companionIds.map(() => '?').join(', ')})`);
		params.push(...f.companionIds);
	}
	if (f.types.length) {
		parts.push(`s.entity_type IN (${f.types.map(() => '?').join(', ')})`);
		params.push(...f.types);
	}
	if (f.after) {
		parts.push('s.event_date >= ?');
		params.push(f.after);
	}
	if (f.before) {
		parts.push('s.event_date <= ?');
		params.push(f.before);
	}
	return { sql: parts.join(' AND '), params };
}

export interface SearchResult {
	type: SearchEntityType;
	id: string;
	companionId: string;
	companionName: string;
	title: string;
	/** Excerpt with \x01/\x02 sentinel pairs around matched terms. Plain text otherwise. */
	snippet: string;
	date: string;
	href: string;
}

/**
 * Build a Postgres tsquery string from raw user input: every run of letters or
 * digits becomes a prefix term (`tok:*`) and all terms must match. Anything
 * else — including every tsquery operator — is dropped, which makes the
 * expression injection-proof. Returns null when nothing searchable remains
 * (caller returns empty results).
 */
export function buildMatchQuery(raw: string): string | null {
	if (raw.trim().length < 2) return null;
	const tokens = raw
		.replace(/[^\p{L}\p{N}]+/gu, ' ')
		.trim()
		.split(/\s+/)
		.filter((t) => t.length > 0)
		.map((t) => `${t}:*`);
	if (tokens.length === 0) return null;
	return tokens.join(' & ');
}

const HREF_BY_TYPE: Record<
	SearchEntityType,
	(companionId: string, date: string, id: string) => string
> = {
	journal: (c, d) => `/${c}/journal/${d}`,
	daily: (c, d) => `/${c}/journal/${d}`,
	health: (c, _d, id) => `/${c}/health?detailHealth=${id}`,
	weight: (c, _d, id) => `/${c}/health?detailWeight=${id}`,
	reminder: (c, _d, id) => `/${c}/reminders?detail=${id}`,
	document: (c, _d, id) => `/${c}/documents?preview=${id}`,
	media: (c, d, id) => `/${c}/journal/${d}?media=${id}`
};

interface SearchRow {
	entity_type: SearchEntityType;
	entity_id: string;
	companion_id: string;
	companion_name: string;
	title: string;
	excerpt: string;
	event_date: string | null;
}

// buildFilterClause emits `?` placeholders; turn that into a parameterized
// drizzle fragment (values are always bound, never inlined).
function bindPlaceholders(text: string, params: string[]): SQL {
	const chunks = text.split('?');
	const parts: SQL[] = [];
	chunks.forEach((chunk, i) => {
		parts.push(sql.raw(chunk));
		if (i < params.length) parts.push(sql`${params[i]}`);
	});
	return sql.join(parts);
}

// \x01/\x02 sentinels around matched terms; the client turns them into <mark>.
const HEADLINE_OPTIONS =
	'StartSel=\x01, StopSel=\x02, MaxWords=16, MinWords=6, MaxFragments=1, FragmentDelimiter=…';

/** Members/admins only — the API route gates caretakers out with 403. */
export async function search(filters: SearchFilters): Promise<SearchResult[]> {
	const match = buildMatchQuery(filters.text);
	const fc = buildFilterClause(filters);
	const filterSql = fc.sql ? bindPlaceholders(fc.sql, fc.params) : null;
	let rows: SearchRow[];

	if (match) {
		rows = await rawRows<SearchRow>(sql`
			SELECT
				s.entity_type, s.entity_id, s.companion_id, s.event_date, s.title,
				ts_headline('achei.app_search', s.body, q.query, ${HEADLINE_OPTIONS}) AS excerpt,
				c.name AS companion_name
			FROM achei.search_index s
			JOIN achei.companions c ON c.id = s.companion_id
			CROSS JOIN (SELECT to_tsquery('achei.app_search', ${match}) AS query) q
			WHERE s.tsv @@ q.query ${filterSql ? sql`AND ${filterSql}` : sql``}
			ORDER BY ts_rank(s.tsv, q.query) DESC, s.event_date DESC
			LIMIT 20
		`);
	} else if (filterSql && hasActiveFilters(filters)) {
		// Browse: filters only, no text match. Plain body excerpt (no matched terms
		// to highlight). Relies on the index only holding data the user can read,
		// narrowed by allowedCompanionIds.
		rows = await rawRows<SearchRow>(sql`
			SELECT
				s.entity_type, s.entity_id, s.companion_id, s.event_date, s.title,
				substr(s.body, 1, 80) AS excerpt,
				c.name AS companion_name
			FROM achei.search_index s
			JOIN achei.companions c ON c.id = s.companion_id
			WHERE ${filterSql}
			ORDER BY s.event_date DESC
			LIMIT 20
		`);
	} else {
		return [];
	}

	return rows.map((r) => ({
		type: r.entity_type,
		id: r.entity_id,
		companionId: r.companion_id,
		companionName: r.companion_name,
		title: r.title,
		snippet: r.excerpt,
		date: r.event_date ?? '',
		href: HREF_BY_TYPE[r.entity_type](r.companion_id, r.event_date ?? '', r.entity_id)
	}));
}

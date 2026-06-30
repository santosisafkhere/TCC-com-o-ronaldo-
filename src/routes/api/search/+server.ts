import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { t } from '$lib/i18n';
import { db, schema } from '$lib/server/db';
import { eq } from 'drizzle-orm';
import { search, SEARCH_ENTITY_TYPES, type SearchEntityType } from '$lib/server/search';

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export const GET: RequestHandler = async ({ url, locals }) => {
	if (!locals.user) error(401, t(locals.locale, 'error.unauthorized'));
	if (locals.user.role === 'caretaker') error(403, t(locals.locale, 'error.forbidden'));

	// Ownership scope: members only ever search their own pets; admins are
	// unrestricted. The search index holds every owner's data, so this must be
	// enforced here rather than relying on the index contents.
	let allowedCompanionIds: string[] | undefined;
	if (locals.user.role !== 'admin') {
		const owned = await db.query.companions.findMany({
			where: eq(schema.companions.ownerId, locals.user.id),
			columns: { id: true }
		});
		allowedCompanionIds = owned.map((r) => r.id);
		if (allowedCompanionIds.length === 0) return json({ results: [] });
	}

	const p = url.searchParams;
	const types = p
		.getAll('type')
		.filter((v): v is SearchEntityType => (SEARCH_ENTITY_TYPES as readonly string[]).includes(v));
	const after = p.get('after');
	const before = p.get('before');

	try {
		return json({
			results: search({
				text: p.get('q') ?? '',
				companionIds: p.getAll('companion'),
				types,
				after: after && DATE_RE.test(after) ? after : undefined,
				before: before && DATE_RE.test(before) ? before : undefined,
				allowedCompanionIds
			})
		});
	} catch (err) {
		console.error('[search] query failed:', err);
		return json({ results: [] });
	}
};

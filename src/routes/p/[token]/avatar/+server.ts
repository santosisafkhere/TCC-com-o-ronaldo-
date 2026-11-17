import { error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { t } from '$lib/i18n';
import { getStorage, type GetResult } from '$lib/server/storage';
import { companionByPublicToken } from '$lib/server/publicProfile';

// Public counterpart of /api/avatars/[companionId]: serves the pet photo to
// anyone holding the public-profile token. Authorization IS the token.
export const GET: RequestHandler = async ({ params, locals, request }) => {
	const companion = await companionByPublicToken(params.token);
	if (!companion?.avatarPath) error(404, t(locals.locale, 'error.noAvatar'));

	const key = companion.avatarStorageKey ?? `avatars/${companion.avatarPath}`;

	let res: GetResult | null;
	try {
		res = await getStorage(companion.avatarProvider).get(key, {
			ifNoneMatch: request.headers.get('if-none-match')
		});
	} catch (err) {
		console.error(`[public-avatar] storage error provider=${companion.avatarProvider}:`, err);
		error(502, t(locals.locale, 'error.fileNotFound'));
	}
	if (!res) error(404, t(locals.locale, 'error.fileNotFound'));

	if (res.kind === 'notModified') {
		return new Response(null, { status: 304, headers: { ETag: res.etag } });
	}

	if (res.kind === 'redirect') {
		return new Response(null, {
			status: 302,
			headers: {
				Location: res.url,
				'Cache-Control': 'private, no-store',
				'Referrer-Policy': 'no-referrer'
			}
		});
	}

	const ext = companion.avatarPath.split('.').pop() ?? 'jpg';
	const mimeType = ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg';

	return new Response(res.stream, {
		headers: {
			'Content-Type': mimeType,
			'Content-Length': String(res.stat.size),
			// Revalidate every time so a disabled/rotated link stops serving at once.
			'Cache-Control': 'private, no-cache',
			ETag: res.stat.etag,
			'X-Content-Type-Options': 'nosniff',
			'X-Robots-Tag': 'noindex'
		}
	});
};

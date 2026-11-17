import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { t } from '$lib/i18n';
import {
	companionByPublicToken,
	resolvePublicContact,
	publicProfileUrl,
	publicProfileQr,
	whatsappDigits
} from '$lib/server/publicProfile';

// Unauthenticated on purpose: this is what a stranger sees after scanning the
// pet's QR tag. Only the fields below ever leave the server — no microchip,
// no health data, no owner account details beyond the chosen contact.
export const load: PageServerLoad = async ({ params, locals, url, setHeaders }) => {
	const companion = await companionByPublicToken(params.token);
	if (!companion) error(404, t(locals.locale, 'error.companionNotFound'));

	const contact = await resolvePublicContact(companion);
	const pageUrl = publicProfileUrl(url.origin, params.token);

	setHeaders({ 'Cache-Control': 'private, no-store', 'X-Robots-Tag': 'noindex, nofollow' });

	return {
		pet: {
			name: companion.name,
			breed: companion.breed,
			sex: companion.sex,
			hasAvatar: !!companion.avatarPath,
			lostAt: companion.lostAt,
			lostMessage: companion.lostAt ? companion.lostMessage : null
		},
		contact: contact
			? { name: contact.name, phone: contact.phone, whatsapp: whatsappDigits(contact.phone) }
			: null,
		avatarUrl: `/p/${params.token}/avatar`,
		pageUrl,
		qr: await publicProfileQr(pageUrl)
	};
};

import { error, fail, redirect } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { t } from '$lib/i18n';
import { db, schema } from '$lib/server/db';
import { and, eq } from 'drizzle-orm';
import { parseSex, parseWeightUnit } from '$lib/server/validation';
import { assertCanManageCompanion } from '$lib/server/permissions';
import { generateId } from '$lib/server/utils';
import { publicProfileUrl, publicProfileQr, resolvePublicContact } from '$lib/server/publicProfile';

export const load: PageServerLoad = async ({ params, locals, url }) => {
	if (!locals.user) redirect(302, '/auth/login');
	if (locals.user.role === 'caretaker') redirect(302, '/care');
	const companion = await assertCanManageCompanion(locals, params.id);

	// Active access shares for this pet (e.g. clinics), with grantee details.
	const shares = await db.query.companionShares.findMany({
		where: eq(schema.companionShares.companionId, params.id),
		orderBy: (s, { desc }) => [desc(s.createdAt)],
		with: { grantee: { columns: { username: true, displayName: true } } }
	});

	// Public profile (QR tag / lost-pet page). The QR is rendered server-side so
	// the page needs no client QR library.
	const publicUrl = companion.publicToken
		? publicProfileUrl(url.origin, companion.publicToken)
		: null;
	const publicProfile = {
		url: publicUrl,
		qr: publicUrl ? await publicProfileQr(publicUrl) : null,
		// Without a phone the public page can't put a finder in touch.
		hasContact: !!(await resolvePublicContact(companion))
	};

	return { companion, user: locals.user, shares, publicProfile };
};

const LOST_MESSAGE_MAX = 500;

export const actions: Actions = {
	save: async ({ request, params, locals }) => {
		if (!locals.user) redirect(302, '/auth/login');
		if (locals.user.role === 'caretaker') redirect(302, '/care');
		await assertCanManageCompanion(locals, params.id);

		const data = await request.formData();
		const name = String(data.get('name') ?? '').trim();

		if (!name) return fail(400, { error: t(locals.locale, 'error.nameRequired') });

		await db
			.update(schema.companions)
			.set({
				name,
				breed: String(data.get('breed') ?? '').trim() || null,
				sex: parseSex(String(data.get('sex') ?? '')),
				dob: String(data.get('dob') ?? '') || null,
				weightUnit: parseWeightUnit(String(data.get('weightUnit') ?? '')),
				microchip: String(data.get('microchip') ?? '').trim() || null,
				bio: String(data.get('bio') ?? '').trim() || null,
				// Caretaker fields
				feedingSchedule: String(data.get('feedingSchedule') ?? '').trim() || null,
				walkSchedule: String(data.get('walkSchedule') ?? '').trim() || null,
				medicationSchedule: String(data.get('medicationSchedule') ?? '').trim() || null,
				emergencyContactName: String(data.get('emergencyContactName') ?? '').trim() || null,
				emergencyContactPhone: String(data.get('emergencyContactPhone') ?? '').trim() || null,
				vetName: String(data.get('vetName') ?? '').trim() || null,
				vetPhone: String(data.get('vetPhone') ?? '').trim() || null,
				vetClinic: String(data.get('vetClinic') ?? '').trim() || null,
				notesForSitter: String(data.get('notesForSitter') ?? '').trim() || null
			})
			.where(eq(schema.companions.id, params.id));

		return { success: true };
	},

	share: async ({ request, params, locals }) => {
		if (!locals.user) redirect(302, '/auth/login');
		await assertCanManageCompanion(locals, params.id);

		const data = await request.formData();
		const username = String(data.get('username') ?? '')
			.trim()
			.toLowerCase();
		const scope = String(data.get('scope') ?? 'write') === 'read' ? 'read' : 'write';
		const expiresRaw = String(data.get('expiresAt') ?? '').trim();

		if (!username) return fail(400, { shareError: t(locals.locale, 'error.usernameRequired') });

		const grantee = await db.query.users.findFirst({
			where: eq(schema.users.username, username),
			columns: { id: true, role: true }
		});
		if (!grantee) return fail(400, { shareError: t(locals.locale, 'error.shareUserNotFound') });
		if (grantee.id === locals.user.id)
			return fail(400, { shareError: t(locals.locale, 'error.shareSelf') });
		// Caretakers reach pets through the sitter/shift system, not shares — they
		// never see the owner area where shared pets surface, so a share would be a
		// silent no-op. Reject it rather than create a dead grant.
		if (grantee.role === 'caretaker')
			return fail(400, { shareError: t(locals.locale, 'error.shareCaretaker') });

		let expiresAt: Date | null = null;
		if (expiresRaw) {
			// A <input type="date"> yields "YYYY-MM-DD"; treat it as the end of that
			// day in the server's local zone so the share stays valid through the
			// whole chosen date instead of expiring at 00:00 UTC.
			const d = new Date(`${expiresRaw}T23:59:59`);
			if (isNaN(d.getTime()) || d.getTime() <= Date.now())
				return fail(400, { shareError: t(locals.locale, 'error.shareExpiryInvalid') });
			expiresAt = d;
		}

		// Upsert: re-sharing with the same user updates scope/expiry rather than
		// failing the (companionId, granteeUserId) unique constraint.
		await db
			.insert(schema.companionShares)
			.values({
				id: generateId(15),
				companionId: params.id,
				granteeUserId: grantee.id,
				scope,
				expiresAt,
				createdBy: locals.user.id
			})
			.onConflictDoUpdate({
				target: [schema.companionShares.companionId, schema.companionShares.granteeUserId],
				set: { scope, expiresAt }
			});

		return { shareSuccess: true };
	},

	revokeShare: async ({ request, params, locals }) => {
		if (!locals.user) redirect(302, '/auth/login');
		await assertCanManageCompanion(locals, params.id);

		const data = await request.formData();
		const id = String(data.get('shareId') ?? '').trim();
		if (!id) return fail(400, { shareError: t(locals.locale, 'error.missingId') });

		await db
			.delete(schema.companionShares)
			.where(
				and(eq(schema.companionShares.id, id), eq(schema.companionShares.companionId, params.id))
			);

		return { revokeSuccess: true };
	},

	// Opt in to the public page: issue the unguessable token behind the QR tag.
	enablePublic: async ({ params, locals }) => {
		if (!locals.user) redirect(302, '/auth/login');
		const companion = await assertCanManageCompanion(locals, params.id);
		if (!companion.publicToken) {
			await db
				.update(schema.companions)
				.set({ publicToken: generateId(20) })
				.where(eq(schema.companions.id, params.id));
		}
		return { publicSuccess: 'enabled' as const };
	},

	// Opt out: the link and every printed QR stop working immediately. Also
	// clears the lost state, which has no meaning without a public page.
	disablePublic: async ({ params, locals }) => {
		if (!locals.user) redirect(302, '/auth/login');
		await assertCanManageCompanion(locals, params.id);
		await db
			.update(schema.companions)
			.set({ publicToken: null, lostAt: null, lostMessage: null })
			.where(eq(schema.companions.id, params.id));
		return { publicSuccess: 'disabled' as const };
	},

	// Report the pet lost (or update the message while lost). Enables the public
	// page if needed, since the poster is that page.
	markLost: async ({ request, params, locals }) => {
		if (!locals.user) redirect(302, '/auth/login');
		const companion = await assertCanManageCompanion(locals, params.id);

		const data = await request.formData();
		const lostMessage =
			String(data.get('lostMessage') ?? '')
				.trim()
				.slice(0, LOST_MESSAGE_MAX) || null;

		await db
			.update(schema.companions)
			.set({
				publicToken: companion.publicToken ?? generateId(20),
				// Keep the original date when only the message is being edited.
				lostAt: companion.lostAt ?? new Date(),
				lostMessage
			})
			.where(eq(schema.companions.id, params.id));
		return { publicSuccess: 'lost' as const };
	},

	markFound: async ({ params, locals }) => {
		if (!locals.user) redirect(302, '/auth/login');
		await assertCanManageCompanion(locals, params.id);
		await db
			.update(schema.companions)
			.set({ lostAt: null, lostMessage: null })
			.where(eq(schema.companions.id, params.id));
		return { publicSuccess: 'found' as const };
	},

	archive: async ({ request, params, locals }) => {
		if (locals.user?.role !== 'admin') error(403, t(locals.locale, 'error.forbidden'));

		const data = await request.formData();
		const archivedAt = String(data.get('archivedAt') ?? '').trim();
		const archiveNote = String(data.get('archiveNote') ?? '').trim();

		const archivedAtDate = archivedAt ? new Date(archivedAt) : new Date();
		if (isNaN(archivedAtDate.getTime()))
			return fail(400, { error: t(locals.locale, 'error.invalidArchiveDate') });

		await db
			.update(schema.companions)
			.set({
				isActive: false,
				archivedAt: archivedAtDate,
				archiveNote: archiveNote || null
			})
			.where(eq(schema.companions.id, params.id));

		redirect(302, '/admin/companions');
	}
};

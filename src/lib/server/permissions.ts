import { error, type RequestEvent } from '@sveltejs/kit';
import { and, eq } from 'drizzle-orm';
import { t } from '$lib/i18n';
import { db, schema } from '$lib/server/db';
import type { Companion } from '$lib/server/db/schema';

// Is this caretaker assigned to the given companion?
async function isAssignedCaretaker(userId: string, companionId: string): Promise<boolean> {
	const assigned = await db.query.companionCaretakers.findFirst({
		where: and(
			eq(schema.companionCaretakers.userId, userId),
			eq(schema.companionCaretakers.companionId, companionId)
		)
	});
	return !!assigned;
}

// Whether the user may SEE a companion at all. Ownership-centric model:
//   - admins (platform operators) see everything;
//   - the owner sees their own pet;
//   - a caretaker/clinic sees a pet only while assigned to it.
// Returns the companion on success; throws 404 (not 403) for pets the user may
// not see so existence isn't leaked, and 404 when the pet doesn't exist.
export async function assertCanViewCompanion(
	locals: RequestEvent['locals'],
	companionId: string
): Promise<Companion> {
	if (!locals.user) error(401, t(locals.locale, 'error.unauthorized'));
	const companion = await db.query.companions.findFirst({
		where: eq(schema.companions.id, companionId)
	});
	if (!companion) error(404, t(locals.locale, 'error.companionNotFound'));

	if (locals.user.role === 'admin') return companion;
	if (companion.ownerId === locals.user.id) return companion;
	if (await isAssignedCaretaker(locals.user.id, companionId)) return companion;

	error(404, t(locals.locale, 'error.companionNotFound'));
}

// Whether the user may WRITE to a companion's data. The owner and admins can
// always edit. Caretakers/clinics may write only when assigned. Throws via
// SvelteKit's error() helper on failure; returns void on success.
export async function assertCanEditCompanion(
	locals: RequestEvent['locals'],
	companionId: string
): Promise<void> {
	if (!locals.user) error(401, t(locals.locale, 'error.unauthorized'));
	if (locals.user.role === 'admin') return;

	const companion = await db.query.companions.findFirst({
		where: eq(schema.companions.id, companionId),
		columns: { id: true, ownerId: true }
	});
	if (!companion) error(404, t(locals.locale, 'error.companionNotFound'));

	if (companion.ownerId === locals.user.id) return;
	if (locals.user.role === 'caretaker' && (await isAssignedCaretaker(locals.user.id, companionId))) {
		return;
	}

	error(403, t(locals.locale, 'error.forbidden'));
}

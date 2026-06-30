import type { LayoutServerLoad } from './$types';
import { assertCanViewCompanion } from '$lib/server/permissions';

export const load: LayoutServerLoad = async ({ params, locals }) => {
	// Enforces ownership/assignment and 404s pets the user may not see.
	const companion = await assertCanViewCompanion(locals, params.companionId);
	return { companion };
};

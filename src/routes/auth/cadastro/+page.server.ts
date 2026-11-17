import { error, fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import bcrypt from 'bcryptjs';
import { t } from '$lib/i18n';
import { db, schema, isUniqueViolation } from '$lib/server/db';
import { SIGNUP_ENABLED } from '$lib/server/env';
import { generateId } from '$lib/server/utils';
import { isSecureRequest } from '$lib/server/auth';
import { checkRateLimit } from '$lib/server/auth/rate-limit';
import {
	generateSessionToken,
	createSession,
	SESSION_COOKIE_NAME,
	makeSessionCookieOptions
} from '$lib/server/auth/session';

// Open self-registration. Every new account is a plain `member`: it owns the
// pets it creates and sees nothing else (ownership scoping does the rest).

const USERNAME_RE = /^[a-z0-9_-]{3,32}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const SIGNUPS_PER_HOUR = 5;

export const load: PageServerLoad = async ({ locals }) => {
	if (!SIGNUP_ENABLED) error(404, t(locals.locale, 'error.signupClosed'));
	if (locals.user) redirect(302, locals.user.role === 'caretaker' ? '/care' : '/');
	return {};
};

export const actions: Actions = {
	default: async ({ request, cookies, getClientAddress, locals }) => {
		if (!SIGNUP_ENABLED) error(404, t(locals.locale, 'error.signupClosed'));
		const locale = locals.locale;
		const data = await request.formData();

		const displayName = String(data.get('displayName') ?? '')
			.trim()
			.slice(0, 80);
		const username = String(data.get('username') ?? '')
			.trim()
			.toLowerCase();
		const email =
			String(data.get('email') ?? '')
				.trim()
				.toLowerCase() || null;
		const password = String(data.get('password') ?? '');
		const confirmPassword = String(data.get('confirmPassword') ?? '');
		const values = { displayName, username, email: email ?? '' };

		// Honeypot: invisible to people, filled in by naive bots. Pretend success
		// is not needed; a plain refusal gives a bot nothing to learn from.
		if (String(data.get('website') ?? '') !== '') {
			return fail(400, { error: t(locale, 'error.allFieldsRequired'), values });
		}

		if (!(await checkRateLimit(`signup:${getClientAddress()}`, SIGNUPS_PER_HOUR, 60 * 60 * 1000))) {
			return fail(429, { error: t(locale, 'error.tooManySignups'), values });
		}

		if (!displayName || !username || !password || !confirmPassword) {
			return fail(400, { error: t(locale, 'error.allFieldsRequired'), values });
		}
		if (!USERNAME_RE.test(username)) {
			return fail(400, { error: t(locale, 'error.signupUsernameFormat'), values });
		}
		if (email && (email.length > 254 || !EMAIL_RE.test(email))) {
			return fail(400, { error: t(locale, 'error.invalidEmail'), values });
		}
		if (password.length < 8) {
			return fail(400, { error: t(locale, 'error.passwordTooShort'), values });
		}
		if (password.length > 128) {
			return fail(400, { error: t(locale, 'error.passwordTooLong'), values });
		}
		if (password !== confirmPassword) {
			return fail(400, { error: t(locale, 'error.passwordsMismatch'), values });
		}

		const userId = generateId(15);
		try {
			await db.insert(schema.users).values({
				id: userId,
				username,
				displayName,
				email,
				passwordHash: await bcrypt.hash(password, 12),
				role: 'member',
				locale
			});
		} catch (err) {
			if (isUniqueViolation(err, 'users_email_idx')) {
				return fail(400, { error: t(locale, 'error.emailAlreadyTaken'), values });
			}
			if (isUniqueViolation(err)) {
				return fail(400, { error: t(locale, 'error.usernameTaken'), values });
			}
			throw err;
		}

		const token = generateSessionToken();
		const session = await createSession(token, userId);
		cookies.set(
			SESSION_COOKIE_NAME,
			token,
			makeSessionCookieOptions(session.expiresAt, isSecureRequest(request))
		);

		// Straight to adding the first pet.
		redirect(303, '/companions/new');
	}
};

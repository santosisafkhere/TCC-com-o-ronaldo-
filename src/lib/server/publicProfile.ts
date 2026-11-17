import { and, eq } from 'drizzle-orm';
import QRCode from 'qrcode';
import { db, schema } from '$lib/server/db';
import type { Companion } from '$lib/server/db/schema';

// The public profile is the page a stranger lands on after scanning the QR tag
// on a pet's collar (/p/{token}). It is opt-in per pet: no token, no page.

export type PublicContact = { name: string | null; phone: string };

// Active (non-archived) companion behind a public token, or null. Archived pets
// lose their public page so an old tag never resolves to stale data.
export async function companionByPublicToken(token: string): Promise<Companion | null> {
	if (!token) return null;
	const companion = await db.query.companions.findFirst({
		where: and(eq(schema.companions.publicToken, token), eq(schema.companions.isActive, true))
	});
	return companion ?? null;
}

// Who a finder should call. The pet's emergency contact wins (the owner picked
// it for exactly this); otherwise the owner's own profile phone. Null when
// neither is set — callers must warn the owner, since the page is then useless.
export async function resolvePublicContact(
	companion: Pick<Companion, 'ownerId' | 'emergencyContactName' | 'emergencyContactPhone'>
): Promise<PublicContact | null> {
	const emergencyPhone = companion.emergencyContactPhone?.trim();
	if (emergencyPhone) {
		return { name: companion.emergencyContactName?.trim() || null, phone: emergencyPhone };
	}
	if (!companion.ownerId) return null;
	const owner = await db.query.users.findFirst({
		where: eq(schema.users.id, companion.ownerId),
		columns: { displayName: true, phone: true }
	});
	const ownerPhone = owner?.phone?.trim();
	if (!ownerPhone) return null;
	return { name: owner?.displayName ?? null, phone: ownerPhone };
}

export function publicProfileUrl(origin: string, token: string): string {
	return `${origin}/p/${token}`;
}

// PNG data URL. `img-src data:` is already allowed by the app CSP. Error
// correction 'M' keeps the code readable on a small, scuffed collar tag.
export function publicProfileQr(url: string): Promise<string> {
	return QRCode.toDataURL(url, { errorCorrectionLevel: 'M', margin: 1, width: 512 });
}

// Digits for a wa.me link, or null when the number can't be one. A 10/11-digit
// number is assumed to be a Brazilian number typed without the country code
// (the app's default market), so 55 is prefixed.
export function whatsappDigits(phone: string): string | null {
	const digits = phone.replace(/\D/g, '').replace(/^0+/, '');
	if (digits.length < 10 || digits.length > 15) return null;
	return digits.length <= 11 ? `55${digits}` : digits;
}

import type { PageServerLoad } from './$types';
import QRCode from 'qrcode';

// Public landing page. The QR on the sample "Missing" poster is real and opens
// this page, so a visitor can try the scan flow with their own phone.
export const load: PageServerLoad = async ({ url, setHeaders }) => {
	setHeaders({ 'Cache-Control': 'public, max-age=300' });
	const qr = await QRCode.toDataURL(`${url.origin}/conheca`, {
		errorCorrectionLevel: 'M',
		margin: 0,
		width: 240,
		color: { dark: '#1d1730', light: '#ffffff' }
	});
	return { qr, origin: url.origin };
};

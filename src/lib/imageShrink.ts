// Browser-side downscaling of photos before upload.
//
// Phone cameras produce 5–12 MB images, while serverless hosts cap the request
// body at a few MB (Vercel: ~4.5 MB) and reject anything larger before the app
// sees it. The server re-encodes every image anyway, so shrinking here costs no
// visible quality and makes uploads faster on mobile data.

export interface ShrinkOptions {
	/** Files at or under this size are sent untouched. */
	maxBytes?: number;
	/** Longest edge, in pixels, of the first attempt. */
	maxEdge?: number;
	/** JPEG quality of the first attempt (0–1). */
	quality?: number;
}

// Stay clear of the ~4.5 MB body cap: multipart framing adds a little overhead.
export const UPLOAD_SAFE_BYTES = 3.5 * 1024 * 1024;

const SHRINKABLE = new Set(['image/jpeg', 'image/png', 'image/webp']);

// Pure sizing rule, exported for tests: scale so the longest edge is `maxEdge`,
// never upscaling.
export function fitWithin(width: number, height: number, maxEdge: number) {
	const longest = Math.max(width, height);
	if (longest <= maxEdge) return { width, height };
	const scale = maxEdge / longest;
	return {
		width: Math.max(1, Math.round(width * scale)),
		height: Math.max(1, Math.round(height * scale))
	};
}

function toJpeg(canvas: HTMLCanvasElement, quality: number): Promise<Blob | null> {
	return new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', quality));
}

/**
 * Returns a JPEG no larger than `maxBytes` when `file` is an oversized photo.
 * Anything else — small files, GIFs (animation would be lost), videos, PDFs,
 * formats the browser cannot decode — is returned unchanged, so callers can
 * pass every picked file through this without checking its type first.
 */
export async function shrinkImage(file: File, opts: ShrinkOptions = {}): Promise<File> {
	const maxBytes = opts.maxBytes ?? UPLOAD_SAFE_BYTES;
	if (file.size <= maxBytes || !SHRINKABLE.has(file.type)) return file;
	if (typeof document === 'undefined' || typeof createImageBitmap !== 'function') return file;

	let bitmap: ImageBitmap;
	try {
		// Bake the EXIF rotation in: the re-encoded JPEG carries no EXIF.
		bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
	} catch {
		return file;
	}

	try {
		let edge = opts.maxEdge ?? 2560;
		let quality = opts.quality ?? 0.85;
		for (let attempt = 0; attempt < 5; attempt++) {
			const { width, height } = fitWithin(bitmap.width, bitmap.height, edge);
			const canvas = document.createElement('canvas');
			canvas.width = width;
			canvas.height = height;
			const ctx = canvas.getContext('2d');
			if (!ctx) return file;
			// JPEG has no alpha; flatten transparency onto white rather than black.
			ctx.fillStyle = '#fff';
			ctx.fillRect(0, 0, width, height);
			ctx.drawImage(bitmap, 0, 0, width, height);

			const blob = await toJpeg(canvas, quality);
			if (!blob) return file;
			if (blob.size <= maxBytes) {
				const name = file.name.replace(/\.[^.]*$/, '') + '.jpg';
				return new File([blob], name, { type: 'image/jpeg', lastModified: file.lastModified });
			}
			edge = Math.round(edge * 0.8);
			quality = Math.max(0.6, quality - 0.07);
		}
		return file;
	} finally {
		bitmap.close();
	}
}

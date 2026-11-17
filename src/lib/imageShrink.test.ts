import { describe, it, expect } from 'vitest';
import { fitWithin, shrinkImage, UPLOAD_SAFE_BYTES } from './imageShrink';

describe('fitWithin', () => {
	it('leaves images at or under the limit alone', () => {
		expect(fitWithin(800, 600, 2560)).toEqual({ width: 800, height: 600 });
		expect(fitWithin(2560, 1440, 2560)).toEqual({ width: 2560, height: 1440 });
	});

	it('scales the longest edge down, keeping the aspect ratio', () => {
		expect(fitWithin(4000, 3000, 2000)).toEqual({ width: 2000, height: 1500 });
		expect(fitWithin(3000, 4000, 2000)).toEqual({ width: 1500, height: 2000 });
	});

	it('never collapses a dimension to zero', () => {
		expect(fitWithin(10000, 1, 100)).toEqual({ width: 100, height: 1 });
	});
});

describe('shrinkImage', () => {
	const big = (type: string, name: string) =>
		new File([new Uint8Array(UPLOAD_SAFE_BYTES + 1)], name, { type });

	it('returns small files untouched', async () => {
		const f = new File([new Uint8Array(10)], 'a.jpg', { type: 'image/jpeg' });
		expect(await shrinkImage(f)).toBe(f);
	});

	it('never touches non-photo types, whatever their size', async () => {
		for (const f of [
			big('image/gif', 'a.gif'),
			big('video/mp4', 'a.mp4'),
			big('application/pdf', 'a.pdf')
		]) {
			expect(await shrinkImage(f)).toBe(f);
		}
	});

	it('falls back to the original where there is no canvas (server, old browser)', async () => {
		const f = big('image/jpeg', 'a.jpg');
		expect(await shrinkImage(f)).toBe(f);
	});
});

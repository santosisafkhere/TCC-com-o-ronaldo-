import adapterNode from '@sveltejs/adapter-node';
import adapterVercel from '@sveltejs/adapter-vercel';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

// Vite HMR injects inline scripts into the dev server response that bypass
// SvelteKit's nonce machinery, so dev needs `'unsafe-inline'` to function.
// CSP Level 3 (all modern browsers) ignores `'unsafe-inline'` when a nonce is
// also present, so production gets a strict nonce-only policy.
const dev = process.env.NODE_ENV !== 'production';

if (process.env.npm_lifecycle_event === 'build' && dev) {
	throw new Error(
		`svelte.config.js: NODE_ENV must be "production" during build, got: ${JSON.stringify(process.env.NODE_ENV)}`
	);
}

/** @type {import('@sveltejs/kit').Config} */
const config = {
	preprocess: vitePreprocess(),
	kit: {
		// Vercel sets VERCEL=1 during its builds: emit serverless functions there.
		// Everywhere else (local, Docker, the e2e suite's `node build`) build a
		// standalone Node server as before.
		adapter: process.env.VERCEL
			? // Cap each request at 60 s (default 300 s) so a stuck request fails fast
				// instead of hanging the page for five minutes.
				adapterVercel({ maxDuration: 60 })
			: adapterNode({ out: 'build' }),
		csp: {
			mode: 'nonce',
			directives: {
				'default-src': ['self'],
				'script-src': dev ? ['self', 'unsafe-inline'] : ['self'],
				'style-src': ['self', 'unsafe-inline'],
				'font-src': ['self'],
				'img-src': ['self', 'data:', 'blob:'],
				'media-src': ['self', 'blob:'],
				'connect-src': ['self'],
				'frame-ancestors': ['none'],
				'base-uri': ['self'],
				'form-action': ['self']
			}
		},
		alias: {
			$lib: './src/lib',
			$components: './src/lib/components',
			$server: './src/lib/server'
		}
	}
};

export default config;

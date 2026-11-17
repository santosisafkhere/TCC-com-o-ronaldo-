import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vitest/config';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
	plugins: [tailwindcss(), sveltekit()],
	server: {
		host: '127.0.0.1',
		port: 5173
	},
	ssr: {
		// Bundle these into the server build instead of loading them from
		// node_modules at runtime. sanitize-html is CommonJS but require()s
		// htmlparser2, which is ESM-only; Vercel's function loader does not
		// support require() of ESM (ERR_REQUIRE_ESM), so every page rendering
		// markdown crashed there. Bundled, the CJS/ESM boundary disappears.
		// The whole dependency tree must be listed: a package left out stays a
		// runtime require() that Vercel's file tracer does not pick up
		// ("Cannot find module"). The serverless-bundle test enforces this.
		noExternal: [
			'sanitize-html',
			'htmlparser2',
			'domhandler',
			'domutils',
			'dom-serializer',
			'entities',
			'domelementtype',
			'escape-string-regexp',
			'is-plain-object',
			'launder',
			'dayjs',
			'parse-srcset',
			'postcss',
			'nanoid',
			'picocolors',
			'source-map-js'
		]
	},
	test: {
		include: ['src/**/*.test.ts', 'tests/**/*.test.ts'],
		environment: 'node',
		setupFiles: ['./src/vitest.setup.ts'],
		// Each test file boots an in-memory Postgres (PGlite) and migrates it on
		// first use, which can take a few seconds when files run in parallel.
		testTimeout: 30_000,
		hookTimeout: 30_000
	}
});

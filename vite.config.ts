import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vitest/config';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
	plugins: [tailwindcss(), sveltekit()],
	server: {
		host: '127.0.0.1',
		port: 5173
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

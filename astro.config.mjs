// @ts-check
import { defineConfig } from 'astro/config';

// https://astro.build/config
export default defineConfig({
	redirects: {
		// Old services route. Consulting site now lives at the root.
		'/services': '/',
	},
});

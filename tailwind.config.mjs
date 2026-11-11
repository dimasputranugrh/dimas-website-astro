/** @type {import('tailwindcss').Config} */
export default {
	content: ['./src/**/*.{astro,html,js,jsx,ts,tsx,md,mdx}'],
	darkMode: ['class', '[data-theme="dark"]'],
	theme: {
		extend: {
			colors: {
				paper: 'var(--paper)',
				'paper-2': 'var(--paper-2)',
				ink: 'var(--ink)',
				muted: 'var(--muted)',
				line: 'var(--line)',
				'line-strong': 'var(--line-strong)',
				accent: 'var(--accent)',
				'accent-ink': 'var(--accent-ink)',
			},
			fontFamily: {
				sans: ['Instrument Sans Variable', 'ui-sans-serif', 'system-ui', 'sans-serif'],
				display: ['Instrument Serif', 'Georgia', 'serif'],
				mono: ['IBM Plex Mono', 'ui-monospace', 'SFMono-Regular', 'monospace'],
			},
			maxWidth: {
				shell: '90rem',
			},
			transitionTimingFunction: {
				out: 'cubic-bezier(0.16, 1, 0.3, 1)',
			},
		},
	},
	plugins: [],
};

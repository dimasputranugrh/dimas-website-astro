/** @type {import('tailwindcss').Config} */
export default {
	content: ['./src/**/*.{astro,html,js,jsx,ts,tsx,md,mdx}'],
	darkMode: ['class', '[data-theme="dark"]'],
	theme: {
		extend: {
			fontFamily: {
				sans: [
					'ui-sans-serif',
					'system-ui',
					'-apple-system',
					'Segoe UI',
					'Roboto',
					'Helvetica',
					'Arial',
					'Apple Color Emoji',
					'Segoe UI Emoji',
				],
			},
			boxShadow: {
				premium: '0 28px 90px rgba(0,0,0,0.45)',
			},
			keyframes: {
				marquee: {
					from: { transform: 'translateX(0)' },
					to: { transform: 'translateX(-50%)' },
				},
				floaty: {
					'0%, 100%': { transform: 'translate3d(0,0,0)' },
					'50%': { transform: 'translate3d(0,-10px,0)' },
				},
				blob: {
					'0%, 100%': { transform: 'translate3d(0,0,0) scale(1)' },
					'50%': { transform: 'translate3d(40px,18px,0) scale(1.04)' },
				},
			},
			animation: {
				marquee: 'marquee 18s linear infinite',
				floaty: 'floaty 6s ease-in-out infinite',
				blob: 'blob 12s ease-in-out infinite',
			},
		},
	},
	plugins: [],
};


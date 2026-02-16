import typography from '@tailwindcss/typography';

/** @type {import('tailwindcss').Config} */
export default {
	content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
	theme: {
		extend: {
			colors: {
				primary: '#0314C6',
				'primary-weak': '#AFC0FF',
				success: '#DAEEA4',
				border: '#E6E6E6',
				muted: '#878787',
			},
			boxShadow: { subtle: '0 6px 18px rgba(3,20,198,0.06)' },
		},
	},
	plugins: [typography],
};

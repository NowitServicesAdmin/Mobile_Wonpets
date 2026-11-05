/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./App.{js,jsx,ts,tsx}', './src/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        primary: { DEFAULT: '#FF6B00', dark: '#E85D00', soft: '#FFF1E3' },
        cream: '#FFF9F2',
        ink: '#1F1B16',
        muted: '#7A7068',
        line: '#F6E3D0',
        purple: { DEFAULT: '#7C3AED', soft: '#F3E8FF' },
        green: { DEFAULT: '#16A34A', soft: '#DCFCE7' },
        red: { DEFAULT: '#EF4444', soft: '#FEE2E2' },
        blue: { DEFAULT: '#3B82F6', soft: '#DBEAFE' },
        pink: { DEFAULT: '#EC4899', soft: '#FCE7F3' },
        yellow: { DEFAULT: '#F5B301', soft: '#FEF3C7' },
      },
      borderRadius: { md2: '16px', lg2: '24px' },
    },
  },
  plugins: [],
};

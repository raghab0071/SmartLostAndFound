/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    './index.html',
    './src/**/*.{js,jsx,ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50:  '#eef6ff',
          100: '#d9eaff',
          200: '#b8d5ff',
          300: '#85b8ff',
          400: '#4f93ff',
          500: '#2972f5',
          600: '#1858e0',
          700: '#1545b8',
          800: '#163b91',
          900: '#172f6f',
        },
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui'],
      },
      boxShadow: {
        soft: '0 6px 30px -8px rgba(20, 50, 110, 0.18)',
      },
      keyframes: {
        marquee: {
          '0%': { transform: 'translateX(0%)' },
          '100%': { transform: 'translateX(-50%)' },
        },
        pulseGlow: {
          '0%, 100%': { boxShadow: '0 0 0 0 rgba(41,114,245,0.5)' },
          '50%': { boxShadow: '0 0 0 10px rgba(41,114,245,0)' },
        },
        fadeUp: {
          '0%': { opacity: 0, transform: 'translateY(8px)' },
          '100%': { opacity: 1, transform: 'translateY(0)' },
        },
      },
      animation: {
        marquee: 'marquee 30s linear infinite',
        pulseGlow: 'pulseGlow 2s ease-in-out infinite',
        fadeUp: 'fadeUp 0.5s ease-out',
      },
    },
  },
  plugins: [],
}

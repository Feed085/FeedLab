/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#eef9ff',
          100: '#d8f1ff',
          200: '#b9e6ff',
          300: '#89d7ff',
          400: '#52bfff',
          500: '#2b9fff',
          600: '#147df5',
          700: '#0c64e1',
          800: '#1050b5',
          900: '#13448f',
        },
        primary: {
          50: '#eef9ff',
          100: '#d8f1ff',
          200: '#b9e6ff',
          300: '#89d7ff',
          400: '#52bfff',
          500: '#2b9fff',
          600: '#147df5',
          700: '#0c64e1',
          800: '#1050b5',
          900: '#13448f',
        },
        surface: {
          page: '#F8FAFC',
          footer: '#F4F7FA',
          card: '#FFFFFF',
          heroFrom: '#EEF4FB',
          heroMid: '#F3F7FC',
        },
      },
      fontFamily: {
        sans: [
          'Inter',
          'Plus Jakarta Sans',
          'system-ui',
          '-apple-system',
          'Segoe UI',
          'Roboto',
          'sans-serif',
        ],
        mono: [
          'JetBrains Mono',
          'ui-monospace',
          'SFMono-Regular',
          'Menlo',
          'Monaco',
          'Consolas',
          'monospace',
        ],
      },
      boxShadow: {
        card: '0 1px 3px rgba(15, 23, 42, 0.06)',
        'card-hover': '0 10px 25px -5px rgba(15, 23, 42, 0.08)',
        floating: '0 10px 25px -5px rgba(15, 23, 42, 0.10)',
      },
      keyframes: {
        'fade-up': {
          from: { opacity: '0', transform: 'translateY(16px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'fade-in': {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        'slide-down': {
          from: { opacity: '0', transform: 'translateY(-6px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'float-slow': {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-4px)' },
        },
      },
      animation: {
        'fade-up': 'fade-up 550ms cubic-bezier(0.22, 1, 0.36, 1) both',
        'fade-in': 'fade-in 200ms ease-out both',
        'slide-down': 'slide-down 200ms ease-out both',
        'float-slow': 'float-slow 5s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};

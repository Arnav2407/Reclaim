/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        midnight: {
          DEFAULT: '#0B1220',
          50: '#17243A',
          100: '#111C2E',
          200: '#0E1727',
          300: '#0B1220',
        },
        surface: {
          DEFAULT: '#111C2E',
          elevated: '#17243A',
          active: '#1E314F',
          subtle: '#0E1727',
        },
        border: {
          subtle: '#24344D',
          accent: '#334B6E',
          hover: '#415B82',
        },
        recovered: {
          DEFAULT: '#10B981',
          light: '#34D399',
          dark: '#059669',
          surface: 'rgba(16, 185, 129, 0.12)',
        },
        ai: {
          DEFAULT: '#06B6D4',
          light: '#22D3EE',
          dark: '#0891B2',
          surface: 'rgba(6, 182, 212, 0.12)',
        },
        risk: {
          DEFAULT: '#EF4444',
          light: '#F87171',
          dark: '#DC2626',
          surface: 'rgba(239, 68, 68, 0.12)',
        },
        warning: {
          DEFAULT: '#F59E0B',
          light: '#FBBF24',
          dark: '#D97706',
          surface: 'rgba(245, 158, 11, 0.12)',
        },
        subscription: {
          DEFAULT: '#8B5CF6',
          light: '#A78BFA',
          dark: '#7C3AED',
          surface: 'rgba(139, 92, 246, 0.12)',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      boxShadow: {
        'subtle-card': '0 4px 20px -2px rgba(0, 0, 0, 0.35)',
        'emerald-glow': '0 0 20px -5px rgba(16, 185, 129, 0.3)',
        'cyan-glow': '0 0 20px -5px rgba(6, 182, 212, 0.3)',
      },
      borderRadius: {
        'card': '12px',
        'btn': '8px',
        'badge': '6px',
      }
    },
  },
  plugins: [],
}

import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: '#0C447C',
          hover:   '#0a3a6a',
          soft:    '#EBF3FE',
          50:  '#eef4ff',
          100: '#dae6ff',
          200: '#bcd2ff',
          300: '#8db5ff',
          400: '#5a8cff',
          500: '#3563ff',
          600: '#1f43ed',
          700: '#1934c4',
          800: '#172d9b',
          900: '#172a78',
        },
        surface: {
          DEFAULT: '#FFFFFF',
          muted:   '#F8FAFC',
        },
        divider: {
          DEFAULT: '#E2E8F0',
          strong:  '#CBD5E1',
        },
  
        navy: {
          50: '#eef0fb',
          100: '#d6dbf3',
          200: '#a9b4e2',
          300: '#7a87cd',
          400: '#525fa9',
          500: '#3a4585',
          600: '#2a335f',
          700: '#1d2447',
          800: '#141a35',
          900: '#0c1024',
          950: '#070a18',
        },
        accent: {
          50: '#eef0ff',
          100: '#dee1ff',
          200: '#c0c5ff',
          300: '#969eff',
          400: '#7e85ff',
          500: '#635bff', // Razorpay-style purple-blue
          600: '#5046e5',
          700: '#3f37bd',
          800: '#2f2998',
          900: '#1f1d6b',
        },
        
        bosscoder: {
          blue: '#1371FF',
          dark: '#202658',
        },
        'dark-blue': '#202658',
        'brand-blue': '#1371FF',
      
        tile: {
          blue: '#3b82f6',
          purple: '#8b5cf6',
          orange: '#f97316',
          green: '#10b981',
          pink: '#ec4899',
          amber: '#f59e0b',
          rose: '#f43f5e',
          cyan: '#06b6d4',
        },
      },
      fontFamily: {
        sans: [
          'Inter',
          'system-ui',
          '-apple-system',
          'Segoe UI',
          'Roboto',
          'sans-serif',
        ],
      },
      boxShadow: {
        // Subtle elevation for dark-themed cards.
        tile: '0 1px 0 0 rgba(255,255,255,0.04) inset, 0 1px 2px 0 rgba(0,0,0,0.4)',
        'tile-hover':
          '0 1px 0 0 rgba(255,255,255,0.08) inset, 0 4px 12px 0 rgba(0,0,0,0.5)',
        card: '0 1px 3px 0 rgba(0,0,0,0.06), 0 1px 2px -1px rgba(0,0,0,0.04)',
        'card-hover': '0 4px 16px 0 rgba(0,0,0,0.08), 0 1px 4px 0 rgba(0,0,0,0.04)',
      },
    },
  },
  plugins: [],
};

export default config;

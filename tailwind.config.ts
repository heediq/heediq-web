import type { Config } from 'tailwindcss'

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        'surface-0': 'var(--surface-0)',
        'surface-1': 'var(--surface-1)',
        'surface-2': 'var(--surface-2)',
        border: 'var(--border)',
        'text-primary': 'var(--text-primary)',
        'text-secondary': 'var(--text-secondary)',
        'text-disabled': 'var(--text-disabled)',
        accent: 'var(--accent)',
        'accent-hover': 'var(--accent-hover)',
        'accent-pressed': 'var(--accent-pressed)',
        success: 'var(--success)',
        warning: 'var(--warning)',
        danger: 'var(--danger)',
        info: 'var(--info)',
      },
      fontFamily: {
        sans: ['Inter', 'Geist', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      fontSize: {
        display: ['28px', { lineHeight: '1.3', letterSpacing: '-0.02em', fontWeight: '600' }],
        h2: ['20px', { lineHeight: '1.4', fontWeight: '600' }],
        body: ['15px', { lineHeight: '1.5', fontWeight: '400' }],
        caption: ['13px', { lineHeight: '1.4', fontWeight: '500' }],
        'mono-transcript': ['14px', { lineHeight: '1.6', fontWeight: '400' }],
      },
      spacing: {
        1: '4px',
        2: '8px',
        3: '12px',
        4: '16px',
        6: '24px',
        8: '32px',
        12: '48px',
        16: '64px',
      },
      borderRadius: {
        sm: '8px',
        md: '14px',
        lg: '24px',
        full: '9999px',
      },
    },
  },
  plugins: [],
} satisfies Config

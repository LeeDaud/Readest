import type { Config } from 'tailwindcss';
import daisyui from 'daisyui';
import typography from '@tailwindcss/typography';
import plugin from 'tailwindcss/plugin';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  safelist: [
    { pattern: /bg-./ },
    { pattern: /text-./ },
    { pattern: /fill-./ },
    { pattern: /decoration-./ },
    { pattern: /tooltip-./ },
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--wr-font-family-ui)'],
        reader: ['var(--wr-font-family-reader)'],
        'reader-serif': ['var(--wr-font-family-reader-serif)'],
        mono: ['var(--wr-font-family-mono)'],
      },
      colors: {
        background: 'var(--wr-current-bg)',
        foreground: 'var(--wr-current-text)',
        'wr-accent': 'var(--wr-accent)',
        'wr-text-primary': 'var(--wr-text-primary)',
        'wr-text-secondary': 'var(--wr-text-secondary)',
        'wr-text-tertiary': 'var(--wr-text-tertiary)',
        'wr-bg-white': 'var(--wr-bg-white)',
        'wr-bg-green': 'var(--wr-bg-green)',
        'wr-bg-yellow': 'var(--wr-bg-yellow)',
        'wr-bg-dark': 'var(--wr-bg-dark)',
      },
      spacing: {
        'wr-xs': 'var(--wr-space-xs)',
        'wr-sm': 'var(--wr-space-sm)',
        'wr-md': 'var(--wr-space-md)',
        'wr-lg': 'var(--wr-space-lg)',
        'wr-xl': 'var(--wr-space-xl)',
        'wr-2xl': 'var(--wr-space-2xl)',
        'wr-3xl': 'var(--wr-space-3xl)',
      },
      borderRadius: {
        'wr-sm': 'var(--wr-radius-sm)',
        'wr-md': 'var(--wr-radius-md)',
        'wr-lg': 'var(--wr-radius-lg)',
        'wr-xl': 'var(--wr-radius-xl)',
        'wr-round': 'var(--wr-radius-round)',
      },
      boxShadow: {
        'wr-sm': 'var(--wr-shadow-sm)',
        'wr-md': 'var(--wr-shadow-md)',
        'wr-lg': 'var(--wr-shadow-lg)',
      },
    },
  },
  plugins: [
    daisyui,
    typography,
    plugin(function ({ addVariant }) {
      addVariant('eink', 'html[data-eink="true"] &, [data-wr-eink="true"] &');
      addVariant('not-eink', 'html:not([data-eink="true"]):not([data-wr-eink="true"]) &');
    }),
  ],
  daisyui: {
    themes: [
      {
        'wr-light': {
          'base-100': '#FFFEF5',
          'base-200': '#F1ECD8',
          'base-300': '#C7EDCC',
          'base-content': '#1A1A1A',
          neutral: '#666666',
          'neutral-content': '#999999',
          primary: '#07C160',
          secondary: '#06AD56',
          accent: '#05944A',
        },
        'wr-dark': {
          'base-100': '#1A1A1A',
          'base-200': '#2A2A2A',
          'base-300': '#333333',
          'base-content': 'rgba(255,255,255,0.87)',
          neutral: 'rgba(255,255,255,0.60)',
          'neutral-content': 'rgba(255,255,255,0.38)',
          primary: '#07C160',
          secondary: '#06AD56',
          accent: '#05944A',
        },
      },
      'light',
      'dark',
    ],
  },
};
export default config;

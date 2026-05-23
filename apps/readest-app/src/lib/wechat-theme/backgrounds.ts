import type { ReadingBackground } from './types';

export const BACKGROUND_COLORS: Record<
  ReadingBackground,
  { bg: string; alt: string; label: string }
> = {
  white: { bg: '#FFFEF5', alt: '#FFFFFF', label: '白色' },
  green: { bg: '#C7EDCC', alt: '#C6E8D1', label: '护眼' },
  yellow: { bg: '#F1ECD8', alt: '#F7ECD1', label: '纸黄' },
  dark: { bg: '#1A1A1A', alt: '#1A1A1A', label: '夜间' },
};

export const TEXT_COLORS: Record<
  ReadingBackground,
  { primary: string; secondary: string; tertiary: string }
> = {
  white: { primary: '#1A1A1A', secondary: '#666666', tertiary: '#999999' },
  green: { primary: '#1A1A1A', secondary: '#555555', tertiary: '#888888' },
  yellow: { primary: '#1A1A1A', secondary: '#555555', tertiary: '#888888' },
  dark: {
    primary: 'rgba(255,255,255,0.87)',
    secondary: 'rgba(255,255,255,0.60)',
    tertiary: 'rgba(255,255,255,0.38)',
  },
};

export const HIGHLIGHT_COLORS = {
  yellow: '#FFD700',
  blue: '#4A90D9',
  green: '#07C160',
  red: '#E74C3C',
  purple: '#9B59B6',
} as const;

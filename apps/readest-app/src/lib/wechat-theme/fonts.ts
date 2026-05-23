import type { FontSizeLevel } from './types';

export const FONT_SIZE_SCALE: Record<FontSizeLevel, number> = {
  0: 14,
  1: 16,
  2: 18,
  3: 20,
  4: 22,
  5: 24,
  6: 28,
};

export const FONT_SIZE_LABELS: Record<FontSizeLevel, string> = {
  0: 'A-',
  1: 'A',
  2: 'A+',
  3: 'A++',
  4: 'A+++',
  5: 'A++++',
  6: 'A+++++',
};

export const READER_FONT_STACK_SANS =
  '"PingFang SC", "Noto Sans CJK SC", "LXGW WenKai", "Source Han Sans SC", "Hiragino Sans GB", "Microsoft YaHei", "WenQuanYi Micro Hei", system-ui, -apple-system, sans-serif';

export const READER_FONT_STACK_SERIF =
  '"Noto Serif CJK SC", "Source Han Serif SC", "LXGW WenKai", "STSong", "SimSun", "Songti SC", Georgia, serif';

export const UI_FONT_STACK =
  '"PingFang SC", "Noto Sans CJK SC", "Hiragino Sans GB", "Microsoft YaHei", system-ui, -apple-system, sans-serif';

export const MONO_FONT_STACK =
  '"SF Mono", "Cascadia Code", "Consolas", "PingFang SC", monospace';

export const DEFAULT_READER_SETTINGS = {
  fontSizeLevel: 2 as FontSizeLevel,
  lineHeight: 1.8,
  letterSpacing: 0.07,
  marginHorizontal: 0,
} as const;

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { ReadingBackground, FontSizeLevel, FontFamilyMode, PageTurnStyle, WeChatReaderSettings } from '@/lib/wechat-theme/types';
import { BACKGROUND_COLORS, TEXT_COLORS } from '@/lib/wechat-theme/backgrounds';
import { FONT_SIZE_SCALE } from '@/lib/wechat-theme/fonts';

interface WeChatThemeState {
  settings: WeChatReaderSettings;
  setBackground: (bg: ReadingBackground) => void;
  setFontSize: (level: FontSizeLevel) => void;
  setFontFamily: (family: FontFamilyMode) => void;
  setLineHeight: (height: number) => void;
  setLetterSpacing: (spacing: number) => void;
  setMarginHorizontal: (margin: number) => void;
  setPageTurnStyle: (style: PageTurnStyle) => void;
  toggleEInk: () => void;
  getReaderCSSVars: () => Record<string, string>;
  getFontSizePx: () => number;
}

const DEFAULT_SETTINGS: WeChatReaderSettings = {
  background: 'white',
  fontSizeLevel: 2,
  fontFamily: 'sans',
  lineHeight: 1.8,
  letterSpacing: 0.07,
  marginHorizontal: 0,
  pageTurnStyle: 'slide',
  isEInk: false,
};

export const useWeChatThemeStore = create<WeChatThemeState>()(
  persist(
    (set, get) => ({
      settings: { ...DEFAULT_SETTINGS },

      setBackground: (background) =>
        set((s) => ({ settings: { ...s.settings, background } })),

      setFontSize: (fontSizeLevel) =>
        set((s) => ({ settings: { ...s.settings, fontSizeLevel } })),

      setFontFamily: (fontFamily) =>
        set((s) => ({ settings: { ...s.settings, fontFamily } })),

      setLineHeight: (lineHeight) =>
        set((s) => ({ settings: { ...s.settings, lineHeight } })),

      setLetterSpacing: (letterSpacing) =>
        set((s) => ({ settings: { ...s.settings, letterSpacing } })),

      setMarginHorizontal: (marginHorizontal) =>
        set((s) => ({ settings: { ...s.settings, marginHorizontal } })),

      setPageTurnStyle: (pageTurnStyle) =>
        set((s) => ({ settings: { ...s.settings, pageTurnStyle } })),

      toggleEInk: () =>
        set((s) => ({ settings: { ...s.settings, isEInk: !s.settings.isEInk } })),

      getReaderCSSVars: () => {
        const { background, isEInk } = get().settings;
        const bg = isEInk ? '#FFFFFF' : BACKGROUND_COLORS[background].bg;
        const text = isEInk
          ? '#000000'
          : TEXT_COLORS[background].primary;
        const textSecondary = isEInk
          ? '#000000'
          : TEXT_COLORS[background].secondary;
        return {
          '--wr-current-bg': bg,
          '--wr-current-text': text,
          '--wr-current-text-secondary': textSecondary,
        };
      },

      getFontSizePx: () => {
        return FONT_SIZE_SCALE[get().settings.fontSizeLevel];
      },
    }),
    {
      name: 'wechat-reader-settings',
      partialize: (state) => ({ settings: state.settings }),
    },
  ),
);
